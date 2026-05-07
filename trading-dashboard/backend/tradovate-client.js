/**
 * TradovateClient
 *
 * Two modes:
 *  SIMULATION  — no credentials needed. Generates realistic tick-level price
 *                data using a mean-reverting random walk and simulates fills
 *                with slippage and position lifecycle.
 *  LIVE/DEMO   — authenticates against the real Tradovate REST + WebSocket APIs.
 *                Replace the isSimulated flag by passing real credentials.
 *
 * The public interface is identical in both modes so the rest of the system
 * never needs to know which one is active.
 */
const EventEmitter = require('events');
const WebSocket    = require('ws');
const fetch        = require('node-fetch');

// Official Tradovate endpoint URLs
const TV_AUTH_LIVE = 'https://live.tradovateapi.com/v1/auth/accesstokenrequest';
const TV_AUTH_DEMO = 'https://demo.tradovateapi.com/v1/auth/accesstokenrequest';
const TV_WS_LIVE   = 'wss://live.tradovateapi.com/v1/websocket';
const TV_WS_DEMO   = 'wss://demo.tradovateapi.com/v1/websocket';
const TV_MD_WS     = 'wss://md.tradovateapi.com/v1/websocket'; // market data

class TradovateClient extends EventEmitter {
  constructor(credentials = {}) {
    super();

    // If no username supplied we run the simulator — safe default for dev/demo
    this.isSimulated = !credentials.username;
    this.credentials = credentials;

    // Internal state
    this.accessToken       = null;
    this.ws                = null; // Trading WebSocket
    this.mdWs              = null; // Market-data WebSocket
    this.positions         = new Map(); // id → position object
    this.priceHistory      = []; // rolling array of close prices for SMA
    this.currentPrice      = 5200; // seed price (ES contract ballpark)
    this.symbol            = credentials.symbol || 'ESM4';
    this.reqId             = 1;

    // Simulation internals
    this._simInterval      = null;
    this._simTrend         = 0;   // trending component (mean-reverts)
    this._simVolatility    = 1.5; // tick-level noise
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  async connect() {
    if (this.isSimulated) {
      console.log('[TradovateClient] 🟡 SIMULATION mode — no real orders will be placed');
      this._startSimulation();
      return;
    }
    await this._authenticate();
    this._connectTradingWS();
    this._connectMarketDataWS();
  }

  /**
   * Place an order.  In simulation, fills are synthetic.
   * In live mode this sends the order to the Tradovate WebSocket.
   */
  async placeOrder({ symbol, action, quantity, orderType = 'Market', stopLoss, takeProfit }) {
    if (this.isSimulated) {
      return this._simulatePlaceOrder({ symbol, action, quantity, stopLoss, takeProfit });
    }

    // ── Real Tradovate order placement ──
    // Tradovate WebSocket frame format:  "<id>\n<endpoint>\n\n<json>"
    this._wsSend('order/placeorder', {
      accountSpec: this.credentials.accountSpec,
      accountId:   this.credentials.accountId,
      action:      action === 'buy' ? 'Buy' : 'Sell',
      symbol,
      orderQty:    quantity,
      orderType:   'Market',
      isAutomated: true,
    });

    // Attach bracket orders (OCO stop + limit) if provided
    if (stopLoss || takeProfit) {
      this._wsSend('order/placeoso', {
        accountSpec: this.credentials.accountSpec,
        accountId:   this.credentials.accountId,
        action:      action === 'buy' ? 'Buy' : 'Sell',
        symbol,
        orderQty:    quantity,
        bracket1:    stopLoss   ? { orderType: 'Stop',  stopPrice: stopLoss   } : undefined,
        bracket2:    takeProfit ? { orderType: 'Limit', price:     takeProfit } : undefined,
      });
    }
  }

  getPriceHistory() { return this.priceHistory; }
  getPositions()    { return Array.from(this.positions.values()); }

  disconnect() {
    clearInterval(this._simInterval);
    this.ws  && this.ws.close();
    this.mdWs && this.mdWs.close();
  }

  // ─── Live: Authentication ────────────────────────────────────────────────────

  async _authenticate() {
    const url = this.credentials.demo ? TV_AUTH_DEMO : TV_AUTH_LIVE;

    const resp = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name:       this.credentials.username,
        password:   this.credentials.password,
        appId:      this.credentials.appId      || 'MyTradingApp',
        appVersion: this.credentials.appVersion || '1.0',
        cid:        this.credentials.cid,
        sec:        this.credentials.sec,
      }),
    });

    const data = await resp.json();
    if (data.errorText) throw new Error(`Tradovate auth error: ${data.errorText}`);

    this.accessToken   = data.accessToken;
    this.credentials.accountId   = data.accounts?.[0]?.id;
    this.credentials.accountSpec = data.accounts?.[0]?.name;
    console.log('[TradovateClient] ✅ Authenticated — account:', this.credentials.accountSpec);
  }

  // ─── Live: Trading WebSocket ─────────────────────────────────────────────────

  _connectTradingWS() {
    const url = this.credentials.demo ? TV_WS_DEMO : TV_WS_LIVE;
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      // First message must be authorise, then subscribe to entity streams
      this._wsSend('authorize', { token: this.accessToken });
      this._wsSend('account/list', {});
      this._wsSend('order/list', {});
      this._wsSend('position/list', {});
    });

    this.ws.on('message', (raw) => this._handleTradingFrame(raw.toString()));

    this.ws.on('error', (e) => console.error('[TradovateClient WS]', e.message));
    this.ws.on('close', () => {
      console.warn('[TradovateClient] Trading WS closed — reconnecting in 5s');
      setTimeout(() => this._connectTradingWS(), 5000);
    });
  }

  _handleTradingFrame(raw) {
    if (raw === 'o' || raw === 'h') return; // SockJS open / heartbeat

    try {
      // Tradovate wraps frames in SockJS 'a[...]' arrays
      const frames = JSON.parse(raw.startsWith('a') ? raw.slice(1) : raw);
      (Array.isArray(frames) ? frames : [frames]).forEach(f => {
        const msg = typeof f === 'string' ? JSON.parse(f) : f;
        this._processTradingMessage(msg);
      });
    } catch (_) { /* non-JSON heartbeat or unknown frame — ignore */ }
  }

  _processTradingMessage(msg) {
    // Fill event — order executed
    if (msg.e === 'fill') {
      this.emit('fill', {
        id:        msg.d.orderId,
        symbol:    this.symbol,
        action:    msg.d.action === 'Buy' ? 'buy' : 'sell',
        quantity:  msg.d.qty,
        price:     msg.d.price,
        pnl:       msg.d.pnl ?? null,
        timestamp: new Date().toISOString(),
      });
    }

    // Position update
    if (msg.e === 'props' && msg.d?.entityType === 'position') {
      const pos = msg.d.entity;
      this.positions.set(pos.contractId, pos);
    }
  }

  _wsSend(endpoint, data) {
    const id    = this.reqId++;
    const frame = `${id}\n${endpoint}\n\n${JSON.stringify(data)}`;
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(frame);
    return id;
  }

  // ─── Live: Market-Data WebSocket ─────────────────────────────────────────────

  _connectMarketDataWS() {
    this.mdWs = new WebSocket(TV_MD_WS);

    this.mdWs.on('open', () => {
      this._mdSend('authorize', { token: this.accessToken });
      this._mdSend('md/subscribeQuote', { symbol: this.symbol });
    });

    this.mdWs.on('message', (raw) => this._handleMDFrame(raw.toString()));
    this.mdWs.on('error',   (e)  => console.error('[TradovateClient MD WS]', e.message));
    this.mdWs.on('close',   ()   => setTimeout(() => this._connectMarketDataWS(), 5000));
  }

  _handleMDFrame(raw) {
    if (raw === 'o' || raw === 'h') return;
    try {
      const frames = JSON.parse(raw.startsWith('a') ? raw.slice(1) : raw);
      (Array.isArray(frames) ? frames : [frames]).forEach(f => {
        const msg = typeof f === 'string' ? JSON.parse(f) : f;
        if (msg.d?.quotes?.length) {
          const q    = msg.d.quotes[0];
          const mid  = (q.bestAsk + q.bestBid) / 2;
          this._pushPrice(mid, q.bestBid, q.bestAsk);
        }
      });
    } catch (_) {}
  }

  _mdSend(endpoint, data) {
    const id    = this.reqId++;
    const frame = `${id}\n${endpoint}\n\n${JSON.stringify(data)}`;
    if (this.mdWs?.readyState === WebSocket.OPEN) this.mdWs.send(frame);
    return id;
  }

  // ─── Simulation ──────────────────────────────────────────────────────────────

  _startSimulation() {
    this._simInterval = setInterval(() => {
      // Mean-reverting trend component keeps the price realistic
      this._simTrend = this._simTrend * 0.92 + (Math.random() - 0.5) * 0.6;
      const noise    = (Math.random() - 0.5) * this._simVolatility;
      this.currentPrice += this._simTrend + noise;

      // Soft clamp to ES-like range (keeps charts readable in demos)
      this.currentPrice = Math.max(4800, Math.min(5600, this.currentPrice));

      const spread = 0.25; // one tick
      this._pushPrice(
        this.currentPrice,
        this.currentPrice - spread / 2,
        this.currentPrice + spread / 2,
        true,
      );
    }, 1000); // tick every second
  }

  _pushPrice(price, bid, ask, simulated = false) {
    const priceData = {
      symbol: this.symbol,
      price,
      bid,
      ask,
      timestamp: new Date().toISOString(),
      simulated,
    };

    // Keep rolling 200-bar history for SMA calculations
    this.priceHistory.push(price);
    if (this.priceHistory.length > 200) this.priceHistory.shift();

    this.emit('price', priceData);
  }

  _simulatePlaceOrder({ symbol, action, quantity, stopLoss, takeProfit }) {
    // Add one tick of slippage to simulate realistic market-order fills
    const slippage  = 0.25;
    const fillPrice = action === 'buy'
      ? this.currentPrice + slippage
      : this.currentPrice - slippage;

    const fill = {
      id:         `SIM-${Date.now()}`,
      symbol,
      action,
      quantity,
      price:      fillPrice,
      stopLoss,
      takeProfit,
      timestamp:  new Date().toISOString(),
      simulated:  true,
      status:     'filled',
    };

    this.positions.set(fill.id, { ...fill, openPrice: fillPrice });
    this.emit('fill', fill);

    // Auto-close the simulated position after a random interval so the calendar
    // and P&L chart fill up with real-looking data during a demo session.
    this._scheduleSimClose(fill);
    return fill;
  }

  _scheduleSimClose(fill) {
    // Close between 20 s and 2 min (sim time is compressed — makes demos lively)
    const delay = 20_000 + Math.random() * 100_000;

    setTimeout(() => {
      if (!this.positions.has(fill.id)) return;

      const closePrice = this.currentPrice;

      // ES futures: 1 index point = $50 per contract
      const priceDiff = fill.action === 'buy'
        ? closePrice - fill.price
        : fill.price - closePrice;
      const pnl = priceDiff * fill.quantity * 50;

      const closeFill = {
        id:               `SIM-CLOSE-${Date.now()}`,
        symbol:           fill.symbol,
        action:           fill.action === 'buy' ? 'sell' : 'buy',
        quantity:         fill.quantity,
        price:            closePrice,
        pnl,
        closedPositionId: fill.id,
        timestamp:        new Date().toISOString(),
        simulated:        true,
      };

      this.positions.delete(fill.id);
      this.emit('fill', closeFill);
    }, delay);
  }
}

module.exports = TradovateClient;
