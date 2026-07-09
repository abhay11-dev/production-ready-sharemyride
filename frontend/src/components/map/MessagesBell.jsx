// src/components/common/MessagesBell.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSocketContext } from '../../contexts/SocketContext';
import { getMyConversations } from '../../services/chatService';

export default function MessagesBell() {
  const { user } = useAuth();
  const { socket } = useSocketContext();
  const navigate = useNavigate();
  const [unreadByConv, setUnreadByConv] = useState({}); // conversationId -> count

  const roleUnread = useCallback((conv) => {
    const isPassenger = (conv.passenger?._id || conv.passenger) === user?._id;
    return isPassenger ? (conv.unreadCount?.passenger || 0) : (conv.unreadCount?.driver || 0);
  }, [user?._id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const conversations = await getMyConversations();
        if (cancelled) return;
        const map = {};
        conversations.forEach((c) => { map[c._id] = roleUnread(c); });
        setUnreadByConv(map);
      } catch {
        // Silent — bell just won't show a badge this session
      }
    })();
    return () => { cancelled = true; };
  }, [user, roleUnread]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleNew = (message) => {
      const convId = message.conversation?._id || message.conversation;
      const isMine = (message.sender?._id || message.sender) === user._id;
      if (isMine) return; // don't badge your own sent messages
      setUnreadByConv((prev) => ({ ...prev, [convId]: (prev[convId] || 0) + 1 }));
    };
    const handleRead = ({ conversationId, userId }) => {
      if (userId !== user._id) return; // only clear when THIS user read it (their other tab/device)
      setUnreadByConv((prev) => ({ ...prev, [conversationId]: 0 }));
    };

    socket.on('message:new', handleNew);
    socket.on('conversation:read', handleRead);
    return () => {
      socket.off('message:new', handleNew);
      socket.off('conversation:read', handleRead);
    };
  }, [socket, user]);

  if (!user) return null;

  const total = Object.values(unreadByConv).reduce((sum, n) => sum + n, 0);

  return (
    <button
      onClick={() => navigate('/messages')}
      className="relative p-2 text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
      aria-label="Messages"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>

      {total > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
          {total > 9 ? '9+' : total}
        </span>
      )}
    </button>
  );
}