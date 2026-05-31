/**
 * RiskEngine — the single source of truth for all prop-firm risk rules.
 *
 * Enforced limits (checked after EVERY fill):
 *  1. Daily loss limit    — absolute dollar cap on session losses
 *  2. Profit target stop  — system stops when the daily target is reached
 *  3. Trailing drawdown   — account can never drop more than X below its peak
 *  4. Consistency rule    — no single trade may represent more than N% of the target
 *  5. Max open positions  — hard cap on concurrent contracts
 *
 * calculatePositionSize() uses the 1%-per-trade risk model then further
 * constrains the result to satisfy rules 4 & 5.
 */
class RiskEngine {
  constructor(settings = {}) {
    // ── User-configurable parameters ─────────────────────────────────────────
    this.accountBalance   = settings.accountBalance   ?? 50_000;
    this.startingBalance  = this.accountBalance;
    this.profitTarget     = settings.profitTarget     ?? 1_000;  // daily $ goal
    this.dailyLossLimit   = settings.dailyLossLimit   ?? 500;    // max daily loss
    this.trailingMaxLoss  = settings.trailingMaxLoss  ?? 2_000;  // trailing drawdown cap
    this.consistencyRule  = settings.consistencyRule  ?? 0.30;   // max fraction of target from one trade
    this.maxPositions     = settings.maxPositions     ?? 3;      // max simultaneous contracts

    // ── Session state ─────────────────────────────────────────────────────────
    this.dailyPnL       = 0;
    this.openPositions  = []; // list of open fills
    this.highWaterMark  = this.accountBalance; // rising peak for trailing calc
    this.dailyPeakPnL   = 0;
    this.trades         = []; // all fills for today

    // ── Risk flags — once true, trading is blocked until daily reset ──────────
    this.dailyLimitHit       = false;
    this.profitTargetHit     = false;
    this.trailingDrawdownHit = false;

    this._scheduleDailyReset();
  }

  // ─── Called on every order fill ──────────────────────────────────────────────

  onTrade(fill) {
    if (fill.pnl != null) {
      // Closing fill — update P&L and balance
      this.dailyPnL      += fill.pnl;
      this.accountBalance += fill.pnl;
      this.trades.push(fill);

      // Raise high-water mark if account grew
      if (this.accountBalance > this.highWaterMark) {
        this.highWaterMark = this.accountBalance;
      }

      // Track today's best P&L for reporting
      if (this.dailyPnL > this.dailyPeakPnL) {
        this.dailyPeakPnL = this.dailyPnL;
      }

      // Remove from open positions list
      this.openPositions = this.openPositions.filter(p => p.id !== fill.closedPositionId);
    } else {
      // Opening fill
      this.openPositions.push(fill);
    }

    this._checkAllLimits();
  }

  // ─── Risk-limit checks ────────────────────────────────────────────────────────

  _checkAllLimits() {
    // 1. Daily loss limit
    // Prop firms measure this as: today's realised losses exceed the cap.
    if (this.dailyPnL <= -this.dailyLossLimit) {
      if (!this.dailyLimitHit) {
        this.dailyLimitHit = true;
        console.warn(`[RiskEngine] ❌ DAILY LOSS LIMIT: ${this.dailyPnL.toFixed(2)} — trading halted`);
      }
    }

    // 2. Profit target hit — lock in the day (common in FTMO / TopstepFX rules)
    if (this.dailyPnL >= this.profitTarget) {
      if (!this.profitTargetHit) {
        this.profitTargetHit = true;
        console.log(`[RiskEngine] 🎯 PROFIT TARGET HIT: +${this.dailyPnL.toFixed(2)} — trading halted`);
      }
    }

    // 3. Trailing drawdown — most important prop-firm rule.
    // The high-water mark rises with every new profit peak.
    // If the account drops more than trailingMaxLoss below that peak → blown.
    const drawdown = this.highWaterMark - this.accountBalance;
    if (drawdown >= this.trailingMaxLoss) {
      if (!this.trailingDrawdownHit) {
        this.trailingDrawdownHit = true;
        console.warn(
          `[RiskEngine] 💀 TRAILING DRAWDOWN: peak ${this.highWaterMark.toFixed(2)} ` +
          `→ current ${this.accountBalance.toFixed(2)} (−${drawdown.toFixed(2)}) — trading halted`
        );
      }
    }
  }

  // ─── Consistency rule ─────────────────────────────────────────────────────────
  // Returns false if the expected P&L for this trade would violate the rule.
  _checkConsistency(estimatedPnL) {
    if (this.profitTarget === 0) return true;
    const cap = this.profitTarget * this.consistencyRule;
    if (Math.abs(estimatedPnL) > cap) {
      console.log(
        `[RiskEngine] ⚠️ Consistency rule: ${estimatedPnL.toFixed(2)} > cap ${cap.toFixed(2)}`
      );
      return false;
    }
    return true;
  }

  // ─── Position sizing (1% risk model) ─────────────────────────────────────────
  /**
   * Returns the number of ES contracts to trade so that if the stop is hit
   * the loss equals exactly 1% of current account balance — then enforces
   * the consistency rule and the max-positions cap.
   *
   * @param {number} entryPrice  - current market price
   * @param {number} stopLoss    - stop-loss price level
   * @returns {number}           - contract count (0 = don't trade)
   */
  calculatePositionSize(entryPrice, stopLoss) {
    // Hard gate — never trade when any limit is blown
    if (!this.canTrade()) return 0;

    // Max positions cap
    if (this.openPositions.length >= this.maxPositions) {
      console.log('[RiskEngine] Max positions reached');
      return 0;
    }

    // Without a stop-loss, default to minimum lot
    if (!stopLoss || stopLoss === entryPrice) return 1;

    // 1% risk
    const riskBudget = this.accountBalance * 0.01;

    // ES futures tick value: 1 index point = $50 per contract
    const pointsAtRisk         = Math.abs(entryPrice - stopLoss);
    const dollarRiskPerContract = pointsAtRisk * 50;

    let contracts = Math.floor(riskBudget / dollarRiskPerContract);

    // Never exceed remaining slot capacity
    const remainingSlots = this.maxPositions - this.openPositions.length;
    contracts = Math.min(contracts, remainingSlots);

    // Consistency rule: estimate profit assuming 2:1 R/R
    const estimatedProfit = dollarRiskPerContract * contracts * 2;
    if (!this._checkConsistency(estimatedProfit)) {
      // Scale down so the estimated profit fits within the consistency cap
      const cap              = this.profitTarget * this.consistencyRule;
      const maxByConsistency = Math.floor(cap / (dollarRiskPerContract * 2));
      contracts = Math.max(1, Math.min(contracts, maxByConsistency));
    }

    // Final safety clamp
    contracts = Math.max(0, contracts);

    console.log(
      `[RiskEngine] Position size: ${contracts} contract(s) ` +
      `(risk/contract: $${dollarRiskPerContract.toFixed(2)}, budget: $${riskBudget.toFixed(2)})`
    );

    return contracts;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  canTrade() {
    return !this.dailyLimitHit && !this.profitTargetHit && !this.trailingDrawdownHit;
  }

  getRemainingRisk() {
    // How many more dollars can we lose today before the limit triggers
    return this.dailyLossLimit - Math.abs(Math.min(0, this.dailyPnL));
  }

  getRemainingToTarget() {
    return Math.max(0, this.profitTarget - this.dailyPnL);
  }

  getTrailingRoom() {
    // Distance from current account to the trailing-drawdown trigger
    const usedDrawdown = this.highWaterMark - this.accountBalance;
    return Math.max(0, this.trailingMaxLoss - usedDrawdown);
  }

  // ─── Snapshot for WebSocket broadcast / REST responses ───────────────────────
  getState() {
    return {
      // Balances
      accountBalance:     this.accountBalance,
      startingBalance:    this.startingBalance,
      highWaterMark:      this.highWaterMark,

      // Daily P&L
      dailyPnL:           this.dailyPnL,
      dailyPnLPercent:    (this.dailyPnL / this.startingBalance) * 100,

      // Settings (so UI can render progress bars without a separate request)
      profitTarget:       this.profitTarget,
      dailyLossLimit:     this.dailyLossLimit,
      trailingMaxLoss:    this.trailingMaxLoss,
      maxPositions:       this.maxPositions,

      // Risk flags
      dailyLimitHit:       this.dailyLimitHit,
      profitTargetHit:     this.profitTargetHit,
      trailingDrawdownHit: this.trailingDrawdownHit,
      canTrade:            this.canTrade(),

      // Progress (0–100 for progress bars)
      profitProgress: Math.min(100, (this.dailyPnL / this.profitTarget)          * 100),
      lossProgress:   Math.min(100, (Math.abs(Math.min(0, this.dailyPnL)) / this.dailyLossLimit) * 100),
      trailingProgress: Math.min(100, ((this.highWaterMark - this.accountBalance) / this.trailingMaxLoss) * 100),

      // Remaining room
      remainingRisk:      this.getRemainingRisk(),
      remainingToTarget:  this.getRemainingToTarget(),
      trailingRoom:       this.getTrailingRoom(),

      // Positions
      openPositions:      this.openPositions.length,
    };
  }

  // ─── Daily reset (called at 5 PM ET — CME Globex day boundary) ───────────────
  _scheduleDailyReset() {
    const now       = new Date();
    const reset     = new Date();
    reset.setHours(17, 0, 0, 0); // 5 PM local — adjust for your timezone
    if (now >= reset) reset.setDate(reset.getDate() + 1);

    const delay = reset - now;
    setTimeout(() => {
      this._resetDaily();
      this._scheduleDailyReset();
    }, delay);

    console.log(`[RiskEngine] Next daily reset at ${reset.toLocaleString()} (${Math.round(delay / 60000)} min)`);
  }

  _resetDaily() {
    console.log('[RiskEngine] 🔄 Daily reset');
    this.dailyPnL            = 0;
    this.dailyPeakPnL        = 0;
    this.dailyLimitHit       = false;
    this.profitTargetHit     = false;
    this.trailingDrawdownHit = false;
    this.trades              = [];
    // Note: highWaterMark is intentionally NOT reset — many prop firms keep
    // trailing drawdown cumulative across the whole evaluation period.
    // Change this to `this.highWaterMark = this.accountBalance;` if your
    // firm resets it daily.
  }
}

module.exports = RiskEngine;
