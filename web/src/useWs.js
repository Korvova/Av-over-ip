import { useEffect, useRef } from 'react';

/** Подписка на живые обновления с сервера (/ws). handler(type, payload) */
export function useWs(handler) {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    let ws;
    let closed = false;
    let retry;

    function connect() {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${location.host}/ws`);
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type && msg.type !== 'hello') ref.current(msg.type, msg.payload);
        } catch { /* мусор игнорируем */ }
      };
      ws.onclose = () => {
        if (!closed) retry = setTimeout(connect, 2000);
      };
    }
    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      ws && ws.close();
    };
  }, []);
}
