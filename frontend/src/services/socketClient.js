// src/services/socketClient.js
//
// MILESTONE 4 (frontend) — a single shared Socket.IO connection for the
// whole app, mirroring backend/services/socket.js's design (one socket per
// browser tab, joined to every conversation room the user participates in
// right after connecting).
//
// Why a singleton instead of connecting inside useChat: Inbox.jsx needs
// live "new message" / unread-count updates too, not just ChatThread. A
// shared connection means both screens see the same socket without either
// one owning its lifecycle exclusively.
//
// Auth: uses the SAME in-memory access token as every REST call (see
// hooks/useAuth.jsx) — no separate socket-specific login step. Matches
// backend/services/socket.js's handshake expectations exactly:
// `socket.handshake.auth.token`.
//
// REQUIRES the `socket.io-client` package. If it isn't already in
// frontend/package.json, install it with:
//   npm install socket.io-client

import { io } from 'socket.io-client';
import { getAccessToken } from '../hooks/useAuth.jsx';

// api.js's VITE_API_URL includes a trailing /api (REST base path).
// Socket.IO attaches to the bare server origin, so strip it here.
const API_URL = import.meta.env.VITE_API_URL || 'https://production-ready-sharemyride.onrender.com/api';
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

let socket = null;

/**
 * Returns the shared socket instance, creating it (but not connecting it)
 * on first call.
 */
export function getSocket() {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    withCredentials: true,
  });

  socket.on('connect_error', (err) => {
    // Non-fatal — chatService/useChat fall back to REST reads; sends will
    // retry via the REST fallback path if the socket never connects.
    console.warn('⚠️ Socket connection error:', err.message);
  });

  return socket;
}

/**
 * Connects the shared socket, refreshing the auth token on every call (the
 * access token can rotate between connects, e.g. after a silent refresh).
 * Safe to call repeatedly — no-ops if already connected.
 */
export function connectSocket() {
  const s = getSocket();
  const token = getAccessToken();

  if (!token) {
    console.warn('⚠️ connectSocket called with no access token in memory — chat will not authenticate');
  }

  s.auth = { token };

  if (!s.connected && !s.connecting) {
    s.connect();
  }
  return s;
}

/**
 * Disconnects the shared socket. Call this on logout so a stale connection
 * doesn't keep delivering another user's events after sign-out.
 */
export function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect();
  }
}

export default { getSocket, connectSocket, disconnectSocket };