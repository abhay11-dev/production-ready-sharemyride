// src/hooks/useChatSocket.js
// Per-conversation live layer: message delivery, typing, read receipts.
// Send goes through the socket when connected; ChatThread.jsx falls back to
// chatService.sendMessageRest() when it isn't — same dual-path pattern the
// backend already uses (ARCHITECTURE.md §8).

import { useEffect, useCallback, useState } from 'react';
import { useSocketContext } from '../contexts/SocketContext';

export function useChatSocket(conversationId, { onMessage } = {}) {
  const { socket, connected } = useSocketContext();
  const [typingUsers, setTypingUsers] = useState({}); // userId -> boolean

  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleMessage = (message) => {
      const msgConvId = message.conversation?._id || message.conversation;
      if (msgConvId === conversationId) onMessage?.(message);
    };
    const handleTyping = ({ conversationId: cid, userId, isTyping }) => {
      if (cid !== conversationId) return;
      setTypingUsers((prev) => ({ ...prev, [userId]: isTyping }));
    };

    socket.on('message:new', handleMessage);
    socket.on('typing:update', handleTyping);

    return () => {
      socket.off('message:new', handleMessage);
      socket.off('typing:update', handleTyping);
    };
  }, [socket, conversationId, onMessage]);

  const sendMessage = useCallback((text) => {
    return new Promise((resolve, reject) => {
      if (!socket || !connected) {
        reject(new Error('SOCKET_NOT_CONNECTED'));
        return;
      }
      socket.emit('message:send', { conversationId, text }, (ack) => {
        if (ack?.success) resolve(ack.data);
        else reject(new Error(ack?.message || 'Send failed'));
      });
    });
  }, [socket, connected, conversationId]);

  const startTyping = useCallback(() => {
    socket?.emit('typing:start', { conversationId });
  }, [socket, conversationId]);

  const stopTyping = useCallback(() => {
    socket?.emit('typing:stop', { conversationId });
  }, [socket, conversationId]);

  const markRead = useCallback(() => {
    socket?.emit('message:read', { conversationId });
  }, [socket, conversationId]);

  return { connected, sendMessage, startTyping, stopTyping, markRead, typingUsers };
}