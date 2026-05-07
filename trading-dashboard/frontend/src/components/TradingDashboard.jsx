/**
 * TradingDashboard — main shell component.
 *
 * Layout (top → bottom):
 *  Header bar — logo, live indicator, connection status
 *  Stat cards  — balance, daily P&L, open positions
 *  Risk meters — progress bars for profit target, daily loss, trailing drawdown
 *  Main grid   — PnL chart | Auto-trading panel | News panel
 *  Tabs row    — Calendar view | Trade log | Risk settings | ML stats
 *  Status feed — scrollable log of events / signals
 */
import { useState, useEffect } from 'react';
import PnLChart      from './PnLChart';
import CalendarView  from './CalendarView';
import AutoTrading   from './AutoTrading';
import NewsPanel     from './NewsPanel';
import RiskSettings  from './RiskSettings';
import { fmt$, fmtPrice, fmtPct, pnlColor, clamp } from '../utils/formatters';

const TABS = ['Overview', 'Calendar', 'Trade Log', 'Risk Settings', 'ML Stats'];

export default function TradingDashboard({
  wsConnected, apiConnected, connecting, connectError, simulated,
  onConnect,
  priceData, riskState, autoTrading, fills, pnlHistory, statusMessages,
  settings, onSettingsChange,
  onAutoToggle,
}) {
  const [activeTab,  setActiveTab]  = useState('Overview');
  const [mlStats,    setMlStats]    = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [trades,     setTrades]     = useState([]);

  // Fetch supplementary data when tab changes
  useEffect(() => {
    if (activeTab === 'ML Stats' && apiConnected) {
      fetch('/api/ml-stats').then(r => r.json()).then(setMlStats).catch(() => {});
    }
    if (activeTab === 'Calendar' && apiConnected) {
      fetch('/api/daily-stats').then(r => r.json()).then(setDailyStats).catch(() => {});
    }
    if (activeTab === 'Trade Log' && apiConnected) {
      fetch('/api/trades').then(r => r.json()).then(setTrades).catch(() => {});
    }
  }, [activeTab, apiConnected]);

  // Refresh trade log whenever a new fill arrives
  useEffect(() => {
    if (activeTab === 'Trade Log' && apiConnected && fills.length) {
      fetch('/api/trades').then(r => r.json()).then(setTrades).catch(() => {});
    }
  }, [fills]);

  const rs = riskState;

  return (
    <div className="min-h-screen bg-dark-900 text-white font-mono flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="border-b border-dark-500 bg-dark-800/80 backdrop-blur sticky top-0 z-50 px-6 py-3">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-neon-cyan text-glow-cyan tracking-widest">
              ⚡ PROPTRADER
            </span>
            {simulated && (
              <span className="text-xs bg-neon-orange/20 border border-neon-orange/40 text-neon-orange px-2 py-0.5 rounded">
                SIMULATION
              </span>
            )}
          </div>

          {/* Status cluster */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className={wsConnected  ? 'live-dot' : 'inline-block w-2 h-2 rounded-full bg-gray-600'} />
              <span className={wsConnected  ? 'text-neon-green' : 'text-gray-500'}>
                {wsConnected ? 'WS LIVE' : 'WS OFF'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={apiConnected ? 'live-dot' : 'inline-block w-2 h-2 rounded-full bg-gray-600'} />
              <span className={apiConnected ? 'text-neon-cyan' : 'text-gray-500'}>
                {apiConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>
            {priceData && (
              <div className="text-neon-cyan text-glow-cyan tabular-nums">
                {priceData.symbol} <span className="font-bold">{fmtPrice(priceData.price)}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Connect prompt ───────────────────────────────────────────────────── */}
      {!apiConnected && (
        <ConnectBanner
          connecting={connecting}
          error={connectError}
          settings={settings}
          onConnect={onConnect}
        />
      )}

      {/* ── Main content ────────────────────────────────────────────────────── */}
      {apiConnected && (
        <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-4 space-y-4">

          {/* ── Stat cards ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Account Balance"
              value={fmt$(rs?.accountBalance, 0)}
              sub={`Start: ${fmt$(rs?.startingBalance, 0)}`}
              color="cyan"
            />
            <StatCard
              label="Daily P&L"
              value={fmt$(rs?.dailyPnL)}
              sub={fmtPct(rs?.dailyPnLPercent)}
              color={rs?.dailyPnL >= 0 ? 'green' : 'pink'}
              large
            />
            <StatCard
              label="Open Positions"
              value={`${rs?.openPositions ?? 0} / ${rs?.maxPositions ?? 3}`}
              sub="contracts"
              color="purple"
            />
            <StatCard
              label="High Water Mark"
              value={fmt$(rs?.highWaterMark, 0)}
              sub={`Trailing room: ${fmt$(rs?.trailingRoom, 0)}`}
              color="orange"
            />
          </div>

          {/* ── Risk-limit meters ─────────────────────────────────────────── */}
          <div className="neon-card grid grid-cols-1 md:grid-cols-3 gap-4">
            <RiskMeter
              label="Profit Target"
              current={rs?.dailyPnL ?? 0}
              limit={rs?.profitTarget ?? 1000}
              progress={rs?.profitProgress ?? 0}
              hit={rs?.profitTargetHit}
              color="green"
              format={(v) => fmt$(v)}
            />
            <RiskMeter
              label="Daily Loss Limit"
              current={Math.abs(Math.min(0, rs?.dailyPnL ?? 0))}
              limit={rs?.dailyLossLimit ?? 500}
              progress={rs?.lossProgress ?? 0}
              hit={rs?.dailyLimitHit}
              color="pink"
              danger
              format={(v) => fmt$(v)}
            />
            <RiskMeter
              label="Trailing Drawdown"
              current={(rs?.highWaterMark ?? 0) - (rs?.accountBalance ?? 0)}
              limit={rs?.trailingMaxLoss ?? 2000}
              progress={rs?.trailingProgress ?? 0}
              hit={rs?.trailingDrawdownHit}
              color="orange"
              danger
              format={(v) => fmt$(v)}
            />
          </div>

          {/* ── Risk kill-switch banner ────────────────────────────────────── */}
          {rs && !rs.canTrade && (
            <div className="border border-neon-red/60 bg-neon-red/10 rounded-xl p-4 text-center shadow-neon-red animate-pulse-slow">
              <span className="text-neon-red text-lg font-bold">
                🛑 TRADING HALTED —{' '}
                {rs.dailyLimitHit       ? 'Daily loss limit reached'  :
                 rs.profitTargetHit     ? 'Profit target achieved 🎯' :
                 rs.trailingDrawdownHit ? 'Trailing drawdown breached' : 'Risk limit triggered'}
              </span>
            </div>
          )}

          {/* ── Tab navigation ────────────────────────────────────────────── */}
          <div className="flex gap-1 border-b border-dark-500">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm rounded-t-lg transition-all ${
                  activeTab === tab
                    ? 'bg-dark-700 text-neon-cyan border-b-2 border-neon-cyan text-glow-cyan'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── Tab content ───────────────────────────────────────────────── */}
          {activeTab === 'Overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <PnLChart pnlHistory={pnlHistory} riskState={rs} />
              </div>
              <div className="space-y-4">
                <AutoTrading
                  active={autoTrading}
                  canTrade={rs?.canTrade ?? false}
                  onToggle={onAutoToggle}
                  priceData={priceData}
                  riskState={rs}
                />
                <NewsPanel apiConnected={apiConnected} />
              </div>
            </div>
          )}

          {activeTab === 'Calendar'     && <CalendarView dailyStats={dailyStats} />}
          {activeTab === 'Trade Log'    && <TradeLog trades={trades} fills={fills} />}
          {activeTab === 'Risk Settings' && (
            <RiskSettings
              settings={settings}
              onChange={onSettingsChange}
              onReconnect={(s) => onConnect({}, s)}
            />
          )}
          {activeTab === 'ML Stats'     && <MLStatsPanel stats={mlStats} />}

          {/* ── Status feed ───────────────────────────────────────────────── */}
          <StatusFeed messages={statusMessages} />
        </main>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConnectBanner({ connecting, error, settings, onConnect }) {
  const [creds, setCreds] = useState({ username: '', password: '' });

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8 space-y-6">
      <div className="neon-card w-full max-w-md space-y-4 relative scan-lines">
        <h2 className="text-neon-cyan text-xl font-bold text-glow-cyan text-center">
          Connect to Tradovate
        </h2>
        <p className="text-gray-400 text-sm text-center">
          Leave credentials blank to run in simulation mode.
        </p>

        <input
          className="w-full bg-dark-700 border border-dark-400 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon-cyan"
          placeholder="Username (blank = simulation)"
          value={creds.username}
          onChange={e => setCreds(p => ({ ...p, username: e.target.value }))}
        />
        <input
          type="password"
          className="w-full bg-dark-700 border border-dark-400 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon-cyan"
          placeholder="Password"
          value={creds.password}
          onChange={e => setCreds(p => ({ ...p, password: e.target.value }))}
        />

        {error && (
          <div className="text-neon-pink text-sm text-center bg-neon-pink/10 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          onClick={() => onConnect(creds.username ? creds : {}, settings)}
          disabled={connecting}
          className="w-full py-3 rounded-lg font-bold text-dark-900 bg-neon-cyan hover:shadow-neon-cyan transition-all disabled:opacity-50"
        >
          {connecting ? '⏳ Connecting…' : '⚡ Connect'}
        </button>

        <p className="text-gray-500 text-xs text-center">
          Real Tradovate API keys needed for live trading.
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, large }) {
  const colors = {
    green:  'text-neon-green  text-glow-green  border-neon-green/30',
    cyan:   'text-neon-cyan   text-glow-cyan   border-neon-cyan/30',
    pink:   'text-neon-pink   text-glow-pink   border-neon-pink/30',
    purple: 'text-neon-purple                  border-neon-purple/30',
    orange: 'text-neon-orange text-glow-orange border-neon-orange/30',
  };
  return (
    <div className={`neon-card border ${colors[color] || colors.cyan} space-y-1 relative scan-lines`}>
      <p className="text-xs text-gray-400 uppercase tracking-widest">{label}</p>
      <p className={`${large ? 'text-3xl' : 'text-2xl'} font-bold tabular-nums ${colors[color]}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function RiskMeter({ label, current, limit, progress, hit, color, danger, format }) {
  const pct = clamp(progress, 0, 100);
  const barColors = {
    green:  'bg-neon-green  shadow-neon-green',
    pink:   'bg-neon-pink   shadow-neon-pink',
    orange: 'bg-neon-orange shadow-neon-orange',
  };
  const textColors = {
    green:  'text-neon-green',
    pink:   'text-neon-pink',
    orange: 'text-neon-orange',
  };
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span className={textColors[color]}>
          {format(current)} / {format(limit)}
        </span>
      </div>
      <div className="progress-bar">
        <div
          className={`progress-fill ${barColors[color]} ${hit ? 'animate-pulse' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {hit && (
        <p className={`text-xs font-bold ${textColors[color]} animate-pulse`}>
          {danger ? '⛔ LIMIT HIT' : '🎯 TARGET HIT'}
        </p>
      )}
    </div>
  );
}

function TradeLog({ trades, fills }) {
  const rows = trades.length ? trades : fills;
  return (
    <div className="neon-card overflow-auto max-h-96">
      <h3 className="text-neon-cyan text-sm font-bold mb-3 text-glow-cyan">Trade Log</h3>
      {rows.length === 0 && <p className="text-gray-500 text-sm">No trades yet.</p>}
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="text-gray-400 border-b border-dark-500">
            {['ID', 'Symbol', 'Side', 'Qty', 'Entry', 'Exit', 'P&L', 'Status', 'Time'].map(h => (
              <th key={h} className="text-left pb-2 pr-4 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-600">
          {rows.map(t => (
            <tr key={t.id} className="hover:bg-dark-700/50 transition-colors">
              <td className="py-1.5 pr-4 text-gray-500 font-mono text-xs">{String(t.id).slice(-8)}</td>
              <td className="pr-4 text-neon-cyan">{t.symbol || t.symbol}</td>
              <td className={`pr-4 font-bold ${(t.action || t.action) === 'buy' ? 'text-neon-green' : 'text-neon-pink'}`}>
                {(t.action || '').toUpperCase()}
              </td>
              <td className="pr-4">{t.quantity}</td>
              <td className="pr-4">{fmtPrice(t.entry_price ?? t.price)}</td>
              <td className="pr-4">{t.exit_price ? fmtPrice(t.exit_price) : '—'}</td>
              <td className={`pr-4 font-bold ${pnlColor(t.pnl)}`}>{t.pnl != null ? fmt$(t.pnl) : '—'}</td>
              <td className={`pr-4 text-xs ${t.status === 'open' ? 'text-neon-cyan' : 'text-gray-400'}`}>{t.status || 'filled'}</td>
              <td className="text-gray-500">{fmtTime(t.open_time || t.timestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MLStatsPanel({ stats }) {
  if (!stats) return <div className="text-gray-500 text-sm neon-card">Loading ML stats…</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="neon-card space-y-3">
        <h3 className="text-neon-cyan text-sm font-bold text-glow-cyan">Best Hours (EWMA Win Rate)</h3>
        {stats.bestHours.length === 0 && <p className="text-gray-500 text-xs">Not enough data yet.</p>}
        {stats.bestHours.map(h => (
          <HourRow key={h.hour} stat={h} positive />
        ))}
      </div>
      <div className="neon-card space-y-3">
        <h3 className="text-neon-pink text-sm font-bold text-glow-pink">Worst Hours (EWMA Win Rate)</h3>
        {stats.worstHours.length === 0 && <p className="text-gray-500 text-xs">Not enough data yet.</p>}
        {stats.worstHours.map(h => (
          <HourRow key={h.hour} stat={h} positive={false} />
        ))}
      </div>
      <div className="neon-card md:col-span-2">
        <h3 className="text-neon-cyan text-sm font-bold mb-3 text-glow-cyan">Day-of-Week Performance</h3>
        <div className="grid grid-cols-7 gap-2">
          {stats.dayStats.map(d => (
            <div key={d.day} className={`text-center rounded-lg p-2 text-xs border ${
              d.trades < 5 ? 'border-dark-500 text-gray-500' :
              d.winRate > 0.5 ? 'border-neon-green/40 text-neon-green' : 'border-neon-pink/40 text-neon-pink'
            }`}>
              <p className="font-bold">{d.label}</p>
              <p>{d.trades > 0 ? `${(d.winRate * 100).toFixed(0)}%` : '—'}</p>
              <p className="text-gray-500">{d.trades}T</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HourRow({ stat, positive }) {
  const pct = (stat.ewmaWinRate * 100).toFixed(1);
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-12 text-gray-400">{String(stat.hour).padStart(2, '0')}:00</span>
      <div className="flex-1 progress-bar">
        <div
          className={`progress-fill ${positive ? 'bg-neon-green shadow-neon-green' : 'bg-neon-pink shadow-neon-pink'}`}
          style={{ width: `${clamp(stat.ewmaWinRate * 100, 0, 100)}%` }}
        />
      </div>
      <span className={positive ? 'text-neon-green w-12 text-right' : 'text-neon-pink w-12 text-right'}>{pct}%</span>
      <span className="text-gray-500 w-8">{stat.trades}T</span>
    </div>
  );
}

function StatusFeed({ messages }) {
  const levelColor = {
    success: 'text-neon-green',
    warn:    'text-neon-orange',
    info:    'text-neon-cyan',
    error:   'text-neon-pink',
  };
  return (
    <div className="neon-card">
      <h3 className="text-gray-400 text-xs font-bold mb-2 uppercase tracking-widest">System Log</h3>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {messages.length === 0 && <p className="text-gray-600 text-xs">Waiting for events…</p>}
        {messages.map(m => (
          <div key={m.id} className={`text-xs flex gap-3 ${levelColor[m.level] || 'text-gray-400'} animate-fadeIn`}>
            <span className="text-gray-600 shrink-0">{fmtTime(m.ts)}</span>
            <span>{m.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// re-export so formatters are available in sub-components without extra imports
function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtPrice(n) {
  return n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pnlColor(n) {
  if (n > 0) return 'text-neon-green text-glow-green';
  if (n < 0) return 'text-neon-pink  text-glow-pink';
  return 'text-gray-400';
}
