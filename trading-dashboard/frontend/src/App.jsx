/**
 * App — root component.
 *
 * Owns:
 *  - WebSocket connection (delegates to useWebSocket)
 *  - Global state: price, riskState, fills, autoTrading, statusMessages
 *  - User settings (passed down to RiskSettings, read by TradingDashboard)
 *  - /api/connect handshake
 */
import { useState, useCallback, useRef } from 'react';
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
  const [settings,      setSettings]      = useState(DEFAULT_SETTINGS);
  const [credentials,   setCredentials]   = useState({});
  const [connected,     setConnected]     = useState(false);
  const [connecting,    setConnecting]    = useState(false);
  const [connectError,  setConnectError]  = useState(null);
  const [simulated,     setSimulated]     = useState(true);

  // Live data slices — updated by WebSocket messages
  const [priceData,     setPriceData]     = useState(null);
  const [riskState,     setRiskState]     = useState(null);
  const [autoTrading,   setAutoTrading]   = useState(false);
  const [fills,         setFills]         = useState([]);
  const [statusMessages, setStatusMessages] = useState([]);
  const [pnlHistory,    setPnlHistory]    = useState([]);

  // Accumulate rolling P&L history for the chart (capped at 200 points)
  const pnlRef = useRef([]);

  // ─── WebSocket message router ─────────────────────────────────────────────
  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'price':
        setPriceData(msg.data);
        break;

      case 'riskState':
        setRiskState(msg.data);
        // Track equity curve
        if (msg.data?.accountBalance) {
          pnlRef.current = [
            ...pnlRef.current.slice(-199),
            { time: new Date().toISOString(), value: msg.data.dailyPnL, balance: msg.data.accountBalance },
          ];
          setPnlHistory([...pnlRef.current]);
        }
        break;

      case 'fill':
        setFills(prev => [msg.data, ...prev].slice(0, 100));
        break;

      case 'autoTrading':
        setAutoTrading(msg.active);
        if (msg.reason) {
          addStatus({ level: 'warn', message: `Auto-trading stopped: ${msg.reason}` });
        }
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

  const { connected: wsConnected, send } = useWebSocket(handleMessage);

  // ─── Connect to backend ───────────────────────────────────────────────────
  const handleConnect = async (creds, userSettings) => {
    setConnecting(true);
    setConnectError(null);
    try {
      const resp = await fetch('/api/connect', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ credentials: creds || {}, settings: userSettings || settings }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error);

      setConnected(true);
      setSimulated(data.simulated);
      setCredentials(creds || {});
      if (userSettings) setSettings(userSettings);
      addStatus({ level: 'success', message: data.message });
    } catch (err) {
      setConnectError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  // ─── Toggle auto-trading ──────────────────────────────────────────────────
  const handleAutoToggle = async (active) => {
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
  };

  return (
    <TradingDashboard
      // Connection
      wsConnected={wsConnected}
      apiConnected={connected}
      connecting={connecting}
      connectError={connectError}
      simulated={simulated}
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
