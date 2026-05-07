/**
 * AutoTrading — control panel for the SMA-cross auto-trader.
 *
 * Shows:
 *  • Start / Stop toggle button (disabled if risk limits are blown)
 *  • Current status explanation
 *  • Live price and strategy snapshot
 *  • Active risk blocks summary
 */
import { useState, useEffect } from 'react';
import { fmtPrice, fmt$ } from '../utils/formatters';

export default function AutoTrading({ active, canTrade, onToggle, priceData, riskState }) {
  const [indicators, setIndicators] = useState(null);

  // Periodically poll the backend for the latest strategy indicators
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => {
      fetch('/api/ml-stats').then(r => r.json()).then(() => {}).catch(() => {});
    }, 5000);
    return () => clearInterval(iv);
  }, [active]);

  const blocked = !canTrade;

  const statusInfo = () => {
    if (!riskState) return { label: 'Not connected', color: 'gray' };
    if (riskState.dailyLimitHit)       return { label: '⛔ Daily loss limit hit', color: 'pink' };
    if (riskState.profitTargetHit)     return { label: '🎯 Profit target reached', color: 'green' };
    if (riskState.trailingDrawdownHit) return { label: '💀 Trailing drawdown hit', color: 'pink' };
    if (active)                        return { label: '🤖 Auto-trading ACTIVE', color: 'green' };
    return { label: 'Manual — auto off', color: 'cyan' };
  };

  const si = statusInfo();
  const colorMap = {
    green: 'text-neon-green text-glow-green',
    pink:  'text-neon-pink  text-glow-pink',
    cyan:  'text-neon-cyan  text-glow-cyan',
    gray:  'text-gray-400',
  };

  return (
    <div className="neon-card space-y-4 relative scan-lines">
      <h3 className="text-neon-cyan text-sm font-bold text-glow-cyan">Auto-Trading Engine</h3>

      {/* Status */}
      <div className="text-center">
        <p className={`text-lg font-bold ${colorMap[si.color]}`}>{si.label}</p>
        <p className="text-xs text-gray-500 mt-1">Strategy: SMA(9) × SMA(21) + ATR stops</p>
      </div>

      {/* Start / Stop button */}
      <button
        disabled={blocked && !active}
        onClick={() => onToggle(!active)}
        className={`
          w-full py-4 rounded-xl font-bold text-lg tracking-widest transition-all duration-200
          ${active
            ? 'bg-neon-pink/20   border border-neon-pink/60   text-neon-pink   shadow-neon-pink   hover:bg-neon-pink/30'
            : blocked
              ? 'bg-dark-600 border border-dark-400 text-gray-500 cursor-not-allowed'
              : 'bg-neon-green/20 border border-neon-green/60 text-neon-green shadow-neon-green hover:bg-neon-green/30'
          }
        `}
      >
        {active ? '⏹ STOP AUTO' : blocked ? '🔒 RISK LOCKED' : '▶ START AUTO'}
      </button>

      {/* Risk status pills */}
      {riskState && (
        <div className="space-y-1.5">
          <RiskPill label="Daily Loss Room"     value={fmt$(riskState.remainingRisk)}      ok={riskState.remainingRisk > 100} />
          <RiskPill label="To Profit Target"    value={fmt$(riskState.remainingToTarget)}  ok={riskState.remainingToTarget > 0} neutral />
          <RiskPill label="Trailing Room"       value={fmt$(riskState.trailingRoom)}       ok={riskState.trailingRoom > 200} />
          <RiskPill label="Open Positions"      value={`${riskState.openPositions} / ${riskState.maxPositions}`} ok={riskState.openPositions < riskState.maxPositions} />
        </div>
      )}

      {/* Live price */}
      {priceData && (
        <div className="border-t border-dark-500 pt-3 text-xs tabular-nums">
          <div className="flex justify-between text-gray-400">
            <span>{priceData.symbol}</span>
            <span className="text-neon-cyan font-bold">{fmtPrice(priceData.price)}</span>
          </div>
          <div className="flex justify-between text-gray-600 mt-0.5">
            <span>Bid {fmtPrice(priceData.bid)}</span>
            <span>Ask {fmtPrice(priceData.ask)}</span>
          </div>
          {priceData.simulated && (
            <p className="text-neon-orange text-center mt-1">SIMULATED PRICES</p>
          )}
        </div>
      )}

      {/* Strategy info */}
      <div className="text-xs text-gray-500 space-y-1 border-t border-dark-500 pt-2">
        <p>• Entry: SMA golden/death cross</p>
        <p>• Stop: 2× ATR from entry</p>
        <p>• Target: 4× ATR (2:1 R/R)</p>
        <p>• Size: 1% account risk per trade</p>
        <p>• News window: ±15 min blocked</p>
        <p>• ML guard: EWMA win-rate ≥ 35%</p>
      </div>
    </div>
  );
}

function RiskPill({ label, value, ok, neutral }) {
  const color = neutral
    ? 'text-neon-cyan  border-neon-cyan/30  bg-neon-cyan/5'
    : ok
      ? 'text-neon-green border-neon-green/30 bg-neon-green/5'
      : 'text-neon-pink  border-neon-pink/30  bg-neon-pink/5';

  return (
    <div className={`flex justify-between items-center border rounded-lg px-2 py-1 text-xs ${color}`}>
      <span className="text-gray-400">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
