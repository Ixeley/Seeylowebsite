/**
 * Trading Dashboard Backend — Main Server
 *
 * Mode lifecycle:
 *  BOOT        → paper trading starts automatically (PaperClient)
 *  POST /api/connect  { paper: true }   → re-init paper (change settings)
 *  POST /api/connect  { credentials: { username, … } } → upgrade to live Tradovate
 *
 * This means the frontend never shows a blocking splash screen.
 * The dashboard is immediately usable in paper mode.
 */
const express = require('express');
const http    = require('http');
const WebSocket = require('ws');
const cors    = require('cors');

const { initDatabase, recordTrade, getTrades, getDailyStats } = require('./database');
const TradovateClient = require('./tradovate-client');
const PaperClient     = require('./paper-client');
const RiskEngine      = require('./risk-engine');
const Strategy        = require('./strategy');
const MLAdvisor       = require('./ml-advisor');
const NewsService     = require('./news-service');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

// ─── Defaults ────────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  accountBalance:  50_000,
  profitTarget:    1_000,
  dailyLossLimit:  500,
  trailingMaxLoss: 2_000,
  consistencyRule: 0.30,
  maxPositions:    3,
};

// ─── Global singletons ───────────────────────────────────────────────────────
let activeClient     = null;  // PaperClient | TradovateClient
let riskEngine       = null;
let strategy         = null;
let currentMode      = 'paper'; // 'paper' | 'live'
let accountInfo      = null;   // { account: {id,name}, accounts: [{…}] } — populated when live
const mlAdvisor      = new MLAdvisor();
const newsService    = new NewsService();
let autoTradingActive = false;
const wsClients      = new Set();

// ─── WebSocket helpers ────────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  wsClients.add(ws);
  console.log('[WS] Client connected. Total:', wsClients.size);

  // Send full state immediately so the UI is never stale on reconnect
  if (riskEngine)   safeSend(ws, { type: 'riskState',   data: riskEngine.getState() });
  if (accountInfo)  safeSend(ws, { type: 'accountInfo', data: accountInfo });
  safeSend(ws, { type: 'mode',        mode: currentMode });
  safeSend(ws, { type: 'autoTrading', active: autoTradingActive });

  ws.on('close', () => wsClients.delete(ws));
});

function safeSend(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

function broadcast(payload) {
  const msg = JSON.stringify(payload);
  wsClients.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(msg); });
}

// ─── Session initialisation (shared by boot and /api/connect) ─────────────────
async function initSession(mode, credentials, settings) {
  // Tear down previous client cleanly
  if (activeClient) {
    activeClient.removeAllListeners();
    activeClient.disconnect();
  }
  autoTradingActive = false;

  if (mode === 'live') {
    activeClient = new TradovateClient(credentials);
  } else {
    // Paper mode: optional Finnhub key for real prices
    activeClient = new PaperClient({
      finnhubKey:    credentials?.finnhubKey    || null,
      finnhubSymbol: credentials?.finnhubSymbol || 'OANDA:SPX500_USD',
    });
  }

  await activeClient.connect();

  riskEngine  = new RiskEngine(settings || DEFAULT_SETTINGS);
  strategy    = new Strategy(activeClient, riskEngine);
  currentMode = mode;
  accountInfo = null; // reset; populated below for live sessions

  // Account info — emitted by TradovateClient after successful auth
  activeClient.on('accountInfo', (info) => {
    accountInfo = info;
    broadcast({ type: 'accountInfo', data: info });
    console.log(`[Server] Account: ${info.account?.name}`);
  });

  // Real-time balance updates from Tradovate cash-balance events
  activeClient.on('balanceUpdate', (bal) => {
    broadcast({ type: 'balanceUpdate', data: bal });
  });

  // Price tick → broadcast + optional auto-trade
  activeClient.on('price', (priceData) => {
    broadcast({ type: 'price', data: priceData });
    if (autoTradingActive) processAutoTrade(priceData).catch(console.error);
  });

  // Fill → persist + update risk + broadcast
  activeClient.on('fill', async (fillData) => {
    await recordTrade(fillData);
    riskEngine.onTrade(fillData);
    mlAdvisor.recordTrade(fillData);
    broadcast({ type: 'fill',      data: fillData });
    broadcast({ type: 'riskState', data: riskEngine.getState() });

    // Auto-halt when a risk limit is hit
    const state = riskEngine.getState();
    if (!state.canTrade && autoTradingActive) {
      autoTradingActive = false;
      broadcast({ type: 'autoTrading', active: false, reason: 'Risk limit triggered' });
      console.log('[Server] Auto-trading halted — risk limit reached');
    }
  });

  broadcast({ type: 'mode',      mode: currentMode });
  broadcast({ type: 'riskState', data: riskEngine.getState() });
  console.log(`[Server] Session initialised — mode: ${currentMode}`);
}

// ─── POST /api/connect ────────────────────────────────────────────────────────
// Three use cases:
//  {}                                 → stay in / reset paper mode
//  { paper: true, finnhubKey: '…' }   → paper with real Finnhub prices
//  { credentials: { username, … } }   → upgrade to live Tradovate
app.post('/api/connect', async (req, res) => {
  try {
    const { credentials = {}, settings = {}, paper = false } = req.body;

    const wantLive = !paper && credentials.username;
    const mode     = wantLive ? 'live' : 'paper';

    await initSession(mode, credentials, { ...DEFAULT_SETTINGS, ...settings });

    res.json({
      success:  true,
      mode,
      accountInfo: accountInfo ?? null,
      message:  mode === 'live'
        ? `✅ Live — ${accountInfo?.account?.name || credentials.username}`
        : credentials.finnhubKey
          ? '📈 Paper trading — real prices via Finnhub'
          : '📄 Paper trading — simulated prices (TradingView chart shows real market)',
    });
  } catch (err) {
    console.error('[/api/connect]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/test-connection ───────────────────────────────────────────────
// Validates Tradovate credentials and returns account list WITHOUT changing
// the active session.  Used by the Go Live modal before the user commits.
app.post('/api/test-connection', async (req, res) => {
  try {
    const { credentials = {} } = req.body;
    if (!credentials.username) {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    const result = await TradovateClient.testAuthenticate(credentials);
    res.json({
      success:  true,
      accounts: result.accounts,
      userId:   result.userId,
      message:  `✅ Authenticated — found ${result.accounts.length} account(s)`,
    });
  } catch (err) {
    console.error('[/api/test-connection]', err);
    res.status(401).json({ success: false, error: err.message });
  }
});

// ─── POST /api/start-auto ─────────────────────────────────────────────────────
app.post('/api/start-auto', (req, res) => {
  if (!activeClient || !riskEngine) {
    return res.status(400).json({ error: 'Session not initialised.' });
  }
  const { active } = req.body;

  if (active && !riskEngine.getState().canTrade) {
    return res.status(400).json({
      error: 'Cannot start — a risk limit is already hit.',
      state: riskEngine.getState(),
    });
  }

  autoTradingActive = !!active;
  broadcast({ type: 'autoTrading', active: autoTradingActive });
  console.log(`[Server] Auto-trading: ${autoTradingActive ? 'STARTED' : 'STOPPED'} (${currentMode})`);
  res.json({ success: true, autoTradingActive, mode: currentMode });
});

// ─── GET /api/trades ──────────────────────────────────────────────────────────
app.get('/api/trades', async (req, res) => {
  try { res.json(await getTrades(req.query)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/balance ─────────────────────────────────────────────────────────
app.get('/api/balance', (req, res) => {
  if (!riskEngine) return res.json({ balance: 0, dailyPnL: 0, ready: false });
  res.json({ ...riskEngine.getState(), mode: currentMode, ready: true });
});

// ─── GET /api/daily-stats ─────────────────────────────────────────────────────
app.get('/api/daily-stats', async (req, res) => {
  try { res.json(await getDailyStats(req.query)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/news ────────────────────────────────────────────────────────────
app.get('/api/news', async (req, res) => {
  try {
    const events    = await newsService.getUpcomingEvents();
    const isBlocked = await newsService.isTradingBlocked();
    res.json({ events, isBlocked, nextEvent: newsService.getNextEvent() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/ml-stats ────────────────────────────────────────────────────────
app.get('/api/ml-stats', (_req, res) => res.json(mlAdvisor.getStats()));

// ─── GET /api/status ──────────────────────────────────────────────────────────
// Quick health-check / mode probe used by the frontend on mount
app.get('/api/status', (_req, res) => {
  res.json({
    ready:       !!activeClient,
    mode:        currentMode,
    state:       riskEngine?.getState() ?? null,
    accountInfo: accountInfo ?? null,
  });
});

// ─── Auto-trade decision loop ─────────────────────────────────────────────────
async function processAutoTrade(priceData) {
  if (!autoTradingActive || !strategy || !riskEngine) return;

  // 1. Hard risk gate
  if (!riskEngine.getState().canTrade) return;

  // 2. News blackout
  if (await newsService.isTradingBlocked()) {
    broadcast({ type: 'statusMessage', level: 'warn', message: '📰 Trading paused — high-impact news window' });
    return;
  }

  // 3. ML advisor
  const advice = mlAdvisor.shouldTrade();
  if (!advice.trade) {
    broadcast({ type: 'statusMessage', level: 'info', message: `🤖 ML: ${advice.reason}` });
    return;
  }

  // 4. Strategy signal
  const signal = strategy.getSignal(priceData);
  if (!signal) return;

  // 5. Position size
  const qty = riskEngine.calculatePositionSize(priceData.price, signal.stopLoss);
  if (qty <= 0) {
    broadcast({ type: 'statusMessage', level: 'warn', message: '⚠️ Risk engine: no contracts allowed' });
    return;
  }

  const modeTag = currentMode === 'paper' ? '📄 PAPER' : '🔴 LIVE';
  broadcast({
    type: 'statusMessage', level: 'success',
    message: `${modeTag} ${signal.action.toUpperCase()} ${qty}x @ ${priceData.price.toFixed(2)} — ${signal.reason}`,
  });

  await activeClient.placeOrder({
    symbol:     priceData.symbol,
    action:     signal.action,
    quantity:   qty,
    orderType:  'Market',
    stopLoss:   signal.stopLoss,
    takeProfit: signal.takeProfit,
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function start() {
  await initDatabase();
  await newsService.fetchCalendar();

  // Auto-start paper trading — dashboard is usable immediately without any login
  await initSession('paper', {}, DEFAULT_SETTINGS);

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`\n🚀 Server on http://localhost:${PORT}  |  mode: paper trading (default)`);
    console.log(`📡 WebSocket on ws://localhost:${PORT}`);
    console.log(`   To go live: POST /api/connect with Tradovate credentials\n`);
  });
}

start().catch(console.error);
