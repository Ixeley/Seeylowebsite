/**
 * TradingDashboard — main shell component.
 *
 * Layout:
 *  Header         — logo, mode badge (PAPER / LIVE), WS status, ⚡ Go Live button
 *  Stat cards     — balance, daily P&L, open positions, high-water mark
 *  Risk meters    — profit target, daily loss, trailing drawdown
 *  Kill banner    — shown when any risk limit is hit
 *  Tabs           — Overview | Calendar | Trade Log | Risk Settings | ML Stats
 *    Overview:
 *      TradingView chart (real prices, full width)
 *      PnL equity curve | Auto-trading panel | News panel
 *  Status feed    — scrollable system event log
 *
 * Go Live modal: slides in from the right when user clicks ⚡ Go Live.
 * It accepts Tradovate credentials and optionally a Finnhub key for real
 * paper-trading prices.
 */
import { useState, useEffect } from 'react';
import TradingViewWidget from './TradingViewWidget';
import PnLChart          from './PnLChart';
import CalendarView      from './CalendarView';
import AutoTrading       from './AutoTrading';
import NewsPanel         from './NewsPanel';
import RiskSettings      from './RiskSettings';
import GoLiveModal       from './GoLiveModal';
import { fmt$, fmtPrice, fmtPct, pnlColor, clamp } from '../utils/formatters';

const TABS = ['Overview', 'Calendar', 'Trade Log', 'Risk Settings', 'ML Stats'];

export default function TradingDashboard({
  wsConnected, ready, mode, accountInfo,
  connecting, connectError, onConnect,
  priceData, riskState, autoTrading, fills, pnlHistory, statusMessages,
  settings, onSettingsChange,
  onAutoToggle,
}) {
  const [activeTab,   setActiveTab]   = useState('Overview');
  const [showGoLive,  setShowGoLive]  = useState(false);
  const [mlStats,     setMlStats]     = useState(null);
  const [dailyStats,  setDailyStats]  = useState([]);
  const [trades,      setTrades]      = useState([]);

  const isPaper = mode === 'paper';
  const rs      = riskState;

  // Refresh supplementary data when tab changes
  useEffect(() => {
    if (!ready) return;
    if (activeTab === 'ML Stats')   fetch('/api/ml-stats').then(r => r.json()).then(setMlStats).catch(() => {});
    if (activeTab === 'Calendar')   fetch('/api/daily-stats').then(r => r.json()).then(setDailyStats).catch(() => {});
    if (activeTab === 'Trade Log')  fetch('/api/trades').then(r => r.json()).then(setTrades).catch(() => {});
  }, [activeTab, ready]);

  // Refresh trade log when a new fill arrives
  useEffect(() => {
    if (activeTab === 'Trade Log' && ready && fills.length) {
      fetch('/api/trades').then(r => r.json()).then(setTrades).catch(() => {});
    }
  }, [fills]);

  return (
    <div className="min-h-screen bg-dark-900 text-white font-mono flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="border-b border-dark-500 bg-dark-800/80 backdrop-blur sticky top-0 z-50 px-6 py-3">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">

          {/* Logo + mode badge */}
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-neon-cyan text-glow-cyan tracking-widest">
              ⚡ PROPTRADER
            </span>

            {/* Mode badge — paper vs live */}
            {isPaper ? (
              <span className="flex items-center gap-1.5 text-xs bg-neon-orange/15 border border-neon-orange/40 text-neon-orange px-2.5 py-1 rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 102 0V3h4v1a1 1 0 102 0V3a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                </svg>
                PAPER TRADING
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs bg-neon-green/15 border border-neon-green/40 text-neon-green px-2.5 py-1 rounded-full animate-pulse-slow">
                <span className="live-dot" style={{ width: 6, height: 6 }} />
                LIVE — {accountInfo?.account?.name || 'TRADOVATE'}
              </span>
            )}
          </div>

          {/* Status cluster + Go Live */}
          <div className="flex items-center gap-4 text-sm">
            {/* WS connection dot */}
            <div className="flex items-center gap-2">
              <span className={wsConnected ? 'live-dot' : 'inline-block w-2 h-2 rounded-full bg-gray-600'} />
              <span className={wsConnected ? 'text-neon-green text-xs' : 'text-gray-500 text-xs'}>
                {wsConnected ? 'LIVE FEED' : 'RECONNECTING…'}
              </span>
            </div>

            {/* Live price ticker */}
            {priceData && (
              <div className="text-neon-cyan text-glow-cyan tabular-nums text-sm hidden md:block">
                {priceData.symbol}
                <span className="font-bold ml-2">{fmtPrice(priceData.price)}</span>
                {priceData.paper && !priceData.real && (
                  <span className="text-neon-orange text-xs ml-2">SIM</span>
                )}
              </div>
            )}

            {/* Go Live button — only shown in paper mode */}
            {isPaper && (
              <button
                onClick={() => setShowGoLive(true)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-neon-green/15 border border-neon-green/50
                           text-neon-green hover:bg-neon-green/25 hover:shadow-neon-green transition-all"
              >
                ⚡ Go Live
              </button>
            )}

            {/* Go Paper button — shown when live */}
            {!isPaper && (
              <button
                onClick={() => onConnect({ paper: true })}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-neon-orange/15 border border-neon-orange/50
                           text-neon-orange hover:bg-neon-orange/25 transition-all"
              >
                📄 Back to Paper
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Go Live modal ────────────────────────────────────────────────────── */}
      {showGoLive && (
        <GoLiveModal
          connecting={connecting}
          onConnect={(payload) => { onConnect(payload); setShowGoLive(false); }}
          onClose={() => setShowGoLive(false)}
        />
      )}

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-4 space-y-4">

        {/* ── Loading state ───────────────────────────────────────────────── */}
        {!ready && (
          <div className="flex items-center justify-center h-40 gap-3 text-neon-cyan text-glow-cyan">
            <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Initialising paper trading session…
          </div>
        )}

        {ready && (
          <>
            {/* ── Stat cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Account Balance"  value={fmt$(rs?.accountBalance, 0)} sub={`Start: ${fmt$(rs?.startingBalance, 0)}`} color="cyan" />
              <StatCard label="Daily P&L"        value={fmt$(rs?.dailyPnL)}          sub={fmtPct(rs?.dailyPnLPercent)}               color={rs?.dailyPnL >= 0 ? 'green' : 'pink'} large />
              <StatCard label="Open Positions"   value={`${rs?.openPositions ?? 0} / ${rs?.maxPositions ?? 3}`} sub="contracts"      color="purple" />
              <StatCard label="High Water Mark"  value={fmt$(rs?.highWaterMark, 0)}  sub={`Trailing room: ${fmt$(rs?.trailingRoom, 0)}`} color="orange" />
            </div>

            {/* ── Risk meters ─────────────────────────────────────────────── */}
            <div className="neon-card grid grid-cols-1 md:grid-cols-3 gap-4">
              <RiskMeter label="Profit Target"    current={rs?.dailyPnL ?? 0}                                     limit={rs?.profitTarget ?? 1000}   progress={rs?.profitProgress ?? 0}   hit={rs?.profitTargetHit}     color="green"  format={fmt$} />
              <RiskMeter label="Daily Loss Limit" current={Math.abs(Math.min(0, rs?.dailyPnL ?? 0))}             limit={rs?.dailyLossLimit ?? 500}  progress={rs?.lossProgress ?? 0}     hit={rs?.dailyLimitHit}       color="pink"   format={fmt$} danger />
              <RiskMeter label="Trailing Drawdown" current={(rs?.highWaterMark ?? 0) - (rs?.accountBalance ?? 0)} limit={rs?.trailingMaxLoss ?? 2000} progress={rs?.trailingProgress ?? 0} hit={rs?.trailingDrawdownHit} color="orange" format={fmt$} danger />
            </div>

            {/* ── Risk kill-switch banner ──────────────────────────────────── */}
            {rs && !rs.canTrade && (
              <div className="border border-neon-red/60 bg-neon-red/10 rounded-xl p-4 text-center shadow-neon-red animate-pulse-slow">
                <span className="text-neon-red text-lg font-bold">
                  🛑 TRADING HALTED —{' '}
                  {rs.dailyLimitHit       ? 'Daily loss limit reached'   :
                   rs.profitTargetHit     ? 'Profit target achieved 🎯'  :
                   rs.trailingDrawdownHit ? 'Trailing drawdown breached'  : 'Risk limit triggered'}
                </span>
              </div>
            )}

            {/* ── Tabs ────────────────────────────────────────────────────── */}
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

            {/* ── Tab content ─────────────────────────────────────────────── */}
            {activeTab === 'Overview' && (
              <div className="space-y-4">
                {/* TradingView chart — always shows real ES futures price */}
                <TradingViewWidget symbol="CME_MINI:ES1!" interval="5" height={440} />

                {/* Bottom row: equity curve | auto-trading | news */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <PnLChart pnlHistory={pnlHistory} riskState={rs} />
                  </div>
                  <div className="space-y-4">
                    <AutoTrading
                      active={autoTrading}
                      canTrade={rs?.canTrade ?? false}
                      mode={mode}
                      onToggle={onAutoToggle}
                      priceData={priceData}
                      riskState={rs}
                    />
                    <NewsPanel ready={ready} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Calendar'      && <CalendarView dailyStats={dailyStats} />}
            {activeTab === 'Trade Log'     && <TradeLog trades={trades} fills={fills} />}
            {activeTab === 'Risk Settings' && (
              <RiskSettings
                settings={settings}
                onChange={onSettingsChange}
                onReconnect={(s) => onConnect({ settings: s, paper: isPaper })}
              />
            )}
            {activeTab === 'ML Stats'      && <MLStatsPanel stats={mlStats} />}

            {/* ── Status feed ─────────────────────────────────────────────── */}
            <StatusFeed messages={statusMessages} />
          </>
        )}
      </main>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, large }) {
  const c = {
    green:  'text-neon-green  border-neon-green/30',
    cyan:   'text-neon-cyan   border-neon-cyan/30',
    pink:   'text-neon-pink   border-neon-pink/30',
    purple: 'text-neon-purple border-neon-purple/30',
    orange: 'text-neon-orange border-neon-orange/30',
  }[color] || 'text-neon-cyan border-neon-cyan/30';

  return (
    <div className={`neon-card border ${c} space-y-1 relative scan-lines`}>
      <p className="text-xs text-gray-400 uppercase tracking-widest">{label}</p>
      <p className={`${large ? 'text-3xl' : 'text-2xl'} font-bold tabular-nums ${c.split(' ')[0]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function RiskMeter({ label, current, limit, progress, hit, color, danger, format }) {
  const pct = clamp(progress, 0, 100);
  const bar = { green: 'bg-neon-green shadow-neon-green', pink: 'bg-neon-pink shadow-neon-pink', orange: 'bg-neon-orange shadow-neon-orange' }[color];
  const txt = { green: 'text-neon-green', pink: 'text-neon-pink', orange: 'text-neon-orange' }[color];
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span className={txt}>{format(current)} / {format(limit)}</span>
      </div>
      <div className="progress-bar">
        <div className={`progress-fill ${bar} ${hit ? 'animate-pulse' : ''}`} style={{ width: `${pct}%` }} />
      </div>
      {hit && <p className={`text-xs font-bold ${txt} animate-pulse`}>{danger ? '⛔ LIMIT HIT' : '🎯 TARGET HIT'}</p>}
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
              <td className="py-1.5 pr-4 text-gray-500">{String(t.id).slice(-8)}</td>
              <td className="pr-4 text-neon-cyan">{t.symbol}</td>
              <td className={`pr-4 font-bold ${t.action === 'buy' ? 'text-neon-green' : 'text-neon-pink'}`}>{(t.action || '').toUpperCase()}</td>
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
        {stats.bestHours.map(h => <HourRow key={h.hour} stat={h} positive />)}
      </div>
      <div className="neon-card space-y-3">
        <h3 className="text-neon-pink text-sm font-bold text-glow-pink">Worst Hours (EWMA Win Rate)</h3>
        {stats.worstHours.length === 0 && <p className="text-gray-500 text-xs">Not enough data yet.</p>}
        {stats.worstHours.map(h => <HourRow key={h.hour} stat={h} positive={false} />)}
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
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-12 text-gray-400">{String(stat.hour).padStart(2, '0')}:00</span>
      <div className="flex-1 progress-bar">
        <div
          className={`progress-fill ${positive ? 'bg-neon-green shadow-neon-green' : 'bg-neon-pink shadow-neon-pink'}`}
          style={{ width: `${clamp(stat.ewmaWinRate * 100, 0, 100)}%` }}
        />
      </div>
      <span className={`${positive ? 'text-neon-green' : 'text-neon-pink'} w-12 text-right`}>{(stat.ewmaWinRate * 100).toFixed(1)}%</span>
      <span className="text-gray-500 w-8">{stat.trades}T</span>
    </div>
  );
}

function StatusFeed({ messages }) {
  const lc = { success: 'text-neon-green', warn: 'text-neon-orange', info: 'text-neon-cyan', error: 'text-neon-pink' };
  return (
    <div className="neon-card">
      <h3 className="text-gray-400 text-xs font-bold mb-2 uppercase tracking-widest">System Log</h3>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {messages.length === 0 && <p className="text-gray-600 text-xs">Waiting for events…</p>}
        {messages.map(m => (
          <div key={m.id} className={`text-xs flex gap-3 ${lc[m.level] || 'text-gray-400'} animate-fadeIn`}>
            <span className="text-gray-600 shrink-0">{fmtTime(m.ts)}</span>
            <span>{m.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Inline helpers (avoid import-cycle with TradingDashboard importing itself)
function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtPrice(n) {
  return n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
