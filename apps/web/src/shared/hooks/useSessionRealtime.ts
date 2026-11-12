import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { JoinSessionEvent } from '@court-flow/contracts';

export function useSessionRealtime(code: string | undefined, onUpdate: () => void) {
  const [connected, setConnected] = useState(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!code) {
      setConnected(false);
      return;
    }

    const socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
    socket.on('connect', () => {
      setConnected(true);
      const payload: JoinSessionEvent = { code };
      socket.emit('session:join', payload);
      onUpdateRef.current();
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('session:changed', () => onUpdateRef.current());
    return () => { socket.disconnect(); };
  }, [code]);

  return connected;
}
