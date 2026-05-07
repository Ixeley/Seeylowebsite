/**
 * SMA Cross Strategy
 *
 * Entry logic:
 *  BUY  when the fast SMA crosses ABOVE the slow SMA (golden cross)
 *  SELL when the fast SMA crosses BELOW the slow SMA (death cross)
 *
 * Stop-loss  = 2× ATR away from entry (dynamic, adapts to volatility)
 * Take-profit = 4× ATR away from entry  →  2:1 reward/risk ratio
 *
 * A minimum cooldown between signals prevents over-trading on choppy data.
 */
class Strategy {
  constructor(tradovateClient, riskEngine) {
    this.client  = tradovateClient;
    this.risk    = riskEngine;

    // Indicator periods
    this.fastPeriod = 9;
    this.slowPeriod = 21;
    this.atrPeriod  = 14;

    // Anti-churn: wait at least this many price ticks between signals
    this.minTicksBetweenSignals = 10;
    this.ticksSinceLastSignal   = 0;

    this.lastSignal = null;
  }

  // ─── Called on every price tick ──────────────────────────────────────────────
  getSignal(priceData) {
    this.ticksSinceLastSignal++;

    const prices = this.client.getPriceHistory();

    // Need enough bars to compute both SMAs and ATR
    if (prices.length < this.slowPeriod + this.atrPeriod + 1) return null;

    // Current and previous-tick indicator values
    const fastNow  = this._sma(prices, this.fastPeriod);
    const fastPrev = this._sma(prices.slice(0, -1), this.fastPeriod);
    const slowNow  = this._sma(prices, this.slowPeriod);
    const slowPrev = this._sma(prices.slice(0, -1), this.slowPeriod);
    const atr      = this._atr(prices) || 2; // fallback 2 points

    if (fastNow == null || slowNow == null) return null;

    // Cooldown gate — prevents rapid re-entries
    if (this.ticksSinceLastSignal < this.minTicksBetweenSignals) return null;

    // Check for open positions in the target direction
    const positions = this.client.getPositions();
    const hasLong   = positions.some(p => p.action === 'buy');
    const hasShort  = positions.some(p => p.action === 'sell');

    // ── Golden cross ─────────────────────────────────────────────────────────
    if (fastPrev <= slowPrev && fastNow > slowNow && !hasLong) {
      return this._makeSignal('buy', priceData.price, atr, fastNow, slowNow);
    }

    // ── Death cross ──────────────────────────────────────────────────────────
    if (fastPrev >= slowPrev && fastNow < slowNow && !hasShort) {
      return this._makeSignal('sell', priceData.price, atr, fastNow, slowNow);
    }

    return null;
  }

  _makeSignal(action, price, atr, fast, slow) {
    this.ticksSinceLastSignal = 0;

    const stopLoss   = action === 'buy'  ? price - atr * 2 : price + atr * 2;
    const takeProfit = action === 'buy'  ? price + atr * 4 : price - atr * 4;

    const signal = {
      action,
      price,
      stopLoss:   +stopLoss.toFixed(2),
      takeProfit: +takeProfit.toFixed(2),
      reason: `${action === 'buy' ? '🟢 Golden' : '🔴 Death'} cross — Fast(${fast.toFixed(2)}) ${action === 'buy' ? '>' : '<'} Slow(${slow.toFixed(2)}) | ATR ${atr.toFixed(2)}`,
    };

    this.lastSignal = signal;
    console.log(`[Strategy] Signal: ${signal.reason}`);
    return signal;
  }

  // ─── Indicators ──────────────────────────────────────────────────────────────

  _sma(prices, period) {
    if (prices.length < period) return null;
    const slice = prices.slice(-period);
    return slice.reduce((s, p) => s + p, 0) / period;
  }

  // ATR using sequential tick differences (no OHLC data in tick mode)
  _atr(prices) {
    if (prices.length < this.atrPeriod + 1) return null;
    const trs = [];
    for (let i = prices.length - this.atrPeriod; i < prices.length; i++) {
      trs.push(Math.abs(prices[i] - prices[i - 1]));
    }
    return trs.reduce((s, v) => s + v, 0) / trs.length;
  }

  getIndicators() {
    const prices = this.client.getPriceHistory();
    return {
      fastSMA:    this._sma(prices, this.fastPeriod),
      slowSMA:    this._sma(prices, this.slowPeriod),
      atr:        this._atr(prices),
      lastSignal: this.lastSignal,
    };
  }
}

module.exports = Strategy;
