import React, { createContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../api/client';
import { useAuth } from '../hooks/useAuth';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
  emit: (event: string, data?: unknown) => void;
}

export const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    const socket = io(import.meta.env['VITE_SOCKET_URL'] as string ?? 'http://localhost:4000', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated]);

  const on = (event: string, handler: (...args: unknown[]) => void) => {
    socketRef.current?.on(event, handler);
  };

  const off = (event: string, handler: (...args: unknown[]) => void) => {
    socketRef.current?.off(event, handler);
  };

  const emit = (event: string, data?: unknown) => {
    socketRef.current?.emit(event, data);
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, on, off, emit }}>
      {children}
    </SocketContext.Provider>
  );
}
