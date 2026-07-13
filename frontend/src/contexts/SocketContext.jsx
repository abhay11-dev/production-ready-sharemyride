// src/contexts/SocketContext.jsx

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import toast from '../services/toastService';
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
  const navigate = useNavigate();

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

    const clickableToast = (message, conversationId, opts = {}) => {
      toast.custom(
        (t) => (
          <div
            onClick={() => {
              toast.dismiss(t.id);
              if (conversationId) navigate(`/chat/${conversationId}`);
            }}
            className="bg-white shadow-lg rounded-xl border border-gray-100 px-4 py-3 text-sm text-gray-800 cursor-pointer max-w-sm"
          >
            {message}
          </div>
        ),
        { duration: opts.duration || 6000 }
      );
    };

    s.on('negotiation:new', (payload) => {
      clickableToast(`🤝 ${payload.message || 'New negotiation request'}`, payload.conversationId, { duration: 8000 });
    });
    s.on('negotiation:countered', (payload) => {
      clickableToast(`🔄 ${payload.message || 'The other party sent a counter-offer'}`, payload.conversationId);
    });
    s.on('negotiation:accepted', (payload) => {
      clickableToast(`✅ ${payload.message || 'Your negotiation was accepted'}`, payload.conversationId);
    });
    s.on('negotiation:rejected', (payload) => {
      clickableToast(`❌ ${payload.message || 'Your negotiation was declined'}`, payload.conversationId);
    });
    s.on('negotiation:cancelled', (payload) => {
      clickableToast(`ℹ️ ${payload.message || 'A negotiation was cancelled'}`, payload.conversationId);
    });
    s.on('negotiation:finalized', (payload) => {
      clickableToast(`🎉 ${payload.message || 'Ride confirmed! Your booking is ready.'}`, payload.conversationId, { duration: 8000 });
    });
    s.on('moderation:warned', () => {
      toast('⚠️ You received a safety warning from the ShareMyRide team. Please review our community guidelines.', {
        duration: 8000,
      });
    });
    s.on('moderation:action', (payload) => {
      toast.error(
        `Your account has been ${(payload.action || 'restricted').toLowerCase()}${payload.reason ? `: ${payload.reason}` : '.'}`,
        { duration: 10000 }
      );
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