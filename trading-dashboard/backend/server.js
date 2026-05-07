/**
 * Trading Dashboard Backend - Main Server
 * Express + WebSocket server that bridges the frontend to Tradovate (real or simulated)
 * and enforces all risk rules before any order is placed.
 */
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const { initDatabase, recordTrade, getTrades, getDailyStats } = require('./database');
const TradovateClient = require('./tradovate-client');
const RiskEngine = require('./risk-engine');
const Strategy = require('./strategy');
const MLAdvisor = require('./ml-advisor');
const NewsService = require('./news-service');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ─── Global singletons ────────────────────────────────────────────────────────
let tradovateClient = null;
let riskEngine = null;
let strategy = null;
const mlAdvisor = new MLAdvisor();
const newsService = new NewsService();
let autoTradingActive = false;
const wsClients = new Set();

// ─── WebSocket connection management ─────────────────────────────────────────
wss.on('connection', (ws) => {
  wsClients.add(ws);
  console.log('[WS] Client connected. Total:', wsClients.size);

  // Send current state immediately so the UI is never blank on reconnect
  if (riskEngine) {
    safeSend(ws, { type: 'riskState', data: riskEngine.getState() });
  }
  safeSend(ws, { type: 'autoTrading', active: autoTradingActive });

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log('[WS] Client disconnected. Total:', wsClients.size);
  });
});

function safeSend(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcast(payload) {
  const msg = JSON.stringify(payload);
  wsClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}

// ─── POST /api/connect ────────────────────────────────────────────────────────
// Initialise the Tradovate connection and risk engine with user-supplied settings.
// Pass empty credentials {} to use the built-in simulator.
app.post('/api/connect', async (req, res) => {
  try {
    const { credentials = {}, settings = {} } = req.body;

    // Tear down previous client if reconnecting
    if (tradovateClient) tradovateClient.disconnect();

    tradovateClient = new TradovateClient(credentials);
    await tradovateClient.connect();

    riskEngine = new RiskEngine(settings);
    strategy = new Strategy(tradovateClient, riskEngine);

    // Price tick → feed to strategy when auto-trading
    tradovateClient.on('price', (priceData) => {
      broadcast({ type: 'price', data: priceData });
      if (autoTradingActive) {
        processAutoTrade(priceData).catch(console.error);
      }
    });

    // Order fill → persist + update risk engine + notify UI
    tradovateClient.on('fill', async (fillData) => {
      await recordTrade(fillData);
      riskEngine.onTrade(fillData);
      mlAdvisor.recordTrade(fillData);
      broadcast({ type: 'fill', data: fillData });
      broadcast({ type: 'riskState', data: riskEngine.getState() });

      // Auto-stop if any hard risk limit was hit
      const state = riskEngine.getState();
      if (!state.canTrade && autoTradingActive) {
        autoTradingActive = false;
        broadcast({ type: 'autoTrading', active: false, reason: 'Risk limit triggered' });
        console.log('[Server] Auto-trading halted — risk limit reached');
      }
    });

    res.json({
      success: true,
      simulated: tradovateClient.isSimulated,
      message: tradovateClient.isSimulated
        ? 'Running in SIMULATION mode — no real orders'
        : 'Connected to live Tradovate API',
    });
  } catch (err) {
    console.error('[/api/connect]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/start-auto ─────────────────────────────────────────────────────
// Toggle the auto-trading engine on or off.
app.post('/api/start-auto', (req, res) => {
  if (!tradovateClient || !riskEngine) {
    return res.status(400).json({ error: 'Call /api/connect first.' });
  }

  const { active } = req.body;

  // Refuse to start if risk limits are already blown
  if (active && !riskEngine.getState().canTrade) {
    return res.status(400).json({
      error: 'Cannot start — a risk limit (daily loss / profit target / trailing drawdown) is already hit.',
      state: riskEngine.getState(),
    });
  }

  autoTradingActive = !!active;
  broadcast({ type: 'autoTrading', active: autoTradingActive });
  console.log(`[Server] Auto-trading: ${autoTradingActive ? 'STARTED' : 'STOPPED'}`);
  res.json({ success: true, autoTradingActive });
});

// ─── GET /api/trades ──────────────────────────────────────────────────────────
// Returns trade history with optional filters: startDate, endDate, status, limit
app.get('/api/trades', async (req, res) => {
  try {
    const trades = await getTrades(req.query);
    res.json(trades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/balance ─────────────────────────────────────────────────────────
// Returns live account balance and full risk engine state
app.get('/api/balance', (req, res) => {
  if (!riskEngine) {
    return res.json({ balance: 0, dailyPnL: 0, connected: false });
  }
  res.json({ ...riskEngine.getState(), connected: true });
});

// ─── GET /api/daily-stats ─────────────────────────────────────────────────────
// Calendar data — daily P&L per date for the CalendarView component
app.get('/api/daily-stats', async (req, res) => {
  try {
    const stats = await getDailyStats(req.query);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/news ────────────────────────────────────────────────────────────
app.get('/api/news', async (req, res) => {
  try {
    const events = await newsService.getUpcomingEvents();
    const isBlocked = await newsService.isTradingBlocked();
    const next = newsService.getNextEvent();
    res.json({ events, isBlocked, nextEvent: next });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/ml-stats ────────────────────────────────────────────────────────
app.get('/api/ml-stats', (req, res) => {
  res.json(mlAdvisor.getStats());
});

// ─── Auto-trade decision loop ─────────────────────────────────────────────────
async function processAutoTrade(priceData) {
  if (!autoTradingActive || !strategy || !riskEngine) return;

  // 1. Hard risk-limit gate — enforced before any other check
  const state = riskEngine.getState();
  if (!state.canTrade) return;

  // 2. News blackout window — no trades within 15 min of high-impact events
  const newsBlocked = await newsService.isTradingBlocked();
  if (newsBlocked) {
    broadcast({ type: 'statusMessage', level: 'warn', message: '📰 Trading paused — high-impact news window' });
    return;
  }

  // 3. ML advisor — skips historically bad hours
  const mlAdvice = mlAdvisor.shouldTrade();
  if (!mlAdvice.trade) {
    broadcast({ type: 'statusMessage', level: 'info', message: `🤖 ML: ${mlAdvice.reason}` });
    return;
  }

  // 4. SMA cross strategy signal
  const signal = strategy.getSignal(priceData);
  if (!signal) return;

  // 5. Position-size from risk engine (1% risk, respects max-contracts)
  const qty = riskEngine.calculatePositionSize(priceData.price, signal.stopLoss);
  if (qty <= 0) {
    broadcast({ type: 'statusMessage', level: 'warn', message: '⚠️ Risk engine: no contracts allowed right now' });
    return;
  }

  broadcast({ type: 'statusMessage', level: 'success', message: `🚀 Auto signal: ${signal.action.toUpperCase()} ${qty}x @ ${priceData.price.toFixed(2)} — ${signal.reason}` });

  await tradovateClient.placeOrder({
    symbol: priceData.symbol,
    action: signal.action,
    quantity: qty,
    orderType: 'Market',
    stopLoss: signal.stopLoss,
    takeProfit: signal.takeProfit,
  });
}

// ─── Startup ──────────────────────────────────────────────────────────────────
async function start() {
  await initDatabase();
  await newsService.fetchCalendar(); // Prime the news cache

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`\n🚀 Trading server listening on http://localhost:${PORT}`);
    console.log(`📡 WebSocket on ws://localhost:${PORT}`);
  });
}

start().catch(console.error);
