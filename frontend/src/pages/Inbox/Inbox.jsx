// src/pages/Inbox/Inbox.jsx
//
// MILESTONE 4 (frontend) — conversation list. Loads via REST
// (chatService.getMyConversations) on mount, then listens on the shared
// socket for 'message:new' so unread badges / last-message previews update
// live without a manual refresh while this screen is open.

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyConversations } from '../../services/chatService';
import { connectSocket, getSocket } from '../../services/socketClient';
import { useAuth } from '../../hooks/useAuth';
import Icon from '../../components/ui/Icon';

function timeAgo(date) {
  if (!date) return '';
  const diffSeconds = (Date.now() - new Date(date).getTime()) / 1000;
  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function idOf(ref) {
  if (!ref) return null;
  return typeof ref === 'object' ? ref._id : ref;
}

export default function Inbox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadConversations = useCallback(() => {
    return getMyConversations()
      .then((data) => setConversations(data))
      .catch((err) => {
        console.error('❌ Failed to load conversations:', err.message);
        setError('Could not load your messages. Pull to refresh or try again shortly.');
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadConversations().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadConversations]);

  // Live updates: bump the relevant conversation to the top with the new
  // last-message preview and an incremented unread count, without a full
  // page refetch.
  useEffect(() => {
    const socket = connectSocket();

    const handleNewMessage = (msg) => {
      const msgConvId = idOf(msg.conversation);
      if (!msgConvId) return;

      setConversations((prev) => {
        const idx = prev.findIndex((c) => c._id === msgConvId);
        if (idx === -1) {
          // Message in a conversation not yet in our list (e.g. just
          // created elsewhere) — do a full refresh to pick it up.
          loadConversations();
          return prev;
        }

        const updated = { ...prev[idx] };
        updated.lastMessage = { text: msg.text, sender: idOf(msg.sender), sentAt: msg.createdAt };

        const senderId = idOf(msg.sender);
        const isOwnMessage = senderId && user?._id && senderId === user._id;
        if (!isOwnMessage) {
          const isPassenger = idOf(updated.passenger) === user?._id;
          const key = isPassenger ? 'passenger' : 'driver';
          updated.unreadCount = {
            ...updated.unreadCount,
            [key]: (updated.unreadCount?.[key] || 0) + 1,
          };
        }

        const next = [...prev];
        next.splice(idx, 1);
        return [updated, ...next];
      });
    };

    socket.on('message:new', handleNewMessage);
    return () => socket.off('message:new', handleNewMessage);
  }, [loadConversations, user?._id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Messages</h1>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {conversations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <Icon name="MessageCircle" size="xl" className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No conversations yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Messages with drivers or passengers will show up here once you chat or negotiate on a ride.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => {
              const isPassenger = idOf(conv.passenger) === user?._id;
              const other = isPassenger ? conv.driver : conv.passenger;
              const unread = (isPassenger ? conv.unreadCount?.passenger : conv.unreadCount?.driver) || 0;
              const name = (typeof other === 'object' && other?.name) || (isPassenger ? 'Driver' : 'Passenger');

              return (
                <button
                  key={conv._id}
                  onClick={() => navigate(`/messages/${conv._id}`, { state: { negotiationId: conv.negotiationId || null } })}
                  className="w-full bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all p-4 flex items-center gap-3 text-left"
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                      <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(conv.lastMessage?.sentAt)}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {conv.ride ? `${conv.ride.start} → ${conv.ride.end}` : 'Ride'}
                      {conv.negotiationId && (
                        <span className="ml-2 inline-flex items-center gap-1 text-indigo-600 font-semibold">
                          <Icon name="IndianRupee" size="xs" /> Negotiating
                        </span>
                      )}
                    </p>
                    {conv.lastMessage?.text && (
                      <p className="text-sm text-gray-600 truncate mt-1">{conv.lastMessage.text}</p>
                    )}
                  </div>
                  {unread > 0 && (
                    <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}