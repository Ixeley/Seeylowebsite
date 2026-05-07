/**
 * PaperClient — default trading mode.
 *
 * Provides the exact same EventEmitter interface as TradovateClient so the
 * rest of the system (server, risk engine, strategy) never needs to know
 * which mode is active.
 *
 * Price feed (in order of preference):
 *  1. Finnhub WebSocket  — real market prices (free key from finnhub.io)
 *     Supports US stocks, forex, crypto on the free tier.
 *     For ES futures proxy set finnhubSymbol = "OANDA:SPX500_USD".
 *  2. Simulated walk     — realistic mean-reverting random walk if no key.
 *
 * Paper orders are tracked internally; NO real orders are ever sent.
 * The TradingView chart widget in the UI shows the real ES futures price
 * separately so the trader sees actual market context.
 */
const EventEmitter = require('events');
const WebSocket    = require('ws');

const FINNHUB_WS = 'wss://ws.finnhub.io';

class PaperClient extends EventEmitter {
  constructor(options = {}) {
    super();

    // isPaper = true distinguishes this from both live and the old "simulated" flag
    this.isPaper    = true;
    this.isSimulated = false; // we call it paper, not simulation

    this.symbol        = options.symbol        || 'ESM4';
    this.finnhubKey    = options.finnhubKey    || null;   // optional: free key from finnhub.io
    this.finnhubSymbol = options.finnhubSymbol || 'OANDA:SPX500_USD'; // ES proxy on free tier

    // Internal state
    this.priceHistory  = [];
    this.positions     = new Map();
    this.currentPrice  = 5_250; // realistic ES seed price

    // Simulation parameters (used when no Finnhub key)
    this._trend      = 0;
    this._vol        = 1.8;   // realistic ES tick-level noise (≈ 1-2 pts/sec)
    this._interval   = null;
    this._ws         = null;
    this._reconnectTimer = null;
  }

  // ─── Public API (mirrors TradovateClient) ─────────────────────────────────

  async connect() {
    if (this.finnhubKey) {
      console.log('[PaperClient] 📈 Paper mode — REAL prices via Finnhub WebSocket');
      this._connectFinnhub();
    } else {
      console.log('[PaperClient] 📄 Paper mode — SIMULATED prices (add finnhubKey for real data)');
      this._startSimulation();
    }
  }

  async placeOrder({ symbol, action, quantity, stopLoss, takeProfit }) {
    // Paper fill: one tick of simulated slippage, no real order sent
    const slippage  = 0.25;
    const fillPrice = action === 'buy'
      ? this.currentPrice + slippage
      : this.currentPrice - slippage;

    const fill = {
      id:         `PAPER-${Date.now()}`,
      symbol,
      action,
      quantity,
      price:      +fillPrice.toFixed(2),
      stopLoss:   stopLoss   ?? null,
      takeProfit: takeProfit ?? null,
      timestamp:  new Date().toISOString(),
      paper:      true,
      status:     'filled',
    };

    console.log(`[PaperClient] 📝 Paper order: ${action.toUpperCase()} ${quantity}x ${symbol} @ ${fillPrice.toFixed(2)}`);
    this.positions.set(fill.id, { ...fill, openPrice: fillPrice });
    this.emit('fill', fill);

    // Simulate position lifecycle (auto-close for demo sessions)
    this._scheduleClose(fill);
    return fill;
  }

  getPriceHistory() { return this.priceHistory; }
  getPositions()    { return Array.from(this.positions.values()); }

  disconnect() {
    clearInterval(this._interval);
    clearTimeout(this._reconnectTimer);
    if (this._ws) {
      this._ws.removeAllListeners();
      this._ws.close();
    }
  }

  // ─── Finnhub real-price feed ──────────────────────────────────────────────

  _connectFinnhub() {
    const url = `${FINNHUB_WS}?token=${this.finnhubKey}`;
    this._ws  = new WebSocket(url);

    this._ws.on('open', () => {
      // Subscribe to the ES proxy symbol
      this._ws.send(JSON.stringify({ type: 'subscribe', symbol: this.finnhubSymbol }));
      console.log(`[PaperClient] Subscribed to Finnhub: ${this.finnhubSymbol}`);
    });

    this._ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'trade' && msg.data?.length) {
          // Finnhub sends an array of trades; use the latest price
          const latest = msg.data[msg.data.length - 1];
          this.currentPrice = latest.p;
          this._pushPrice(latest.p);
        }
      } catch (_) {}
    });

    this._ws.on('error',  (e) => console.error('[PaperClient Finnhub]', e.message));
    this._ws.on('close',  () => {
      console.warn('[PaperClient] Finnhub WS closed — reconnecting in 5s');
      this._reconnectTimer = setTimeout(() => this._connectFinnhub(), 5_000);
    });
  }

  // ─── Simulated price feed ─────────────────────────────────────────────────

  _startSimulation() {
    this._interval = setInterval(() => {
      // Mean-reverting trend + noise (realistic ES tick behaviour)
      this._trend        = this._trend * 0.93 + (Math.random() - 0.5) * 0.5;
      const noise        = (Math.random() - 0.5) * this._vol;
      this.currentPrice += this._trend + noise;

      // Keep price in a realistic ES range
      this.currentPrice = Math.max(4_800, Math.min(5_800, this.currentPrice));

      this._pushPrice(this.currentPrice);
    }, 1_000);
  }

  _pushPrice(price) {
    const spread = 0.25;
    this.priceHistory.push(price);
    if (this.priceHistory.length > 200) this.priceHistory.shift();

    this.emit('price', {
      symbol:    this.symbol,
      price:     +price.toFixed(2),
      bid:       +(price - spread / 2).toFixed(2),
      ask:       +(price + spread / 2).toFixed(2),
      timestamp: new Date().toISOString(),
      paper:     true,
      real:      !!this.finnhubKey,
    });
  }

  // ─── Paper position lifecycle ─────────────────────────────────────────────

  _scheduleClose(fill) {
    // Auto-close after 20 s – 2 min so the calendar/P&L chart fills with data
    const delay = 20_000 + Math.random() * 100_000;

    setTimeout(() => {
      if (!this.positions.has(fill.id)) return;

      const closePrice = this.currentPrice;
      const diff       = fill.action === 'buy'
        ? closePrice - fill.price
        : fill.price  - closePrice;

      // ES futures: 1 index point = $50 per contract
      const pnl = diff * fill.quantity * 50;

      const closeFill = {
        id:               `PAPER-CLOSE-${Date.now()}`,
        symbol:           fill.symbol,
        action:           fill.action === 'buy' ? 'sell' : 'buy',
        quantity:         fill.quantity,
        price:            +closePrice.toFixed(2),
        pnl:              +pnl.toFixed(2),
        closedPositionId: fill.id,
        timestamp:        new Date().toISOString(),
        paper:            true,
      };

      this.positions.delete(fill.id);
      this.emit('fill', closeFill);
    }, delay);
  }
}

module.exports = PaperClient;
