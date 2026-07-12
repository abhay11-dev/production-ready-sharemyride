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
  const [filter, setFilter] = useState('all');

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

  const roleUnread = useCallback((conv) => {
    const isPassenger = idOf(conv.passenger) === user?._id;
    return (isPassenger ? conv.unreadCount?.passenger : conv.unreadCount?.driver) || 0;
  }, [user?._id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading your messages…</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: conversations.length,
    unread: conversations.reduce((sum, c) => sum + roleUnread(c), 0),
    negotiating: conversations.filter((c) => c.negotiationId).length,
  };

  const FILTERS = [
    { id: 'all', label: 'All', count: stats.total },
    { id: 'unread', label: 'Unread', count: stats.unread },
    { id: 'negotiating', label: 'Negotiating', count: stats.negotiating },
  ];

  const filteredConversations = conversations.filter((conv) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return roleUnread(conv) > 0;
    if (filter === 'negotiating') return !!conv.negotiationId;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── HEADER (gradient banner — matches Home / MyBookings) ── */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 pt-6 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Icon name="MessageCircle" size="sm" className="text-white" />
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-white leading-tight">Messages</h1>
          </div>
          <p className="text-blue-100 text-xs sm:text-sm ml-0.5">
            Chat with drivers and passengers from your rides — updates live while you're here
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16">

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900' },
            { label: 'Unread', value: stats.unread, color: 'text-blue-600' },
            { label: 'Negotiating', value: stats.negotiating, color: 'text-indigo-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 text-center">
              <p className={`text-lg sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="grid grid-cols-3 gap-3 mb-6 bg-white rounded-3xl border border-gray-100 p-4 shadow-sm">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`w-full rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                filter === f.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                  : 'text-gray-600 bg-gray-50 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {f.label}
              {f.count > 0 && (
                <span className={`text-[10px] px-1.5 rounded-full ${filter === f.id ? 'bg-white/25' : 'bg-gray-200 text-gray-600'}`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Empty state ── */}
        {filteredConversations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 sm:p-12 text-center">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="MessageCircle" size="lg" className="text-gray-400" />
            </div>
            <p className="font-semibold text-gray-900 mb-1">
              No {filter !== 'all' ? filter : ''} conversations {filter === 'all' ? 'yet' : 'found'}
            </p>
            <p className="text-sm text-gray-500">
              Messages with drivers or passengers will show up here once you chat or negotiate on a ride.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            {filteredConversations.map((conv) => {
              const isPassenger = idOf(conv.passenger) === user?._id;
              const other = isPassenger ? conv.driver : conv.passenger;
              const unread = roleUnread(conv);
              const name = (typeof other === 'object' && other?.name) || (isPassenger ? 'Driver' : 'Passenger');

              return (
                <button
                  key={conv._id}
                  onClick={() => navigate(`/messages/${conv._id}`, { state: { negotiationId: conv.negotiationId || null } })}
                  className="w-full bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50/60 transition-all duration-200 p-4 sm:p-5 flex items-center gap-3 text-left"
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
                    <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-bold flex items-center justify-center">
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