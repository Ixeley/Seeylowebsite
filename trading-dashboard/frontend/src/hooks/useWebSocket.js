/**
 * useWebSocket — persistent WebSocket hook with auto-reconnect.
 *
 * Returns the latest parsed message (by type) and a connection status flag.
 * The caller passes onMessage to route messages to the right state slice.
 */
import { useEffect, useRef, useCallback, useState } from 'react';

const WS_URL          = 'ws://localhost:3001';
const RECONNECT_DELAY = 3000;

export default function useWebSocket(onMessage) {
  const wsRef    = useRef(null);
  const timerRef = useRef(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('[WS] Connected');
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        onMessage(msg);
      } catch (_) {}
    };

    ws.onclose = () => {
      setConnected(false);
      console.log(`[WS] Disconnected — retrying in ${RECONNECT_DELAY}ms`);
      timerRef.current = setTimeout(connect, RECONNECT_DELAY);
    };

    ws.onerror = () => ws.close(); // triggers onclose → reconnect
  }, [onMessage]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  return { connected, send };
}
