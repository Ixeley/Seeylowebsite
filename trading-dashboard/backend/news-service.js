/**
 * NewsService — fetches the economic calendar and blocks trading around
 * high-impact USD events (e.g. NFP, CPI, FOMC).
 *
 * Data source: https://nfs.faireconomy.media/ff_calendar_thisweek.json
 * (ForexFactory community JSON feed — unofficial but widely used; swap for
 *  TradingEconomics or Bloomberg API if you have a paid key.)
 *
 * Trading is blocked:
 *  - BLOCK_BEFORE_MINUTES (default 15) before a high-impact event
 *  - BLOCK_AFTER_MINUTES  (default 10) after the event
 */
const https = require('https');

const CALENDAR_URL     = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';
const BLOCK_BEFORE_MS  = 15 * 60 * 1000; // 15 min
const BLOCK_AFTER_MS   = 10 * 60 * 1000; // 10 min
const REFRESH_INTERVAL = 60 * 60 * 1000; // re-fetch every hour

class NewsService {
  constructor() {
    this.events    = [];
    this.lastFetch = 0;
    // Only watch currencies that affect US equity futures
    this.watchCurrencies = new Set(['USD']);
  }

  // ─── Fetch calendar ───────────────────────────────────────────────────────────
  fetchCalendar() {
    return new Promise((resolve) => {
      https.get(CALENDAR_URL, (res) => {
        let raw = '';
        res.on('data', (chunk) => raw += chunk);
        res.on('end', () => {
          try {
            const all = JSON.parse(raw);

            this.events = all
              .filter(e => this.watchCurrencies.has(e.currency) && e.impact === 'High')
              .map(e => {
                // The feed uses format "Jan 10, 2025 13:30:00" but timezone varies.
                // We parse as UTC — adjust if your server runs non-UTC.
                const ts = Date.parse(`${e.date} ${e.time} GMT`);
                return {
                  title:     e.title,
                  country:   e.country,
                  currency:  e.currency,
                  impact:    e.impact,
                  forecast:  e.forecast,
                  previous:  e.previous,
                  timestamp: isNaN(ts) ? null : ts,
                };
              })
              .filter(e => e.timestamp !== null)
              .sort((a, b) => a.timestamp - b.timestamp);

            this.lastFetch = Date.now();
            console.log(`[NewsService] Loaded ${this.events.length} high-impact USD events`);
          } catch (err) {
            console.error('[NewsService] Parse error:', err.message);
            // Don't wipe existing events on a parse failure
          }
          resolve(this.events);
        });
      }).on('error', (err) => {
        console.error('[NewsService] Fetch failed:', err.message);
        // Resolve empty so a network blip doesn't permanently block trading
        resolve([]);
      });
    });
  }

  // ─── Re-fetch if stale, then return events in the next hour ──────────────────
  async getUpcomingEvents() {
    if (Date.now() - this.lastFetch > REFRESH_INTERVAL) {
      await this.fetchCalendar();
    }

    const now     = Date.now();
    const horizon = now + 60 * 60 * 1000; // next 60 min

    return this.events.filter(e =>
      e.timestamp > now - BLOCK_AFTER_MS &&
      e.timestamp < horizon
    );
  }

  // ─── Returns true if we are inside the blackout window of any event ───────────
  async isTradingBlocked() {
    if (Date.now() - this.lastFetch > REFRESH_INTERVAL) {
      await this.fetchCalendar();
    }

    const now = Date.now();

    for (const ev of this.events) {
      const before = ev.timestamp - now; // ms until the event
      const after  = now - ev.timestamp; // ms since the event

      if (before >= 0 && before <= BLOCK_BEFORE_MS) {
        console.log(`[NewsService] BLOCKED: "${ev.title}" in ${(before / 60000).toFixed(1)} min`);
        return true;
      }
      if (after >= 0 && after <= BLOCK_AFTER_MS) {
        console.log(`[NewsService] BLOCKED: "${ev.title}" released ${(after / 60000).toFixed(1)} min ago`);
        return true;
      }
    }

    return false;
  }

  getNextEvent() {
    const now = Date.now();
    return this.events.find(e => e.timestamp > now) ?? null;
  }

  minutesToNextEvent() {
    const next = this.getNextEvent();
    if (!next) return null;
    return (next.timestamp - Date.now()) / 60_000;
  }
}

module.exports = NewsService;
