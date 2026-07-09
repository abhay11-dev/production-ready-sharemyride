// src/pages/Chat/ChatThread.jsx
//
// MILESTONE 4 (frontend) — the actual chat screen. Uses hooks/useChat.js for
// message history + live delivery, and layers an inline negotiation summary
// panel on top when this conversation has an attached Negotiation
// (Milestone 3) — accept/reject/finalize happen right here rather than
// sending the user to a separate screen, per PROJECT_STATE.md §8 step 4
// ("could literally reuse the chat UI once that exists").

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat';
import {
  getNegotiationById,
  acceptNegotiation,
  rejectNegotiation,
  finalizeNegotiation,
} from '../../services/negotiationService';
import Icon from '../../components/ui/Icon';
import toastService from '../../services/toastService';

function idOf(ref) {
  if (!ref) return null;
  return typeof ref === 'object' ? ref._id : ref;
}

function MessageBubble({ message, isOwn }) {
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-3">
        <span className="text-xs text-center text-gray-500 bg-gray-100 rounded-full px-3 py-1.5 max-w-[85%]">
          {message.text}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
          isOwn ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        <p className={`text-[10px] mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-400'}`}>
          {message.createdAt
            ? new Date(message.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            : 'sending…'}
        </p>
      </div>
    </div>
  );
}

function NegotiationPanel({ negotiation, userId, onRefresh }) {
  const [busy, setBusy] = useState(false);
  if (!negotiation) return null;

  const isDriver = idOf(negotiation.driver) === userId;
  const terms = negotiation.currentTerms || {};

  const runAction = async (actionFn, successMsg) => {
    setBusy(true);
    try {
      await actionFn(negotiation._id);
      toastService.success(successMsg);
      await onRefresh();
    } catch (err) {
      toastService.error(err.response?.data?.message || 'That action failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const statusColors = {
    pending: 'bg-amber-50 border-amber-100 text-amber-800',
    countered: 'bg-amber-50 border-amber-100 text-amber-800',
    accepted: 'bg-blue-50 border-blue-100 text-blue-800',
    finalized: 'bg-green-50 border-green-100 text-green-800',
    rejected: 'bg-red-50 border-red-100 text-red-700',
    cancelled: 'bg-gray-50 border-gray-100 text-gray-600',
    expired: 'bg-gray-50 border-gray-100 text-gray-600',
  };

  return (
    <div className={`border-b px-4 py-3 ${statusColors[negotiation.status] || statusColors.pending}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
          <Icon name="IndianRupee" size="xs" />
          Negotiation · {negotiation.status}
        </p>
        {terms.fare != null && <p className="text-sm font-bold">₹{terms.fare}</p>}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-90 mb-2">
        {terms.pickupLocation && <span>Pickup: {terms.pickupLocation}</span>}
        {terms.dropLocation && <span>Drop: {terms.dropLocation}</span>}
        {terms.seats && <span>{terms.seats} seat{terms.seats > 1 ? 's' : ''}</span>}
      </div>

      {['pending', 'countered'].includes(negotiation.status) && (
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={() => runAction(acceptNegotiation, 'Terms accepted')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Accept
          </button>
          <button
            disabled={busy}
            onClick={() => runAction(rejectNegotiation, 'Negotiation declined')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white text-red-700 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            Decline
          </button>
        </div>
      )}

      {negotiation.status === 'accepted' && isDriver && (
        <button
          disabled={busy}
          onClick={() => runAction(finalizeNegotiation, 'Booking created')}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Finalize into booking
        </button>
      )}
      {negotiation.status === 'accepted' && !isDriver && (
        <p className="text-xs opacity-80">Waiting for the driver to finalize the booking.</p>
      )}
      {negotiation.status === 'finalized' && (
        <p className="text-xs font-semibold flex items-center gap-1">
          <Icon name="CheckCircle" size="xs" /> Booking confirmed
        </p>
      )}
    </div>
  );
}

export default function ChatThread() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const {
    messages, loading, sending, typingUser, hasMore,
    loadMore, sendMessage, startTyping, stopTyping, markRead,
  } = useChat(conversationId);

  const [text, setText] = useState('');
  const [negotiation, setNegotiation] = useState(null);
  const bottomRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const typingTimerRef = useRef(null);

  const refreshNegotiation = useCallback(async () => {
    const negId = negotiation?._id || location.state?.negotiationId;
    if (!negId) return;
    try {
      const data = await getNegotiationById(negId);
      setNegotiation(data);
    } catch (err) {
      console.error('❌ Failed to load negotiation:', err.message);
    }
  }, [negotiation?._id, location.state?.negotiationId]);

  // Load the negotiation summary if one was passed via navigation state
  // (set by NegotiationActions after initiating, or by Inbox when the
  // conversation already had one attached).
  useEffect(() => {
    const negId = location.state?.negotiationId;
    if (negId) {
      getNegotiationById(negId).then(setNegotiation).catch(() => {});
    } else {
      setNegotiation(null);
    }
  }, [conversationId, location.state?.negotiationId]);

  // Mark read once history has loaded and whenever new messages arrive
  // while this screen is open.
  useEffect(() => {
    if (!loading) markRead();
  }, [loading, messages.length, markRead]);

  // Auto-scroll to bottom on new messages (not on load-more, which prepends)
  const prevLengthRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    return () => {
      stopTyping();
      clearTimeout(typingTimerRef.current);
    };
  }, [stopTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText('');
    stopTyping();
    clearTimeout(typingTimerRef.current);
    try {
      await sendMessage(trimmed);
    } catch (err) {
      toastService.error('Message failed to send. Please try again.');
      setText(trimmed);
    }
  };

  const handleInputChange = (e) => {
    setText(e.target.value);
    startTyping();
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(stopTyping, 2000);
  };

  const typingLabel = typingUser && typingUser !== user?._id ? 'Typing…' : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
        <button
          onClick={() => navigate('/messages')}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Icon name="ChevronLeft" size="button" />
        </button>
        <p className="font-bold text-gray-900">Conversation</p>
      </div>

      {/* Negotiation summary, if any */}
      <NegotiationPanel negotiation={negotiation} userId={user?._id} onRefresh={refreshNegotiation} />

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 max-w-2xl w-full mx-auto">
        {hasMore && (
          <button
            onClick={loadMore}
            className="block mx-auto mb-4 text-xs font-semibold text-blue-600 hover:underline"
          >
            Load earlier messages
          </button>
        )}

        {loading ? (
          <div className="text-center text-gray-400 text-sm py-10">Loading conversation…</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-10">Say hello 👋</div>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m._id} message={m} isOwn={idOf(m.sender) === user?._id} />
          ))
        )}

        {typingLabel && <p className="text-xs text-gray-400 italic px-2">{typingLabel}</p>}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="bg-white border-t border-gray-100 p-3 flex items-center gap-2 sticky bottom-0 max-w-2xl w-full mx-auto">
        <input
          value={text}
          onChange={handleInputChange}
          placeholder="Type a message…"
          maxLength={1000}
          disabled={sending}
          className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-colors"
        >
          <Icon name="ArrowRight" size="button" className="text-white" />
        </button>
      </form>
    </div>
  );
}