/**
 * CalendarView — monthly P&L heatmap calendar.
 *
 * Each day cell is colour-coded:
 *  🟢 Green glow  → profitable session
 *  🔴 Pink glow   → losing session
 *  ⬜ Neutral      → no trades
 *  📅 Today border — cyan outline
 *
 * Clicking a day shows a detail popover with stats for that session.
 */
import { useState, useMemo } from 'react';
import { fmt$, fmtPct } from '../utils/formatters';

const DAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

export default function CalendarView({ dailyStats = [] }) {
  const today     = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [detail, setDetail] = useState(null);

  // Build a lookup: 'YYYY-MM-DD' → stats row
  const statsByDate = useMemo(() => {
    const map = {};
    dailyStats.forEach(s => { map[s.date] = s; });
    return map;
  }, [dailyStats]);

  // Calendar grid helpers
  const firstDay   = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells      = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );

  const dateKey = (d) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Monthly summary
  const monthStats = useMemo(() => {
    const rows = dailyStats.filter(s => s.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`));
    return {
      totalPnL:    rows.reduce((s, r) => s + (r.total_pnl  || 0), 0),
      totalTrades: rows.reduce((s, r) => s + (r.total_trades || 0), 0),
      tradingDays: rows.length,
      winDays:     rows.filter(r => r.total_pnl > 0).length,
    };
  }, [dailyStats, year, month]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  return (
    <div className="space-y-4">
      {/* Monthly summary strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Monthly P&L',    value: fmt$(monthStats.totalPnL),   color: monthStats.totalPnL >= 0 ? 'green' : 'pink' },
          { label: 'Trades',         value: monthStats.totalTrades,       color: 'cyan'   },
          { label: 'Trading Days',   value: monthStats.tradingDays,       color: 'cyan'   },
          { label: 'Win Days',       value: `${monthStats.winDays} / ${monthStats.tradingDays}`, color: 'green' },
        ].map(c => (
          <div key={c.label} className={`neon-card border ${
            c.color === 'green' ? 'border-neon-green/30' :
            c.color === 'pink'  ? 'border-neon-pink/30'  : 'border-neon-cyan/30'
          }`}>
            <p className="text-xs text-gray-400">{c.label}</p>
            <p className={`text-xl font-bold ${
              c.color === 'green' ? 'text-neon-green text-glow-green' :
              c.color === 'pink'  ? 'text-neon-pink  text-glow-pink'  : 'text-neon-cyan text-glow-cyan'
            }`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Calendar card */}
      <div className="neon-card relative scan-lines">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <button onClick={prevMonth} className="text-neon-cyan hover:text-white transition-colors px-3 py-1 rounded-lg hover:bg-dark-600">
            ← Prev
          </button>
          <h3 className="text-neon-cyan font-bold text-glow-cyan">
            {MONTHS[month]} {year}
          </h3>
          <button onClick={nextMonth} className="text-neon-cyan hover:text-white transition-colors px-3 py-1 rounded-lg hover:bg-dark-600">
            Next →
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs text-gray-500 py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />;

            const key   = dateKey(day);
            const stat  = statsByDate[key];
            const isToday = key === todayKey;

            let cellClass = 'bg-dark-700 border-dark-500 text-gray-500';
            let pnlText   = null;

            if (stat) {
              const pnl = stat.total_pnl || 0;
              if (pnl > 0) {
                cellClass = 'bg-neon-green/10 border-neon-green/40 text-neon-green shadow-neon-green cursor-pointer';
                pnlText   = `+$${Math.abs(pnl).toFixed(0)}`;
              } else if (pnl < 0) {
                cellClass = 'bg-neon-pink/10 border-neon-pink/40 text-neon-pink shadow-neon-pink cursor-pointer';
                pnlText   = `-$${Math.abs(pnl).toFixed(0)}`;
              }
            }

            return (
              <div
                key={key}
                onClick={() => stat && setDetail({ day, key, stat })}
                className={`
                  relative border rounded-lg p-2 min-h-[60px] text-xs transition-all
                  ${cellClass}
                  ${isToday ? 'ring-2 ring-neon-cyan ring-offset-1 ring-offset-dark-900' : ''}
                  ${stat ? 'hover:scale-105 hover:z-10' : ''}
                `}
              >
                <span className="font-bold">{day}</span>
                {pnlText && <p className="font-bold mt-1 text-[10px] leading-tight">{pnlText}</p>}
                {stat && (
                  <p className="text-[9px] text-gray-400 mt-0.5">{stat.total_trades}T</p>
                )}
                {isToday && (
                  <span className="absolute top-1 right-1 live-dot" style={{ width: 5, height: 5 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail popover */}
      {detail && (
        <DayDetail
          day={detail.day}
          dateKey={detail.key}
          stat={detail.stat}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

function DayDetail({ day, dateKey, stat, onClose }) {
  const pnl    = stat.total_pnl || 0;
  const isWin  = pnl >= 0;
  const winRate = stat.total_trades > 0
    ? ((stat.winning_trades / stat.total_trades) * 100).toFixed(0)
    : 0;

  return (
    <div className={`neon-card border animate-fadeIn ${isWin ? 'border-neon-green/40' : 'border-neon-pink/40'}`}>
      <div className="flex justify-between items-start">
        <h4 className="text-neon-cyan font-bold text-glow-cyan">{dateKey}</h4>
        <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
        {[
          { label: 'Total P&L',      value: fmt$(pnl),          color: isWin ? 'green' : 'pink' },
          { label: 'Trades',         value: stat.total_trades,  color: 'cyan'  },
          { label: 'Win Rate',       value: `${winRate}%`,      color: isWin ? 'green' : 'pink' },
          { label: 'Best Trade',     value: fmt$(stat.best_trade), color: 'green' },
        ].map(c => (
          <div key={c.label} className="text-center">
            <p className="text-xs text-gray-400">{c.label}</p>
            <p className={`font-bold ${
              c.color === 'green' ? 'text-neon-green' :
              c.color === 'pink'  ? 'text-neon-pink'  : 'text-neon-cyan'
            }`}>{c.value}</p>
          </div>
        ))}
      </div>
      {stat.profit_target_hit ? (
        <p className="text-neon-green text-xs mt-2 text-center">🎯 Profit target hit this session</p>
      ) : stat.daily_loss_hit ? (
        <p className="text-neon-pink text-xs mt-2 text-center">⛔ Daily loss limit hit this session</p>
      ) : null}
    </div>
  );
}
