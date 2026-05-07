/**
 * App — root component.
 *
 * Mode lifecycle:
 *  MOUNT  → auto-connects to paper trading (no user action needed)
 *  "Go Live" modal → user supplies Tradovate credentials → live mode
 *
 * The dashboard is ALWAYS visible; there is no blocking connect screen.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import useWebSocket from './hooks/useWebSocket';
import TradingDashboard from './components/TradingDashboard';

const DEFAULT_SETTINGS = {
  accountBalance:  50_000,
  profitTarget:    1_000,
  dailyLossLimit:  500,
  trailingMaxLoss: 2_000,
  consistencyRule: 0.30,
  maxPositions:    3,
};

export default function App() {
  const [settings,       setSettings]       = useState(DEFAULT_SETTINGS);
  const [mode,           setMode]           = useState('paper'); // 'paper' | 'live'
  const [connecting,     setConnecting]     = useState(false);
  const [connectError,   setConnectError]   = useState(null);
  const [ready,          setReady]          = useState(false);   // backend session initialised

  // Live data slices — populated by WebSocket messages
  const [priceData,      setPriceData]      = useState(null);
  const [riskState,      setRiskState]      = useState(null);
  const [autoTrading,    setAutoTrading]    = useState(false);
  const [fills,          setFills]          = useState([]);
  const [statusMessages, setStatusMessages] = useState([]);
  const [pnlHistory,     setPnlHistory]     = useState([]);

  const pnlRef = useRef([]);

  // ─── WebSocket message router ──────────────────────────────────────────────
  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'price':
        setPriceData(msg.data);
        break;

      case 'riskState':
        setRiskState(msg.data);
        if (msg.data?.accountBalance != null) {
          pnlRef.current = [
            ...pnlRef.current.slice(-199),
            { time: new Date().toISOString(), value: msg.data.dailyPnL, balance: msg.data.accountBalance },
          ];
          setPnlHistory([...pnlRef.current]);
        }
        break;

      case 'mode':
        setMode(msg.mode);
        setReady(true);
        break;

      case 'fill':
        setFills(prev => [msg.data, ...prev].slice(0, 100));
        break;

      case 'autoTrading':
        setAutoTrading(msg.active);
        if (msg.reason) addStatus({ level: 'warn', message: `Auto-trading stopped: ${msg.reason}` });
        break;

      case 'statusMessage':
        addStatus(msg);
        break;

      case 'newsBlock':
        addStatus({ level: 'warn', message: msg.message });
        break;

      case 'mlBlock':
        addStatus({ level: 'info', message: msg.message });
        break;

      default:
        break;
    }
  }, []);

  const addStatus = useCallback((msg) => {
    const entry = { ...msg, id: Date.now() + Math.random(), ts: new Date().toISOString() };
    setStatusMessages(prev => [entry, ...prev].slice(0, 50));
  }, []);

  const { connected: wsConnected } = useWebSocket(handleMessage);

  // ─── On mount: probe backend so we're in sync with its current mode ────────
  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(data => {
        if (data.ready) {
          setMode(data.mode);
          if (data.state) setRiskState(data.state);
          setReady(true);
        }
      })
      .catch(() => {
        // Backend not up yet — WS will sync us when it reconnects
      });
  }, []);

  // ─── Connect / upgrade session ────────────────────────────────────────────
  // Called either to:
  //  a) change settings (paper stays paper)
  //  b) go live with Tradovate credentials
  const handleConnect = useCallback(async ({ credentials, settings: newSettings, paper = false }) => {
    setConnecting(true);
    setConnectError(null);
    try {
      const resp = await fetch('/api/connect', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          credentials: credentials || {},
          settings:    newSettings || settings,
          paper,
        }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error);

      setMode(data.mode);
      setReady(true);
      if (newSettings) setSettings(newSettings);
      addStatus({ level: 'success', message: data.message });
    } catch (err) {
      setConnectError(err.message);
    } finally {
      setConnecting(false);
    }
  }, [settings]);

  // ─── Toggle auto-trading ──────────────────────────────────────────────────
  const handleAutoToggle = useCallback(async (active) => {
    try {
      const resp = await fetch('/api/start-auto', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ active }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
    } catch (err) {
      addStatus({ level: 'error', message: `Auto-trading toggle failed: ${err.message}` });
    }
  }, []);

  return (
    <TradingDashboard
      // Connection / mode
      wsConnected={wsConnected}
      ready={ready}
      mode={mode}
      connecting={connecting}
      connectError={connectError}
      onConnect={handleConnect}
      // Live data
      priceData={priceData}
      riskState={riskState}
      autoTrading={autoTrading}
      fills={fills}
      pnlHistory={pnlHistory}
      statusMessages={statusMessages}
      // Settings
      settings={settings}
      onSettingsChange={setSettings}
      // Actions
      onAutoToggle={handleAutoToggle}
    />
  );
}
