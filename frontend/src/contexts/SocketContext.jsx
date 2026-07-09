// src/contexts/SocketContext.jsx
// Mirrors services/socket.js's handshake contract exactly: same access token
// used for REST, sent once at connect via socket.handshake.auth.token.
// No separate socket auth system — see ARCHITECTURE.md §3.2.

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth, getAccessToken } from '../hooks/useAuth';

// api.js's VITE_API_URL includes a trailing /api — Socket.IO attaches to the
// bare http.Server, not under /api, so strip it.
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL || 'https://production-ready-sharemyride.onrender.com/api').replace(/\/api\/?$/, '');

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const token = getAccessToken();
    if (!token) return; // useAuth sets the token before it sets user — safe to bail otherwise

    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
    });

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', (err) => {
      console.warn('⚠️ Socket connect error:', err.message);
      setConnected(false);
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
    // Re-run on identity change (login/logout/account switch). Access-token
    // rotation from useAuth's 14-min silent refresh does NOT need a
    // reconnect — the socket auth check happens once at handshake, same as
    // the backend's design (services/socket.js's io.use middleware).
  }, [isAuthenticated, user?._id]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocketContext must be used inside <SocketProvider>');
  return ctx;
}