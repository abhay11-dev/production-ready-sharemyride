// src/components/common/MessagesBell.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSocketContext } from '../../contexts/SocketContext';
import { getMyConversations } from '../../services/chatService';
import Icon from '../../components/ui/Icon.jsx';

export default function MessagesBell() {
  const { user, isLoading: authLoading } = useAuth();
  const { socket } = useSocketContext();
  const navigate = useNavigate();
  const [unreadByConv, setUnreadByConv] = useState({}); // conversationId -> count

  const roleUnread = useCallback((conv) => {
    const isPassenger = (conv.passenger?._id || conv.passenger) === user?._id;
    return isPassenger ? (conv.unreadCount?.passenger || 0) : (conv.unreadCount?.driver || 0);
  }, [user?._id]);

  useEffect(() => {
    if (authLoading || !user) return;
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
  }, [user, authLoading, roleUnread]);

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
      <Icon name="MessageCircle" size="md" />

      {total > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none text-white bg-blue-600 rounded-full ring-2 ring-white">
          {total > 9 ? '9+' : total}
        </span>
      )}
    </button>
  );
}