/**
 * MLAdvisor — statistical learning layer that tracks historical trading
 * performance by hour and day-of-week to avoid repeatedly trading during
 * bad market conditions.
 *
 * Algorithm:
 *  - Maintain per-hour win-rate using both a simple ratio AND an EWMA
 *    (exponentially weighted moving average) so recent performance is
 *    weighted more heavily than stale history.
 *  - Block auto-trading for any hour where the EWMA win-rate falls below
 *    the configured threshold (default 35%).
 *  - Warn (but don't block) for historically weak days-of-week.
 *
 * This is intentionally simple — no external ML library needed.  The EWMA
 * gives it adaptive, self-correcting behaviour without overfitting.
 */
class MLAdvisor {
  constructor() {
    // Keyed by 0–23 (hour of day)
    this.hourlyStats = Array.from({ length: 24 }, (_, h) => ({
      hour:        h,
      trades:      0,
      wins:        0,
      totalPnL:    0,
      avgPnL:      0,
      winRate:     0.5, // cold-start neutral
      ewmaWinRate: 0.5, // exponentially weighted (responsive to recent data)
      ewmaPnL:     0,
    }));

    // Keyed by 0–6 (0 = Sunday)
    this.dayStats = Array.from({ length: 7 }, (_, d) => ({
      day:     d,
      label:   ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d],
      trades:  0,
      wins:    0,
      totalPnL: 0,
      winRate: 0.5,
    }));

    // Minimum trades before we trust the statistics enough to act on them
    this.minTradesForDecision = 5;

    // EWMA smoothing factor — higher = more weight on the most recent trade
    // 0.2 means roughly the last 5 trades matter most
    this.alpha = 0.2;

    // Thresholds
    this.winRateThreshold = 0.35;  // block if EWMA win-rate below 35%
    this.avgPnLThreshold  = -50;   // block if average P&L below −$50/trade

    this.sessionPnL    = 0;
    this.sessionTrades = 0;
  }

  // ─── Called on every closed trade fill ───────────────────────────────────────
  recordTrade(fill) {
    if (fill.pnl == null) return; // only closed positions carry P&L

    const ts  = new Date(fill.timestamp);
    const h   = ts.getHours();
    const d   = ts.getDay();
    const win = fill.pnl > 0;

    // ── Hourly stats ──────────────────────────────────────────────────────────
    const hs   = this.hourlyStats[h];
    hs.trades++;
    if (win) hs.wins++;
    hs.totalPnL    += fill.pnl;
    hs.avgPnL       = hs.totalPnL / hs.trades;
    hs.winRate      = hs.wins    / hs.trades;

    // EWMA update: α × new_value + (1−α) × previous_ewma
    // Binary win/loss encoded as 1/0 so the EWMA is a smoothed win-rate
    hs.ewmaWinRate = this.alpha * (win ? 1 : 0) + (1 - this.alpha) * hs.ewmaWinRate;
    hs.ewmaPnL     = this.alpha * fill.pnl       + (1 - this.alpha) * hs.ewmaPnL;

    // ── Day-of-week stats ─────────────────────────────────────────────────────
    const ds = this.dayStats[d];
    ds.trades++;
    if (win) ds.wins++;
    ds.totalPnL += fill.pnl;
    ds.winRate   = ds.wins / ds.trades;

    // ── Session tracking ──────────────────────────────────────────────────────
    this.sessionTrades++;
    this.sessionPnL += fill.pnl;
  }

  // ─── Decision: should auto-trading proceed right now? ────────────────────────
  shouldTrade() {
    const now  = new Date();
    const hour = now.getHours();
    const day  = now.getDay();
    const hs   = this.hourlyStats[hour];
    const ds   = this.dayStats[day];

    // ── Not enough data yet — let the strategy decide ─────────────────────────
    if (hs.trades < this.minTradesForDecision) {
      return {
        trade:  true,
        reason: `Hour ${hour}: only ${hs.trades} historical trades — no restriction yet`,
      };
    }

    // ── EWMA win-rate block ───────────────────────────────────────────────────
    if (hs.ewmaWinRate < this.winRateThreshold) {
      return {
        trade:   false,
        reason:  `Hour ${hour} EWMA win-rate ${(hs.ewmaWinRate * 100).toFixed(1)}% < ${(this.winRateThreshold * 100)}% threshold`,
        details: hs,
      };
    }

    // ── Avg P&L block ─────────────────────────────────────────────────────────
    if (hs.avgPnL < this.avgPnLThreshold) {
      return {
        trade:   false,
        reason:  `Hour ${hour} avg P&L $${hs.avgPnL.toFixed(0)} < $${this.avgPnLThreshold} threshold`,
        details: hs,
      };
    }

    // ── Day-of-week warning (non-blocking) ────────────────────────────────────
    if (ds.trades >= this.minTradesForDecision && ds.winRate < this.winRateThreshold) {
      return {
        trade:   true,
        warning: true,
        reason:  `⚠️ ${ds.label} historically weak (${(ds.winRate * 100).toFixed(0)}% win rate) — proceed carefully`,
        details: ds,
      };
    }

    return { trade: true, reason: `Hour ${hour}: EWMA win-rate ${(hs.ewmaWinRate * 100).toFixed(1)}% — conditions OK` };
  }

  // ─── Stats snapshot for the /api/ml-stats endpoint ───────────────────────────
  getStats() {
    const qualified = (stats) => stats.filter(s => s.trades >= this.minTradesForDecision);

    return {
      hourlyStats: this.hourlyStats,
      dayStats:    this.dayStats,
      bestHours:   qualified(this.hourlyStats)
        .sort((a, b) => b.ewmaWinRate - a.ewmaWinRate).slice(0, 5),
      worstHours:  qualified(this.hourlyStats)
        .sort((a, b) => a.ewmaWinRate - b.ewmaWinRate).slice(0, 5),
      session: {
        trades: this.sessionTrades,
        pnl:    this.sessionPnL,
        winRate: this.sessionTrades
          ? this.hourlyStats.reduce((acc, h) => acc + h.wins, 0) /
            Math.max(1, this.hourlyStats.reduce((acc, h) => acc + h.trades, 0))
          : null,
      },
    };
  }
}

module.exports = MLAdvisor;
