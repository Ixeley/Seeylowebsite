/**
 * TradovateClient — real Tradovate API integration.
 *
 * Key API facts (these are the bugs that existed before):
 *
 *  1. mdAccessToken  — the auth response returns TWO tokens:
 *     - accessToken   → trading WebSocket (live.tradovateapi.com)
 *     - mdAccessToken → market-data WebSocket (md.tradovateapi.com)
 *     Using accessToken for both causes silent auth failures on the MD socket.
 *
 *  2. CID must be an integer, not a string.
 *     Tradovate rejects auth if cid is "12345" instead of 12345.
 *
 *  3. Heartbeat / keepalive:
 *     SockJS 'h' frames are one-way heartbeats — no response needed.
 *     BUT the Tradovate application layer requires a `server/ping` call
 *     every ~2.5 minutes or the server closes the socket.
 *
 *  4. Fill events come as `{ e:'props', d:{ entityType:'executionReport', entity:{…} } }`
 *     not as `{ e:'fill', … }`.  The old code never caught real fills.
 *
 *  5. Cash-balance updates (realised P&L) come via entityType:'cashBalance'.
 *
 * Public method added: static authenticate(credentials) — used by the
 * /api/test-connection endpoint to validate creds without starting a session.
 */
const EventEmitter = require('events');
const WebSocket    = require('ws');
const fetch        = require('node-fetch');

const TV_AUTH_LIVE  = 'https://live.tradovateapi.com/v1/auth/accesstokenrequest';
const TV_AUTH_DEMO  = 'https://demo.tradovateapi.com/v1/auth/accesstokenrequest';
const TV_RENEW_LIVE = 'https://live.tradovateapi.com/v1/auth/renewaccesstoken';
const TV_RENEW_DEMO = 'https://demo.tradovateapi.com/v1/auth/renewaccesstoken';
const TV_WS_LIVE    = 'wss://live.tradovateapi.com/v1/websocket';
const TV_WS_DEMO    = 'wss://demo.tradovateapi.com/v1/websocket';
const TV_MD_WS      = 'wss://md.tradovateapi.com/v1/websocket';

const PING_INTERVAL_MS  = 2.5 * 60 * 1000; // 2.5 min — keeps WS alive
const TOKEN_RENEW_MS    = 80 * 60 * 1000;   // renew token every 80 min (expires at 90)

// ─── Static helper — used by /api/test-connection ────────────────────────────
async function testAuthenticate(credentials) {
  const url  = credentials.demo ? TV_AUTH_DEMO : TV_AUTH_LIVE;
  const resp = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name:       credentials.username,
      password:   credentials.password,
      appId:      credentials.appId      || 'PropTraderDashboard',
      appVersion: credentials.appVersion || '1.0',
      cid:        parseInt(credentials.cid, 10),  // MUST be integer
      sec:        credentials.sec,
    }),
  });

  const data = await resp.json();
  if (data.errorText) throw new Error(data.errorText);
  if (!data.accessToken) throw new Error('No access token returned — check credentials');

  return {
    accessToken:   data.accessToken,
    mdAccessToken: data.mdAccessToken,
    userId:        data.userId,
    accounts:      (data.accounts || []).map(a => ({
      id:          a.id,
      name:        a.name,
      active:      a.active,
      accountType: a.accountType,
      // cashBalance comes via WS; include if present in auth response
      balance:     a.balance ?? null,
    })),
  };
}

// ─── Client class ─────────────────────────────────────────────────────────────
class TradovateClient extends EventEmitter {
  constructor(credentials = {}) {
    super();

    this.credentials   = credentials;
    this.isSimulated   = !credentials.username;

    // Auth state
    this.accessToken   = null;
    this.mdAccessToken = null;  // separate token for market-data socket
    this.accounts      = [];
    this.selectedAccount = null; // { id, name }

    // Socket handles
    this.ws    = null;
    this.mdWs  = null;

    // Keepalive timers
    this._pingTimer  = null;
    this._renewTimer = null;

    // Price / position state
    this.priceHistory  = [];
    this.positions     = new Map();
    this.currentPrice  = 5_250;
    this.symbol        = credentials.symbol || 'ESM4';
    this.reqId         = 1;

    // Simulation-only
    this._simInterval = null;
    this._simTrend    = 0;
    this._simVol      = 1.5;
  }

  // ─── Public ──────────────────────────────────────────────────────────────────

  async connect() {
    if (this.isSimulated) {
      console.log('[TradovateClient] 🟡 SIMULATION mode');
      this._startSimulation();
      return;
    }
    await this._authenticate();
    this._connectTradingWS();
    this._connectMarketDataWS();
    this._scheduleTokenRenewal();
  }

  async placeOrder({ symbol, action, quantity, stopLoss, takeProfit }) {
    if (this.isSimulated) {
      return this._simulatePlaceOrder({ symbol, action, quantity, stopLoss, takeProfit });
    }

    if (!this.selectedAccount) throw new Error('No account selected');

    // Market order
    this._wsSend('order/placeorder', {
      accountSpec: this.selectedAccount.name,
      accountId:   this.selectedAccount.id,
      action:      action === 'buy' ? 'Buy' : 'Sell',
      symbol,
      orderQty:    quantity,
      orderType:   'Market',
      isAutomated: true,
    });

    // OCO bracket (stop-loss + take-profit)
    if (stopLoss || takeProfit) {
      this._wsSend('order/placeoso', {
        accountSpec: this.selectedAccount.name,
        accountId:   this.selectedAccount.id,
        action:      action === 'buy' ? 'Buy' : 'Sell',
        symbol,
        orderQty:    quantity,
        bracket1:    stopLoss   ? { orderType: 'Stop',  stopPrice: stopLoss   } : undefined,
        bracket2:    takeProfit ? { orderType: 'Limit', price:     takeProfit } : undefined,
      });
    }
  }

  getPriceHistory()  { return this.priceHistory; }
  getPositions()     { return Array.from(this.positions.values()); }
  getAccountInfo()   { return this.selectedAccount; }

  disconnect() {
    clearInterval(this._simInterval);
    clearInterval(this._pingTimer);
    clearTimeout(this._renewTimer);
    this.ws?.removeAllListeners();   this.ws?.close();
    this.mdWs?.removeAllListeners(); this.mdWs?.close();
  }

  // ─── Authentication ───────────────────────────────────────────────────────────

  async _authenticate() {
    const result = await testAuthenticate(this.credentials);

    this.accessToken   = result.accessToken;
    this.mdAccessToken = result.mdAccessToken; // ← FIX: separate MD token
    this.accounts      = result.accounts;

    // Honour an explicit accountId, otherwise use the first active account
    const preferred = this.credentials.accountId
      ? result.accounts.find(a => a.id === parseInt(this.credentials.accountId, 10))
      : null;
    this.selectedAccount = preferred || result.accounts.find(a => a.active) || result.accounts[0];

    console.log(`[TradovateClient] ✅ Authenticated — account: ${this.selectedAccount?.name}`);
    this.emit('accountInfo', { account: this.selectedAccount, accounts: this.accounts });
  }

  async _renewToken() {
    try {
      const url  = this.credentials.demo ? TV_RENEW_DEMO : TV_RENEW_LIVE;
      const resp = await fetch(url, {
        method:  'GET',
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      const data = await resp.json();
      if (data.accessToken) {
        this.accessToken   = data.accessToken;
        this.mdAccessToken = data.mdAccessToken || this.mdAccessToken;
        console.log('[TradovateClient] 🔄 Token renewed');
      }
    } catch (e) {
      console.error('[TradovateClient] Token renewal failed:', e.message);
    }
  }

  _scheduleTokenRenewal() {
    this._renewTimer = setInterval(() => this._renewToken(), TOKEN_RENEW_MS);
  }

  // ─── Trading WebSocket ────────────────────────────────────────────────────────

  _connectTradingWS() {
    const url = this.credentials.demo ? TV_WS_DEMO : TV_WS_LIVE;
    this.ws   = new WebSocket(url);

    this.ws.on('open', () => {
      this._wsSend('authorize', { token: this.accessToken });
      // Subscribe to live entity streams for this account
      this._wsSend('account/list', {});
      this._wsSend('order/list',   {});
      this._wsSend('position/list', {});
      this._wsSend('cashBalance/list', {});
      // Keepalive ping every 2.5 min
      this._pingTimer = setInterval(() => this._wsSend('server/ping', {}), PING_INTERVAL_MS);
    });

    this.ws.on('message', (raw) => this._handleTradingFrame(raw.toString()));
    this.ws.on('error',   (e)  => console.error('[TV WS]', e.message));
    this.ws.on('close',   ()   => {
      clearInterval(this._pingTimer);
      console.warn('[TradovateClient] Trading WS closed — reconnecting in 5s');
      setTimeout(() => this._connectTradingWS(), 5_000);
    });
  }

  _handleTradingFrame(raw) {
    // SockJS frame types: 'o'=open, 'h'=heartbeat (ignore, no response needed),
    // 'a[...]'=message array, 'c[...]'=close
    if (raw === 'o' || raw === 'h') return;

    try {
      const frames = JSON.parse(raw.startsWith('a') ? raw.slice(1) : raw);
      (Array.isArray(frames) ? frames : [frames]).forEach(f => {
        const msg = typeof f === 'string' ? JSON.parse(f) : f;
        this._processTradingMessage(msg);
      });
    } catch (_) {}
  }

  _processTradingMessage(msg) {
    if (msg.e !== 'props' || !msg.d) return;

    const { entityType, entity } = msg.d;

    switch (entityType) {
      // ── FIX: fills come as executionReport, not 'fill' ──────────────────────
      case 'executionReport': {
        const isBuy = entity.side === 'Buy';
        this.emit('fill', {
          id:        entity.id,
          orderId:   entity.orderId,
          symbol:    entity.contractId?.toString() || this.symbol,
          action:    isBuy ? 'buy' : 'sell',
          quantity:  entity.qty,
          price:     entity.price,
          pnl:       entity.realizedPL ?? null,
          timestamp: entity.timestamp || new Date().toISOString(),
        });
        break;
      }

      // ── Position update (openPL for unrealised P&L) ──────────────────────────
      case 'position': {
        this.positions.set(entity.contractId, entity);
        this.emit('positionUpdate', entity);
        break;
      }

      // ── Cash balance (realised P&L, buying power) ────────────────────────────
      case 'cashBalance': {
        if (this.selectedAccount && entity.accountId === this.selectedAccount.id) {
          this.emit('balanceUpdate', {
            cashBalance: entity.cashBalance,
            realizedPnL: entity.realizedPnL,
            openPnL:     entity.openPnL,
          });
        }
        break;
      }

      // ── Account info update ───────────────────────────────────────────────────
      case 'account': {
        const idx = this.accounts.findIndex(a => a.id === entity.id);
        if (idx !== -1) this.accounts[idx] = { ...this.accounts[idx], ...entity };
        break;
      }

      default:
        break;
    }
  }

  _wsSend(endpoint, data) {
    const id    = this.reqId++;
    const frame = `${id}\n${endpoint}\n\n${JSON.stringify(data)}`;
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(frame);
    return id;
  }

  // ─── Market-Data WebSocket ────────────────────────────────────────────────────

  _connectMarketDataWS() {
    this.mdWs = new WebSocket(TV_MD_WS);

    this.mdWs.on('open', () => {
      // FIX: use mdAccessToken, not accessToken
      this._mdSend('authorize', { token: this.mdAccessToken });
      this._mdSend('md/subscribeQuote', { symbol: this.symbol });
    });

    this.mdWs.on('message', (raw) => this._handleMDFrame(raw.toString()));
    this.mdWs.on('error',   (e)  => console.error('[TV MD WS]', e.message));
    this.mdWs.on('close',   ()   => {
      console.warn('[TradovateClient] MD WS closed — reconnecting in 5s');
      setTimeout(() => this._connectMarketDataWS(), 5_000);
    });
  }

  _handleMDFrame(raw) {
    if (raw === 'o' || raw === 'h') return;
    try {
      const frames = JSON.parse(raw.startsWith('a') ? raw.slice(1) : raw);
      (Array.isArray(frames) ? frames : [frames]).forEach(f => {
        const msg = typeof f === 'string' ? JSON.parse(f) : f;
        // MD subscription response contains quotes array
        if (msg.d?.quotes?.length) {
          const q   = msg.d.quotes[0];
          const mid = (q.bestAsk + q.bestBid) / 2;
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

  // ─── Price push ───────────────────────────────────────────────────────────────

  _pushPrice(price, bid, ask, simulated = false) {
    this.priceHistory.push(price);
    if (this.priceHistory.length > 200) this.priceHistory.shift();
    this.currentPrice = price;

    this.emit('price', {
      symbol: this.symbol, price, bid, ask,
      timestamp: new Date().toISOString(),
      simulated,
    });
  }

  // ─── Simulation ──────────────────────────────────────────────────────────────

  _startSimulation() {
    this._simInterval = setInterval(() => {
      this._simTrend     = this._simTrend * 0.92 + (Math.random() - 0.5) * 0.6;
      const noise        = (Math.random() - 0.5) * this._simVol;
      this.currentPrice += this._simTrend + noise;
      this.currentPrice  = Math.max(4_800, Math.min(5_800, this.currentPrice));

      const spread = 0.25;
      this._pushPrice(this.currentPrice, this.currentPrice - spread / 2, this.currentPrice + spread / 2, true);
    }, 1_000);
  }

  _simulatePlaceOrder({ symbol, action, quantity, stopLoss, takeProfit }) {
    const slippage  = 0.25;
    const fillPrice = action === 'buy' ? this.currentPrice + slippage : this.currentPrice - slippage;

    const fill = {
      id: `SIM-${Date.now()}`, symbol, action, quantity,
      price: +fillPrice.toFixed(2), stopLoss, takeProfit,
      timestamp: new Date().toISOString(), simulated: true, status: 'filled',
    };

    this.positions.set(fill.id, { ...fill, openPrice: fillPrice });
    this.emit('fill', fill);
    this._scheduleSimClose(fill);
    return fill;
  }

  _scheduleSimClose(fill) {
    const delay = 20_000 + Math.random() * 100_000;
    setTimeout(() => {
      if (!this.positions.has(fill.id)) return;
      const priceDiff = fill.action === 'buy'
        ? this.currentPrice - fill.price
        : fill.price        - this.currentPrice;
      const pnl = priceDiff * fill.quantity * 50;

      this.positions.delete(fill.id);
      this.emit('fill', {
        id: `SIM-CLOSE-${Date.now()}`, symbol: fill.symbol,
        action: fill.action === 'buy' ? 'sell' : 'buy',
        quantity: fill.quantity, price: +this.currentPrice.toFixed(2),
        pnl: +pnl.toFixed(2), closedPositionId: fill.id,
        timestamp: new Date().toISOString(), simulated: true,
      });
    }, delay);
  }
}

// Export both the class and the standalone auth helper
TradovateClient.testAuthenticate = testAuthenticate;
module.exports = TradovateClient;
