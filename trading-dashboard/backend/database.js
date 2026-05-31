/**
 * SQLite database layer (better-sqlite3 — synchronous, zero-config).
 * Tables: trades, daily_stats, settings
 */
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'trading.db');
let db;

// ─── Schema ───────────────────────────────────────────────────────────────────
function initDatabase() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL'); // Write-ahead logging — better concurrency

  db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id          TEXT    PRIMARY KEY,
      symbol      TEXT    NOT NULL,
      action      TEXT    NOT NULL,       -- 'buy' | 'sell'
      quantity    INTEGER NOT NULL,
      entry_price REAL    NOT NULL,
      exit_price  REAL,
      pnl         REAL,
      stop_loss   REAL,
      take_profit REAL,
      status      TEXT    DEFAULT 'open', -- 'open' | 'closed' | 'cancelled'
      open_time   TEXT    NOT NULL,
      close_time  TEXT,
      simulated   INTEGER DEFAULT 0,
      notes       TEXT
    );

    CREATE TABLE IF NOT EXISTS daily_stats (
      date               TEXT PRIMARY KEY,   -- YYYY-MM-DD
      total_trades       INTEGER DEFAULT 0,
      winning_trades     INTEGER DEFAULT 0,
      losing_trades      INTEGER DEFAULT 0,
      total_pnl          REAL    DEFAULT 0,
      best_trade         REAL    DEFAULT 0,
      worst_trade        REAL    DEFAULT 0,
      start_balance      REAL,
      end_balance        REAL,
      profit_target_hit  INTEGER DEFAULT 0,
      daily_loss_hit     INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_trades_open_time ON trades(open_time);
    CREATE INDEX IF NOT EXISTS idx_trades_status    ON trades(status);
  `);

  console.log('[Database] Ready:', DB_PATH);
  return db;
}

// ─── Trade persistence ────────────────────────────────────────────────────────
function recordTrade(fill) {
  if (!db) return;

  if (fill.closedPositionId) {
    // Closing an existing trade
    db.prepare(`
      UPDATE trades
      SET exit_price = ?, pnl = ?, status = 'closed', close_time = ?
      WHERE id = ?
    `).run(fill.price, fill.pnl, fill.timestamp, fill.closedPositionId);

    updateDailyStats(fill);
  } else {
    // Opening a new trade
    db.prepare(`
      INSERT OR IGNORE INTO trades
        (id, symbol, action, quantity, entry_price, stop_loss, take_profit, status, open_time, simulated)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
    `).run(
      fill.id,
      fill.symbol,
      fill.action,
      fill.quantity,
      fill.price,
      fill.stopLoss  ?? null,
      fill.takeProfit ?? null,
      fill.timestamp,
      fill.simulated ? 1 : 0,
    );
  }
}

// ─── Daily stats upsert ───────────────────────────────────────────────────────
function updateDailyStats(closedTrade) {
  const date = new Date(closedTrade.timestamp).toISOString().split('T')[0];
  const isWin = closedTrade.pnl > 0;

  // UPSERT: insert row or update counters if date already exists
  db.prepare(`
    INSERT INTO daily_stats (date, total_trades, winning_trades, losing_trades, total_pnl, best_trade, worst_trade)
    VALUES (?, 1, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      total_trades   = total_trades + 1,
      winning_trades = winning_trades + excluded.winning_trades,
      losing_trades  = losing_trades  + excluded.losing_trades,
      total_pnl      = total_pnl + excluded.total_pnl,
      best_trade     = MAX(best_trade,  excluded.best_trade),
      worst_trade    = MIN(worst_trade, excluded.worst_trade)
  `).run(
    date,
    isWin ? 1 : 0,
    isWin ? 0 : 1,
    closedTrade.pnl,
    closedTrade.pnl,
    closedTrade.pnl,
  );
}

// ─── Queries ──────────────────────────────────────────────────────────────────
function getTrades({ startDate, endDate, status, limit = 200 } = {}) {
  let sql = 'SELECT * FROM trades WHERE 1=1';
  const params = [];

  if (startDate) { sql += ' AND open_time >= ?'; params.push(startDate); }
  if (endDate)   { sql += ' AND open_time <= ?'; params.push(endDate);   }
  if (status)    { sql += ' AND status = ?';     params.push(status);    }

  sql += ' ORDER BY open_time DESC LIMIT ?';
  params.push(parseInt(limit, 10));

  return db.prepare(sql).all(...params);
}

function getDailyStats({ startDate, endDate } = {}) {
  let sql = 'SELECT * FROM daily_stats WHERE 1=1';
  const params = [];

  if (startDate) { sql += ' AND date >= ?'; params.push(startDate); }
  if (endDate)   { sql += ' AND date <= ?'; params.push(endDate);   }

  sql += ' ORDER BY date ASC';
  return db.prepare(sql).all(...params);
}

function saveSetting(key, value) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
}

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? JSON.parse(row.value) : null;
}

module.exports = { initDatabase, recordTrade, getTrades, getDailyStats, updateDailyStats, saveSetting, getSetting };
