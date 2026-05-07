/**
 * NewsPanel — economic calendar widget.
 *
 * Polls /api/news every 60 s and shows:
 *  • A pulsing red "BLOCKED" banner when we're inside a news window
 *  • Countdown to the next high-impact event
 *  • List of upcoming events for the next hour
 */
import { useState, useEffect } from 'react';

export default function NewsPanel({ ready, apiConnected }) {
  // accept both prop names so nothing breaks when called either way
  const active = ready ?? apiConnected ?? false;
  const [data,    setData]    = useState(null);
  const [tick,    setTick]    = useState(0); // force re-render for countdown

  const fetchNews = () => {
    if (!active) return;
    fetch('/api/news')
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  };

  useEffect(() => {
    fetchNews();
    const dataIv = setInterval(fetchNews, 60_000); // eslint-disable-line
    const tickIv = setInterval(() => setTick(t => t + 1), 1000); // countdown ticks
    return () => { clearInterval(dataIv); clearInterval(tickIv); };
  }, [active]);

  const countdown = (ts) => {
    const diff = Math.max(0, ts - Date.now());
    const m    = Math.floor(diff / 60_000);
    const s    = Math.floor((diff % 60_000) / 1000);
    return `${m}m ${String(s).padStart(2, '0')}s`;
  };

  const isBlocked = data?.isBlocked ?? false;
  const events    = data?.events ?? [];
  const next      = data?.nextEvent;

  return (
    <div className="neon-card space-y-3 relative scan-lines">
      <div className="flex justify-between items-center">
        <h3 className="text-neon-cyan text-sm font-bold text-glow-cyan">
          📰 Economic Calendar
        </h3>
        <span className="text-xs text-gray-500">High-impact USD</span>
      </div>

      {/* Blocked banner */}
      {isBlocked && (
        <div className="border border-neon-red/60 bg-neon-red/15 rounded-lg px-3 py-2 text-center animate-pulse">
          <p className="text-neon-red font-bold text-sm">🚫 NEWS BLACKOUT</p>
          <p className="text-neon-red/70 text-xs">Auto-trading suspended ±15 min around event</p>
        </div>
      )}

      {/* Countdown to next event */}
      {next && !isBlocked && (
        <div className="border border-neon-orange/40 bg-neon-orange/10 rounded-lg px-3 py-2 text-center">
          <p className="text-neon-orange text-xs font-bold">{next.title}</p>
          <p className="text-neon-orange/70 text-lg font-bold tabular-nums">
            {countdown(next.timestamp)}
          </p>
          <p className="text-gray-500 text-xs">until news release</p>
        </div>
      )}

      {/* Event list */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {!active && (
          <p className="text-gray-500 text-xs text-center">Waiting for session…</p>
        )}
        {apiConnected && events.length === 0 && (
          <p className="text-gray-500 text-xs text-center">No high-impact events in next hour</p>
        )}
        {events.map((ev, i) => {
          const diffMin = (ev.timestamp - Date.now()) / 60_000;
          const inWindow = Math.abs(diffMin) < 15;
          return (
            <div
              key={`${ev.title}-${i}`}
              className={`flex justify-between items-center text-xs px-2 py-1.5 rounded-lg border ${
                inWindow
                  ? 'border-neon-red/40    bg-neon-red/10    text-neon-red'
                  : diffMin < 30
                    ? 'border-neon-orange/40 bg-neon-orange/10 text-neon-orange'
                    : 'border-dark-500       bg-dark-700        text-gray-400'
              }`}
            >
              <span className="font-medium truncate mr-2">{ev.title}</span>
              <span className="shrink-0 tabular-nums">
                {diffMin > 0 ? `in ${countdown(ev.timestamp)}` : `${Math.abs(diffMin).toFixed(0)}m ago`}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-gray-600 text-xs">Source: ForexFactory JSON feed · refreshes hourly</p>
    </div>
  );
}
