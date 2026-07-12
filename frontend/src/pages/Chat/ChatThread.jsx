// src/pages/Chat/ChatThread.jsx
//
// MILESTONE 4 (frontend) — the actual chat screen. Uses hooks/useChat.js for
// message history + live delivery, and layers an inline negotiation summary
// panel on top when this conversation has an attached Negotiation
// (Milestone 3) — accept/reject/finalize happen right here rather than
// sending the user to a separate screen, per PROJECT_STATE.md §8 step 4
// ("could literally reuse the chat UI once that exists").
//
// UI/UX pass v2: rebuilt as a proper fixed-viewport chat surface (the way
// WhatsApp/Messenger/Slack do it) instead of a scrolling page with a chat
// card floating in it. That earlier layout was the source of the "typing
// pushes the page down" bug — the whole document could scroll, and
// scrollIntoView() was chasing the window instead of the message list, so
// every render fought the user's own scroll position. Now:
//   • the page itself never scrolls — html/body height is fixed to the
//     viewport (h-dvh, with a h-screen fallback for older browsers)
//   • only the message list scrolls, via an internal ref + scrollTop
//     (no scrollIntoView, so nothing outside the list ever moves)
//   • header and composer are pinned (flex-shrink-0) and stay put while
//     the keyboard opens/closes on mobile
// Visual language brought in line with MyBookings.jsx: same gradient
// banner, rounded-2xl cards, badge conventions, icon-led hierarchy, and
// button/spacing rhythm — so Chat no longer feels like a different app
// bolted onto the rest of ShareMyRide. No hooks, handlers, or data flow
// were changed.

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

// Same badge convention as MyBookings' STATUS_STYLE map — bg-x-50 /
// text-x-700 / border-x-200 — so a "status chip" reads the same everywhere
// in the product, whether it's a booking or a negotiation.
const NEGOTIATION_STATUS = {
  pending: { badge: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-400', icon: 'Clock', label: 'Pending' },
  countered: { badge: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-400', icon: 'RefreshCw', label: 'Countered' },
  accepted: { badge: 'bg-green-50 text-green-700 border border-green-200', dot: 'bg-green-500', icon: 'CheckCircle', label: 'Accepted' },
  finalized: { badge: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-500', icon: 'CheckCircle', label: 'Finalized' },
  rejected: { badge: 'bg-red-50 text-red-700 border border-red-200', dot: 'bg-red-500', icon: 'XCircle', label: 'Declined' },
  cancelled: { badge: 'bg-gray-100 text-gray-600 border border-gray-200', dot: 'bg-gray-400', icon: 'Slash', label: 'Cancelled' },
  expired: { badge: 'bg-gray-100 text-gray-600 border border-gray-200', dot: 'bg-gray-400', icon: 'Slash', label: 'Expired' },
};

function MessageBubble({ message, isOwn }) {
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-3">
        <span className="text-xs text-center text-gray-500 bg-gray-100 rounded-full px-3 py-1.5 max-w-[85%] flex items-center gap-1.5">
          <Icon name="Info" size="xs" className="text-gray-400 flex-shrink-0" />
          {message.text}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
          isOwn
            ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-br-sm'
            : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        <p className={`text-[10px] mt-1 flex items-center gap-1 ${isOwn ? 'text-blue-100 justify-end' : 'text-gray-400'}`}>
          {message.createdAt
            ? new Date(message.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            : (
              <span className="inline-flex items-center gap-1">
                <Icon name="Clock" size="xs" /> sending…
              </span>
            )}
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
  const style = NEGOTIATION_STATUS[negotiation.status] || NEGOTIATION_STATUS.pending;

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

  return (
    <div className="flex-shrink-0 px-4 sm:px-5 pt-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3.5 gap-2">
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${style.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse`} />
            <Icon name={style.icon} size="xs" />
            {style.label}
          </span>
          {terms.fare != null && (
            <span className="bg-blue-50 rounded-xl px-3 py-1.5 text-right">
              <span className="block text-[10px] text-blue-500 leading-none mb-0.5">Fare</span>
              <span className="font-bold text-blue-700 text-sm flex items-center gap-0.5 justify-end">
                <Icon name="IndianRupee" size="xs" />
                {terms.fare}
              </span>
            </span>
          )}
        </div>

        {/* Route — same gradient route box treatment as MyBookings */}
        {(terms.pickupLocation || terms.dropLocation) && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3.5 mb-3.5">
            {terms.pickupLocation && (
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                <p className="font-semibold text-gray-900 text-sm truncate">{terms.pickupLocation}</p>
              </div>
            )}
            {terms.pickupLocation && terms.dropLocation && (
              <div className="ml-[3px] border-l-2 border-dashed border-gray-300 h-2.5 my-0.5" />
            )}
            {terms.dropLocation && (
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <p className="font-semibold text-gray-900 text-sm truncate">{terms.dropLocation}</p>
              </div>
            )}
            {terms.seats && (
              <div className="mt-2.5 pt-2.5 border-t border-blue-100 flex items-center gap-1.5 text-xs text-gray-500">
                <Icon name="Users" size="xs" />
                {terms.seats} seat{terms.seats > 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {/* Actions / status messages — button rhythm matches MyBookings */}
        {['pending', 'countered'].includes(negotiation.status) && (
          <div className="flex gap-2.5 flex-wrap">
            <button
              disabled={busy}
              onClick={() => runAction(acceptNegotiation, 'Terms accepted')}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Icon name="Check" size="xs" />
              Accept
            </button>
            <button
              disabled={busy}
              onClick={() => runAction(rejectNegotiation, 'Negotiation declined')}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
            >
              <Icon name="X" size="xs" />
              Decline
            </button>
          </div>
        )}

        {negotiation.status === 'accepted' && isDriver && (
          <button
            disabled={busy}
            onClick={() => runAction(finalizeNegotiation, 'Booking created')}
            className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Icon name="Ticket" size="xs" />
            Finalize into booking
          </button>
        )}
        {negotiation.status === 'accepted' && !isDriver && (
          <div className="bg-amber-50 rounded-xl p-3 flex items-center gap-1.5">
            <Icon name="Clock" size="xs" className="text-amber-600 flex-shrink-0" />
            <p className="text-xs font-medium text-amber-800">Waiting for the driver to finalize the booking.</p>
          </div>
        )}
        {negotiation.status === 'finalized' && (
          <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-1.5">
            <Icon name="CheckCircle" size="xs" className="text-blue-600 flex-shrink-0" />
            <p className="text-xs font-semibold text-blue-800">Booking confirmed 🎉</p>
          </div>
        )}
      </div>
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

  // Auto-scroll to bottom on new messages (not on load-more, which
  // prepends older messages above the current view).
  //
  // IMPORTANT: this scrolls the message-list container directly via
  // scrollTop, never scrollIntoView(). scrollIntoView() walks up the DOM
  // and can scroll *any* scrollable ancestor — including the page itself —
  // which is exactly what caused the "typing shoves the whole page down"
  // bug. Since the page no longer scrolls at all (see the outer h-dvh
  // wrapper below), only this container should ever move.
  const prevLengthRef = useRef(0);
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isNewMessage = messages.length > prevLengthRef.current;
    prevLengthRef.current = messages.length;
    if (!isNewMessage) return;

    // Only auto-scroll if the user is already near the bottom, so someone
    // scrolled up to read history isn't yanked back down by a new message.
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 240) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
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
      // Sending is always "my" action — snap to bottom regardless of
      // current scroll position.
      requestAnimationFrame(() => {
        const el = scrollContainerRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      });
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
    // Fixed to the viewport — the page itself never scrolls. h-dvh (dynamic
    // viewport height) keeps this accurate on mobile when the browser chrome
    // or keyboard resizes the visible area; h-screen is there as a fallback
    // for browsers that don't support dvh yet.
    <div className="h-screen h-dvh flex flex-col bg-gray-50 overflow-hidden">
      {/* Header — same gradient banner used on Home / MyBookings */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 px-4 sm:px-6 lg:px-8 py-4 shadow-sm z-20">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/messages')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 transition-colors flex-shrink-0"
          >
            <Icon name="ChevronLeft" size="button" className="text-white" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <Icon name="MessageCircle" size="md" className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-white leading-tight truncate">Conversation</p>
            <p className="text-blue-100 text-[11px] flex items-center gap-1 h-4">
              {typingLabel ? (
                <span className="italic">{typingLabel}</span>
              ) : (
                <span>Chat with your driver or passenger</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Negotiation summary, if any — pinned below the header, above the
          scrolling message list, so it stays visible while chatting. */}
      <div className="flex-shrink-0 max-w-3xl w-full mx-auto">
        <NegotiationPanel negotiation={negotiation} userId={user?._id} onRefresh={refreshNegotiation} />
      </div>

      {/* Messages — the ONLY scrollable region on this screen */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-5 py-5">
          {hasMore && (
            <button
              onClick={loadMore}
              className="mx-auto mb-4 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white border border-gray-100 rounded-full px-3.5 py-1.5 shadow-sm hover:shadow transition-all"
            >
              <Icon name="ChevronUp" size="xs" />
              Load earlier messages
            </button>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading conversation…</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center">
                <Icon name="MessageCircle" size="lg" className="text-blue-400" />
              </div>
              <p className="font-semibold text-gray-900 text-sm">Say hello 👋</p>
              <p className="text-xs text-gray-400 max-w-[220px]">
                Start the conversation — coordinate pickup, timing, or anything else about the ride.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <MessageBubble key={m._id} message={m} isOwn={idOf(m.sender) === user?._id} />
            ))
          )}

          {typingLabel && (
            <p className="text-xs text-gray-400 italic px-2 flex items-center gap-1.5">
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" />
              </span>
              {typingLabel}
            </p>
          )}
        </div>
      </div>

      {/* Composer — pinned to the bottom, never moves when the message
          list scrolls or the mobile keyboard opens. */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 sm:px-5 py-3 sm:py-4">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto flex items-center gap-2">
          <input
            value={text}
            onChange={handleInputChange}
            placeholder="Type a message…"
            maxLength={1000}
            disabled={sending}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-60 transition-shadow"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white disabled:opacity-40 transition-all shadow-sm"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Icon name="ArrowRight" size="button" className="text-white" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}