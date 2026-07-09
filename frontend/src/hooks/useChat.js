// src/hooks/useChat.js
//
// MILESTONE 4 (frontend) — the socket + REST glue for a single conversation
// thread. Loads initial history via REST (a socket can't hand you history
// on connect), then layers live updates on top via the shared socket
// (services/socketClient.js).
//
// Send path: primary is the socket's 'message:send' event (matches
// backend/services/socket.js). If the socket isn't connected for any
// reason, falls back to the REST endpoint (chatController.sendMessageRest)
// so sending never silently fails — mirrors the dual-path design documented
// in ARCHITECTURE.md §8.

import { useEffect, useRef, useState, useCallback } from 'react';
import { connectSocket, getSocket } from '../services/socketClient';
import { getMessages, sendMessageRest } from '../services/chatService';

const TYPING_TIMEOUT_MS = 4000;

/**
 * @param {string} conversationId
 * @returns {{
 *   messages: Array, loading: boolean, sending: boolean,
 *   typingUser: string|null, hasMore: boolean,
 *   loadMore: () => Promise<void>,
 *   sendMessage: (text: string) => Promise<Object>,
 *   startTyping: () => void, stopTyping: () => void, markRead: () => void,
 * }}
 */
export function useChat(conversationId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const typingTimerRef = useRef(null);
  const messagesRef = useRef([]);
  messagesRef.current = messages;

  // ── Initial history load ────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;

    setLoading(true);
    setMessages([]);
    setPage(1);
    setHasMore(false);

    getMessages(conversationId, { page: 1, limit: 30 })
      .then(({ data, meta }) => {
        if (cancelled) return;
        // API returns newest-first; render chronologically (oldest first)
        setMessages(data.slice().reverse());
        setHasMore((meta.page || 1) < (meta.totalPages || 1));
        setPage(meta.page || 1);
      })
      .catch((err) => {
        console.error('❌ Failed to load message history:', err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [conversationId]);

  // ── Live socket listeners ───────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;

    const socket = connectSocket();

    const handleNewMessage = (msg) => {
      const msgConvId = typeof msg.conversation === 'object' ? msg.conversation?._id : msg.conversation;
      if (msgConvId !== conversationId) return;

      setMessages((prev) => {
        // Avoid duplicating a message the sender already appended optimistically
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });

      // Any new message from the other party clears their typing indicator
      setTypingUser((prev) => {
        const senderId = typeof msg.sender === 'object' ? msg.sender?._id : msg.sender;
        return prev === senderId ? null : prev;
      });
    };

    const handleTyping = ({ conversationId: cid, userId, isTyping }) => {
      if (cid !== conversationId) return;
      clearTimeout(typingTimerRef.current);
      if (isTyping) {
        setTypingUser(userId);
        typingTimerRef.current = setTimeout(() => setTypingUser(null), TYPING_TIMEOUT_MS);
      } else {
        setTypingUser((prev) => (prev === userId ? null : prev));
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('typing:update', handleTyping);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('typing:update', handleTyping);
      clearTimeout(typingTimerRef.current);
    };
  }, [conversationId]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!conversationId || !hasMore) return;
    const nextPage = page + 1;
    try {
      const { data, meta } = await getMessages(conversationId, { page: nextPage, limit: 30 });
      setMessages((prev) => [...data.slice().reverse(), ...prev]);
      setPage(meta.page || nextPage);
      setHasMore((meta.page || nextPage) < (meta.totalPages || 1));
    } catch (err) {
      console.error('❌ Failed to load earlier messages:', err.message);
    }
  }, [conversationId, page, hasMore]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || !conversationId) return null;

    setSending(true);
    try {
      const socket = getSocket();
      if (socket.connected) {
        const result = await new Promise((resolve, reject) => {
          socket.emit('message:send', { conversationId, text: trimmed }, (ack) => {
            if (ack?.success) resolve(ack.data);
            else reject(new Error(ack?.message || 'Failed to send message'));
          });
        });
        return result;
      }
      // Socket not connected — REST fallback (chatController.sendMessageRest
      // also emits the saved message to the room, so any other connected
      // client still sees it in real time even though this client sent it
      // over REST)
      const saved = await sendMessageRest(conversationId, trimmed);
      setMessages((prev) => (prev.some((m) => m._id === saved._id) ? prev : [...prev, saved]));
      return saved;
    } finally {
      setSending(false);
    }
  }, [conversationId]);

  const startTyping = useCallback(() => {
    if (!conversationId) return;
    const socket = connectSocket();
    socket.emit('typing:start', { conversationId });
  }, [conversationId]);

  const stopTyping = useCallback(() => {
    if (!conversationId) return;
    const socket = getSocket();
    socket.emit('typing:stop', { conversationId });
  }, [conversationId]);

  const markRead = useCallback(() => {
    if (!conversationId) return;
    const socket = connectSocket();
    socket.emit('message:read', { conversationId });
  }, [conversationId]);

  return {
    messages, loading, sending, typingUser, hasMore,
    loadMore, sendMessage, startTyping, stopTyping, markRead,
  };
}

export default useChat;