// src/pages/Chat/ChatThread.jsx


import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat';
import {
  getNegotiationById,
  getMyNegotiations,
  acceptNegotiation,
  rejectNegotiation,
  finalizeNegotiation,
  counterOffer,
  initiateNegotiation,
  raiseDispute
} from '../../services/negotiationService';
import {
  getConversationById,
  getConversationSummary,
} from '../../services/chatService';
import Icon from '../../components/ui/Icon';
import toastService from '../../services/toastService';
import { buildNegotiationResponseMessage, buildPreferencePrefillMessage, buildPrefillMessage } from '../../utils/negotiationActions';

function idOf(ref) {
  if (!ref) return null;
  return typeof ref === 'object' ? ref._id : ref;
}

// ─── Preference status cards ────────────────────────────────────────────
// Every card is always shown (not filtered), so a passenger can see the
// ride's current stance on each preference at a glance and start a
// conversation about any of them. Clicking a card ONLY prefills the
// composer with the editable message below — nothing is ever auto-sent.
const PREFERENCE_CARD_DEFS = [
  { key: 'smokingAllowed', negotiationKey: 'smoking', icon: 'Cigarette', label: 'Smoking', isAllowed: (ride) => ride?.preferences?.smokingAllowed === true },
  { key: 'musicAllowed', negotiationKey: 'music', icon: 'Music', label: 'Music', isAllowed: (ride) => ride?.preferences?.musicAllowed === true },
  { key: 'petFriendly', negotiationKey: 'pets', icon: 'PawPrint', label: 'Pets', isAllowed: (ride) => ride?.preferences?.petFriendly === true },
  { key: 'luggageAllowed', negotiationKey: 'luggage', icon: 'Briefcase', label: 'Luggage', isAllowed: (ride) => ride?.preferences?.luggageAllowed !== false },
  { key: 'womenOnly', negotiationKey: 'womenOnly', icon: 'UserRound', label: 'Women Only', isAllowed: (ride) => ride?.preferences?.womenOnly === true },
  { key: 'talkative', negotiationKey: 'talkative', icon: 'MessagesSquare', label: 'Talkative', isAllowed: (ride) => ride?.preferences?.talkative === true },
  { key: 'childSeatAvailable', negotiationKey: 'childSeat', icon: 'Baby', label: 'Child Seat', isAllowed: (ride) => ride?.preferences?.childSeatAvailable === true },
  { key: 'pickupFlexibility', negotiationKey: 'flexiblePickup', icon: 'MapPinned', label: 'Flexible Pickup', isAllowed: (ride) => ride?.preferences?.pickupFlexibility === true },
];

function getPreferenceCards(ride) {
  if (!ride) return [];
  return PREFERENCE_CARD_DEFS.map((def) => {
    const allowed = def.isAllowed(ride);
    return {
      ...def,
      allowed,
      prefill: buildPreferencePrefillMessage(def.negotiationKey, !allowed),
    };
  });
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

const NEGOTIATION_SOURCE_LABELS = {
  negotiate_fare: 'Fare negotiation',
  request_partial: 'Partial route request',
  discuss_pickup: 'Pickup point discussion',
  discuss_drop: 'Drop point discussion',
  chat: 'Negotiation',
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
        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${isOwn
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

// ─── Negotiation Guide Panel ────────────────────────────────────────────
// Static explainer, collapsed by default after first view within this
// session (component-local state only — intentionally not persisted, so it
// reappears each time the thread is opened fresh, which is fine for a
// short explainer card).
function NegotiationGuidePanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Icon name="Handshake" size="sm" className="text-indigo-500" />
          How negotiation works
        </span>
        <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size="xs" className="text-gray-400" />
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-gray-600 space-y-2.5">
          <p>You can negotiate:</p>
          <div className="flex flex-wrap gap-1.5">
            {['Price', 'Partial route', 'Pickup', 'Drop', 'Seats', 'Preferences'].map((item) => (
              <span key={item} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
                {item}
              </span>
            ))}
          </div>
          <p className="pt-1 text-gray-500">Once both parties agree, the driver can finalize the negotiation into a confirmed booking.</p>
        </div>
      )}
    </div>
  );
}

// ─── Conversation Safety Card ───────────────────────────────────────────
// Permanent notice — always visible, collapsible only for the detailed
// list so it doesn't dominate the screen on repeat visits.
function ConversationSafetyCard() {
  const [expanded, setExpanded] = useState(false);
  const AVOID_ITEMS = [
    'Sharing phone numbers', 'Sharing WhatsApp numbers', 'Asking users to leave the platform',
    'Offering direct payments', 'Fake promises', 'Harassment', 'Abuse', 'Threats', 'Misleading behaviour',
  ];

  return (
    <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-amber-800">
          <Icon name="ShieldAlert" size="sm" className="text-amber-600 flex-shrink-0" />
          Chats are monitored using AI for safety. Violations may be reviewed by administrators.
        </span>
        <Icon name={expanded ? 'ChevronUp' : 'ChevronDown'} size="xs" className="text-amber-500 flex-shrink-0" />
      </button>
      {expanded && (
        <div className="mt-2.5 pt-2.5 border-t border-amber-200/60">
          <p className="text-xs font-semibold text-amber-800 mb-1.5">Please avoid:</p>
          <div className="flex flex-wrap gap-1.5">
            {AVOID_ITEMS.map((item) => (
              <span key={item} className="text-[11px] font-medium px-2 py-1 rounded-full bg-white/70 text-amber-800 border border-amber-200/60">
                {item}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-amber-700 mt-2">Unsafe behaviour may lead to account action, including a warning, suspension, block, or removal.</p>
        </div>
      )}
    </div>
  );
}

function AiSummaryPanel({ conversationId, refreshToken }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    getConversationSummary(conversationId)
      .then((data) => { if (!cancelled) setSummary(data); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [conversationId, refreshToken]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-2">
          <Icon name="Sparkles" size="sm" className="text-blue-500" />
          AI Conversation Summary
        </p>
        <div className="h-3 bg-gray-100 rounded-full animate-pulse w-3/4 mb-1.5" />
        <div className="h-3 bg-gray-100 rounded-full animate-pulse w-1/2" />
      </div>
    );
  }

  if (error || !summary) return null;

  const rows = [];
  if (summary.agreedFare != null) rows.push({ icon: 'IndianRupee', label: 'Fare', value: `₹${summary.agreedFare} per seat` });
  if (summary.reservedSeats != null) rows.push({ icon: 'Users', label: 'Seats', value: `${summary.reservedSeats}` });
  if (summary.pickup) rows.push({ icon: 'MapPin', label: 'Pickup', value: summary.pickup });
  if (summary.drop) rows.push({ icon: 'MapPinOff', label: 'Drop', value: summary.drop });
  if (summary.partialRoute) rows.push({ icon: 'Route', label: 'Partial route', value: summary.partialRoute });

  const hasAnything = rows.length || summary.acceptedPreferences?.length || summary.rejectedPreferences?.length
    || summary.driverConditions?.length || summary.passengerConditions?.length || summary.specialAgreements?.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-2.5">
        <Icon name="Sparkles" size="sm" className="text-blue-500" />
        AI Conversation Summary
      </p>

      {summary.summary && (
        <p className="text-xs text-gray-500 mb-2.5 leading-relaxed">{summary.summary}</p>
      )}

      {!hasAnything ? (
        <p className="text-xs text-gray-400">Nothing agreed yet — updates automatically as you negotiate.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-2 text-xs">
              <Icon name={row.icon} size="xs" className="text-gray-400 flex-shrink-0" />
              <span className="text-gray-500">{row.label}:</span>
              <span className="font-semibold text-gray-800">{row.value}</span>
            </div>
          ))}
          {(summary.acceptedPreferences || []).map((label) => (
            <div key={`accepted-${label}`} className="flex items-center gap-2 text-xs">
              <Icon name="CheckCircle2" size="xs" className="text-green-500 flex-shrink-0" />
              <span className="text-gray-500">Preference accepted:</span>
              <span className="font-semibold text-gray-800">{label}</span>
            </div>
          ))}
          {(summary.rejectedPreferences || []).map((label) => (
            <div key={`rejected-${label}`} className="flex items-center gap-2 text-xs">
              <Icon name="XCircle" size="xs" className="text-red-500 flex-shrink-0" />
              <span className="text-gray-500">Preference declined:</span>
              <span className="font-semibold text-gray-800">{label}</span>
            </div>
          ))}
          {(summary.driverConditions || []).map((cond, i) => (
            <div key={`driver-cond-${i}`} className="flex items-center gap-2 text-xs">
              <Icon name="Info" size="xs" className="text-blue-400 flex-shrink-0" />
              <span className="text-gray-500">Driver condition:</span>
              <span className="font-semibold text-gray-800">{cond}</span>
            </div>
          ))}
          {(summary.passengerConditions || []).map((cond, i) => (
            <div key={`passenger-cond-${i}`} className="flex items-center gap-2 text-xs">
              <Icon name="Info" size="xs" className="text-indigo-400 flex-shrink-0" />
              <span className="text-gray-500">Passenger condition:</span>
              <span className="font-semibold text-gray-800">{cond}</span>
            </div>
          ))}
          {(summary.specialAgreements || []).map((agr, i) => (
            <div key={`agreement-${i}`} className="flex items-center gap-2 text-xs">
              <Icon name="Handshake" size="xs" className="text-amber-500 flex-shrink-0" />
              <span className="text-gray-500">Special agreement:</span>
              <span className="font-semibold text-gray-800">{agr}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Driver Quick Reply UX — Counter Offer modal ───────────────────────
function CounterOfferModal({ currentFare, onSubmit, onClose, busy }) {
  const [value, setValue] = useState(currentFare ?? '');

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed <= 0) {
      toastService.error('Enter a valid counter-offer amount.');
      return;
    }
    onSubmit(parsed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 px-5 py-3.5 rounded-t-2xl flex items-center justify-between">
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <Icon name="RefreshCw" size="sm" className="text-white" />
            Counter Offer
          </h3>
          <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 text-white">
            <Icon name="X" size="xs" className="text-white" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <label className="block text-xs font-semibold text-gray-700">Your counter fare (₹ per seat)</label>
          <input
            type="number" min="1" step="1" value={value} autoFocus disabled={busy}
            onChange={(e) => setValue(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={busy} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {busy ? 'Sending…' : 'Send counter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Compact pinned negotiation banner ─────────────────────────────────
function NegotiationPanel({ negotiation, userId, onRefresh, onSendCannedMessage }) {
  const [busy, setBusy] = useState(false);
  const [counterOpen, setCounterOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);

  if (!negotiation) return null;

  const isDriver = idOf(negotiation.driver) === userId;
  const terms = negotiation.currentTerms || {};
  const style = NEGOTIATION_STATUS[negotiation.status] || NEGOTIATION_STATUS.pending;
  const sourceLabel = NEGOTIATION_SOURCE_LABELS[negotiation.source] || 'Negotiation';

  const lastProposal = negotiation.proposals?.[negotiation.proposals.length - 1];
  const myRole = isDriver ? 'driver' : 'passenger';
  const isMyTurn = !lastProposal || lastProposal.proposedBy !== myRole;

  // A rejected/cancelled/expired negotiation without a finalized booking can
  // be reopened by either side sending a fresh counter-offer.
  const canReopen = ['rejected', 'cancelled', 'expired'].includes(negotiation.status)
    && !negotiation.finalizedBookingId;

  const runAction = async (actionFn, successMsg, cannedKind) => {
    setBusy(true);
    try {
      await actionFn(negotiation._id);
      if (cannedKind && onSendCannedMessage) {
        const text = buildNegotiationResponseMessage(negotiation.source, cannedKind, terms);
        onSendCannedMessage(text).catch((err) => console.error('❌ Failed to send canned reply:', err.message));
      }
      toastService.success(successMsg);
      await onRefresh();
    } catch (err) {
      toastService.error(err.response?.data?.message || 'That action failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleCounterSubmit = async (counterFare) => {
    setBusy(true);
    try {
      await counterOffer(negotiation._id, { fare: counterFare });
      setCounterOpen(false);
      toastService.success(canReopen ? 'Negotiation reopened with a new offer' : 'Counter offer sent');
      await onRefresh();
    } catch (err) {
      toastService.error(err.response?.data?.message || 'Could not send that counter-offer.');
    } finally {
      setBusy(false);
    }
  };

  const handleDisputeSubmit = async (reason) => {
    setBusy(true);
    try {
      await raiseDispute(negotiation._id, reason);
      toastService.success('Dispute raised — our team will review this conversation.');
      setDisputeOpen(false);
      await onRefresh();
    } catch (err) {
      toastService.error(err.response?.data?.message || 'Could not raise a dispute right now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-indigo-50/50 border-b border-indigo-100 px-4 py-2 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide flex items-center gap-1">
            <Icon name={style.icon} size="xs" className="text-indigo-600" />
            {sourceLabel} <span className="text-gray-400 font-medium lowercase">— {style.label}</span>
          </span>
          {terms.fare != null && (
            <span className="text-xs font-semibold text-gray-700 mt-0.5">
              Proposed Fare: <span className="text-indigo-700">₹{terms.fare}</span>
              {terms.seats && <span className="text-gray-500 font-normal ml-1">({terms.seats} seats)</span>}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {negotiation.disputed && (
            <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
              <Icon name="AlertTriangle" size="xs" /> Disputed
            </span>
          )}
          {['pending', 'countered'].includes(negotiation.status) && (
            <button
              type="button"
              onClick={() => runAction(cancelNegotiation, 'Negotiation ended')}
              className="text-[10px] text-gray-500 hover:text-red-600 transition-colors font-semibold flex items-center gap-1"
            >
              <Icon name="XCircle" size="xs" /> End
            </button>
          )}
          {!negotiation.disputed && ['pending', 'countered', 'accepted', 'finalized'].includes(negotiation.status) && (
            <button
              type="button"
              onClick={() => setDisputeOpen(true)}
              className="text-[10px] text-gray-400 hover:text-amber-600 transition-colors font-semibold flex items-center gap-1"
            >
              <Icon name="Flag" size="xs" /> Dispute
            </button>
          )}
        </div>
      </div>

      {terms.seats && (
        <div className="pt-1 border-t border-indigo-100 flex items-center gap-1.5 text-xs text-gray-500">
          <Icon name="Users" size="xs" />
          {terms.seats} seat{terms.seats > 1 ? 's' : ''}
        </div>
      )}

      {['pending', 'countered'].includes(negotiation.status) && (
        isMyTurn ? (
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={() => runAction(acceptNegotiation, 'Terms accepted', 'accept')}
              className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Icon name="Check" size="xs" /> Yes
            </button>
            <button
              disabled={busy}
              onClick={() => runAction(rejectNegotiation, 'Negotiation declined', 'decline')}
              className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
            >
              <Icon name="X" size="xs" /> No
            </button>
            {negotiation.source === 'negotiate_fare' && (
              <button
                disabled={busy}
                onClick={() => setCounterOpen(true)}
                className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <Icon name="RefreshCw" size="xs" /> Counter
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white/60 border border-amber-100 rounded-lg px-3 py-1.5 flex items-center justify-center gap-1.5">
            <Icon name="Clock" size="xs" className="text-amber-600 flex-shrink-0" />
            <p className="text-[10px] font-medium text-amber-800">Waiting for a reply...</p>
          </div>
        )
      )}

      {negotiation.status === 'accepted' && isDriver && (
        <button
          disabled={busy}
          onClick={() => runAction(finalizeNegotiation, 'Booking created')}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <Icon name="Ticket" size="xs" />
          Negotiation Done - Book Ride
        </button>
      )}
      {negotiation.status === 'accepted' && !isDriver && (
        <div className="bg-amber-50 rounded-lg p-2 flex items-center justify-center gap-1.5">
          <Icon name="Clock" size="xs" className="text-amber-600 flex-shrink-0" />
          <p className="text-[10px] font-medium text-amber-800">Waiting for driver to finalize.</p>
        </div>
      )}
      {negotiation.status === 'finalized' && (
        <div className="bg-blue-50/80 rounded-lg p-2 flex items-center justify-center gap-1.5">
          <Icon name="CheckCircle" size="xs" className="text-blue-600 flex-shrink-0" />
          <p className="text-[10px] font-bold text-blue-800">Booking confirmed 🎉</p>
        </div>
      )}

      {canReopen && (
        <button
          disabled={busy}
          onClick={() => setCounterOpen(true)}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 transition-colors"
        >
          <Icon name="RotateCcw" size="xs" />
          Reopen with a new offer
        </button>
      )}

      {counterOpen && (
        <CounterOfferModal
          currentFare={terms.fare}
          busy={busy}
          onClose={() => setCounterOpen(false)}
          onSubmit={handleCounterSubmit}
        />
      )}

      {disputeOpen && (
        <DisputeModal
          busy={busy}
          onClose={() => setDisputeOpen(false)}
          onSubmit={handleDisputeSubmit}
        />
      )}
    </div>
  );
}

// ─── Dispute modal ───────────────────────────────────────────────────────
function DisputeModal({ onSubmit, onClose, busy }) {
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toastService.error('Please describe the issue before submitting.');
      return;
    }
    onSubmit(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 px-5 py-3.5 rounded-t-2xl flex items-center justify-between">
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <Icon name="Flag" size="sm" className="text-white" />
            Raise a Dispute
          </h3>
          <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 text-white">
            <Icon name="X" size="xs" className="text-white" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <label className="block text-xs font-semibold text-gray-700">What went wrong?</label>
          <textarea
            value={reason} autoFocus disabled={busy} rows={4} maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-none"
            placeholder="Describe the issue — our support team will review this negotiation's full history."
          />
          <p className="text-[11px] text-gray-400">This negotiation will be flagged for admin review. It stays usable while under review.</p>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={busy} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="flex-1 bg-amber-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-amber-700 disabled:opacity-50">
              {busy ? 'Submitting…' : 'Submit dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

{
  ['pending', 'countered'].includes(negotiation.status) && (
    isMyTurn ? (
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={() => runAction(acceptNegotiation, 'Terms accepted', 'accept')}
          className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <Icon name="Check" size="xs" /> Yes
        </button>
        <button
          disabled={busy}
          onClick={() => runAction(rejectNegotiation, 'Negotiation declined', 'decline')}
          className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
        >
          <Icon name="X" size="xs" /> No
        </button>
        {negotiation.source === 'negotiate_fare' && (
          <button
            disabled={busy}
            onClick={() => setCounterOpen(true)}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <Icon name="RefreshCw" size="xs" /> Counter
          </button>
        )}
      </div>
    ) : (
      <div className="bg-white/60 border border-amber-100 rounded-lg px-3 py-1.5 flex items-center justify-center gap-1.5">
        <Icon name="Clock" size="xs" className="text-amber-600 flex-shrink-0" />
        <p className="text-[10px] font-medium text-amber-800">Waiting for a reply...</p>
      </div>
    )
  )
}

{
  negotiation.status === 'accepted' && isDriver && (
    <button
      disabled={busy}
      onClick={() => runAction(finalizeNegotiation, 'Booking created')}
      className="w-full flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
    >
      <Icon name="Ticket" size="xs" />
      Negotiation Done - Book Ride
    </button>
  )
}
{
  negotiation.status === 'accepted' && !isDriver && (
    <div className="bg-amber-50 rounded-lg p-2 flex items-center justify-center gap-1.5">
      <Icon name="Clock" size="xs" className="text-amber-600 flex-shrink-0" />
      <p className="text-[10px] font-medium text-amber-800">Waiting for driver to finalize.</p>
    </div>
  )
}
{
  negotiation.status === 'finalized' && (
    <div className="bg-blue-50/80 rounded-lg p-2 flex items-center justify-center gap-1.5">
      <Icon name="CheckCircle" size="xs" className="text-blue-600 flex-shrink-0" />
      <p className="text-[10px] font-bold text-blue-800">Booking confirmed 🎉</p>
    </div>
  )
}
      </div >

  { counterOpen && (
    <CounterOfferModal
      currentFare={terms.fare}
      busy={busy}
      onClose={() => setCounterOpen(false)}
      onSubmit={handleCounterSubmit}
    />
  )}
    </div >
  );
}

// ─── Negotiation action cards (left panel) ─────────────────────────────────
// One card per negotiable item. Clicking a card ONLY collects the value it
// needs (fare / pickup / drop / seats) via a small inline modal and prefills
// the composer with an editable message — nothing is sent and no
// negotiation is opened until the user actually presses Send, matching the
// preference cards' behavior exactly.
const NEGOTIATION_CARD_DEFS = [
  { source: 'negotiate_fare', icon: 'IndianRupee', label: 'Price Negotiation', description: 'Propose a different fare per seat.', field: 'fare' },
  { source: 'request_partial', icon: 'Route', label: 'Partial Route', description: 'Ask to join for only part of the route.', field: 'partial' },
  { source: 'discuss_pickup', icon: 'MapPin', label: 'Pickup Change', description: 'Suggest a different pickup point.', field: 'pickupLocation' },
  { source: 'discuss_drop', icon: 'MapPinOff', label: 'Drop Change', description: 'Suggest a different drop point.', field: 'dropLocation' },
];

function QuickNegotiateModal({ card, ride, onClose, onConfirm }) {
  const [fare, setFare] = useState(ride?.fare ?? '');
  const [pickupLocation, setPickupLocation] = useState(ride?.start || '');
  const [dropLocation, setDropLocation] = useState(ride?.end || '');
  const [seats, setSeats] = useState(1);
  const availableSeats = ride?.availableSeats ?? ride?.seats ?? 1;

  const buildFields = () => {
    if (card.field === 'fare') return { proposedFare: parseFloat(fare) };
    if (card.field === 'pickupLocation') return { pickupLocation };
    if (card.field === 'dropLocation') return { dropLocation };
    if (card.field === 'partial') return { pickupLocation, dropLocation, seats };
    return {};
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (card.field === 'fare' && (fare === '' || isNaN(parseFloat(fare)) || parseFloat(fare) <= 0)) {
      toastService.error('Enter a valid fare amount.');
      return;
    }
    const fields = buildFields();
    const message = buildPrefillMessage(card.source, {
      fare: fields.proposedFare ?? ride?.fare,
      pickupLocation: fields.pickupLocation ?? ride?.start,
      dropLocation: fields.dropLocation ?? ride?.end,
    });
    onConfirm({ source: card.source, label: card.label, message, ...fields });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 px-5 py-3.5 rounded-t-2xl flex items-center justify-between">
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <Icon name={card.icon} size="sm" className="text-white" />
            {card.label}
          </h3>
          <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 text-white">
            <Icon name="X" size="xs" className="text-white" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {card.field === 'fare' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Your proposed fare (₹ per seat)</label>
              <input
                type="number" min="1" step="1" value={fare} autoFocus
                onChange={(e) => setFare(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          )}
          {(card.field === 'pickupLocation' || card.field === 'partial') && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Preferred pickup point</label>
              <input
                type="text" value={pickupLocation} autoFocus
                onChange={(e) => setPickupLocation(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          )}
          {(card.field === 'dropLocation' || card.field === 'partial') && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Preferred drop point</label>
              <input
                type="text" value={dropLocation}
                onChange={(e) => setDropLocation(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          )}
          {card.field === 'partial' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Seats needed</label>
              <select
                value={seats}
                onChange={(e) => setSeats(parseInt(e.target.value, 10))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {Array.from({ length: Math.max(1, availableSeats) }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1} seat{i > 0 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">
              Prefill message
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NegotiationCardsPanel({ ride, onPick }) {
  const [activeCard, setActiveCard] = useState(null);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-3">
        <Icon name="Handshake" size="sm" className="text-indigo-500" />
        Negotiate
      </p>
      <div className="space-y-2">
        {NEGOTIATION_CARD_DEFS.map((card) => (
          <button
            key={card.source}
            type="button"
            onClick={() => setActiveCard(card)}
            className="w-full flex items-start gap-2.5 text-left p-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:border-indigo-300 hover:bg-white hover:shadow-sm transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Icon name={card.icon} size="xs" className="text-indigo-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800">{card.label}</p>
              <p className="text-[11px] text-gray-400 truncate">{card.description}</p>
            </div>
          </button>
        ))}
      </div>

      {activeCard && (
        <QuickNegotiateModal
          card={activeCard}
          ride={ride}
          onClose={() => setActiveCard(null)}
          onConfirm={(payload) => { onPick(payload); setActiveCard(null); }}
        />
      )}
    </div>
  );
}

// ─── Live Negotiation Status (left panel) ──────────────────────────────────
// Every negotiation thread tied to this ride between these two users —
// fare, pickup, drop, partial route, and each individual preference — shown
// as a compact status list that updates as the conversation progresses.
const LIVE_STATUS_STYLE = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  countered: { label: 'Countered', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  accepted: { label: 'Accepted', className: 'bg-green-50 text-green-700 border-green-200' },
  finalized: { label: 'Completed', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  expired: { label: 'Expired', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

function threadLabel(n) {
  if (n.source === 'preference') {
    const def = PREFERENCE_CARD_DEFS.find((p) => p.negotiationKey === n.preferenceKey);
    return def ? def.label : n.preferenceKey;
  }
  return NEGOTIATION_SOURCE_LABELS[n.source] || n.source;
}

function LiveNegotiationStatusPanel({ rideId, refreshToken }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rideId) return;
    let cancelled = false;
    setLoading(true);
    getMyNegotiations({ rideId })
      .then((data) => { if (!cancelled) setThreads(data); })
      .catch(() => { })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [rideId, refreshToken]);

  if (loading) return null;
  if (threads.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-2.5">
        <Icon name="ListChecks" size="sm" className="text-blue-500" />
        Live Negotiation Status
      </p>
      <div className="space-y-1.5">
        {threads.map((n) => {
          const style = LIVE_STATUS_STYLE[n.status] || LIVE_STATUS_STYLE.pending;
          return (
            <div key={n._id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-gray-600 truncate">{threadLabel(n)}</span>
              <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${style.className}`}>
                {style.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Ride Summary (right panel) ────────────────────────────────────────────
function RideSummaryCard({ ride }) {
  if (!ride) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-2.5">
        <Icon name="Ticket" size="sm" className="text-blue-500" />
        Ride Summary
      </p>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <Icon name="MapPin" size="xs" className="text-gray-400 flex-shrink-0" />
          <span className="text-gray-500">From:</span>
          <span className="font-semibold text-gray-800 truncate">{ride.start}</span>
        </div>
        <div className="flex items-center gap-2">
          <Icon name="MapPinOff" size="xs" className="text-gray-400 flex-shrink-0" />
          <span className="text-gray-500">To:</span>
          <span className="font-semibold text-gray-800 truncate">{ride.end}</span>
        </div>
        {ride.date && (
          <div className="flex items-center gap-2">
            <Icon name="Calendar" size="xs" className="text-gray-400 flex-shrink-0" />
            <span className="text-gray-500">Date:</span>
            <span className="font-semibold text-gray-800">{new Date(ride.date).toLocaleDateString('en-IN')}</span>
          </div>
        )}
        {ride.time && (
          <div className="flex items-center gap-2">
            <Icon name="Clock" size="xs" className="text-gray-400 flex-shrink-0" />
            <span className="text-gray-500">Time:</span>
            <span className="font-semibold text-gray-800">{ride.time}</span>
          </div>
        )}
        {ride.fare != null && (
          <div className="flex items-center gap-2">
            <Icon name="IndianRupee" size="xs" className="text-gray-400 flex-shrink-0" />
            <span className="text-gray-500">Listed fare:</span>
            <span className="font-semibold text-gray-800">₹{ride.fare} / seat</span>
          </div>
        )}
        {ride.availableSeats != null && (
          <div className="flex items-center gap-2">
            <Icon name="Users" size="xs" className="text-gray-400 flex-shrink-0" />
            <span className="text-gray-500">Seats available:</span>
            <span className="font-semibold text-gray-800">{ride.availableSeats}</span>
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
  const [conversation, setConversation] = useState(null);
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(false);
  const [pendingCardAction, setPendingCardAction] = useState(null); // { source, label, message, ...fields } | null
  const [summaryRefreshToken, setSummaryRefreshToken] = useState(0);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const scrollContainerRef = useRef(null);
  const typingTimerRef = useRef(null);

  const isDriver = conversation ? idOf(conversation.driver) === user?._id : false;
  const rideForSuggestions = conversation?.ride && typeof conversation.ride === 'object' ? conversation.ride : null;
  const preferenceCards = useMemo(() => getPreferenceCards(rideForSuggestions), [rideForSuggestions]);

  // Seed the composer with the prefilled, editable message handed off
  // from NegotiationActions' modal (via navigate state), exactly once per
  // conversation. Never overwrites text the user has already started typing.
  const prefillAppliedRef = useRef(null);
  useEffect(() => {
    const prefillText = location.state?.prefillText;
    if (!prefillText) return;
    if (prefillAppliedRef.current === conversationId) return; // already applied for this thread
    prefillAppliedRef.current = conversationId;
    setText((current) => (current ? current : prefillText));
  }, [location.state?.prefillText, conversationId]);

  // Load the conversation (with ride preferences populated) once, so the
  // quick-reply panel knows what to suggest and we know passenger/driver role.
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    getConversationById(conversationId)
      .then((data) => { if (!cancelled) setConversation(data); })
      .catch((err) => console.error('❌ Failed to load conversation:', err.message));
    return () => { cancelled = true; };
  }, [conversationId]);

  const refreshNegotiation = useCallback(async () => {
    const negId = negotiation?._id || location.state?.negotiationId;
    try {
      if (negId) {
        const data = await getNegotiationById(negId);
        setNegotiation(data);
      }
      if (conversationId) {
        const convData = await getConversationById(conversationId);
        setConversation(convData);
      }
      setSummaryRefreshToken((v) => v + 1);
    } catch (err) {
      console.error('❌ Failed to refresh state:', err.message);
    }
  }, [negotiation?._id, location.state?.negotiationId, conversationId]);

  // Load the negotiation summary if one was passed via navigation state
  // (set by NegotiationActions after initiating, or by Inbox when the
  // conversation already had one attached).
  useEffect(() => {
    const negId = location.state?.negotiationId;
    if (negId) {
      getNegotiationById(negId).then(setNegotiation).catch(() => { });
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
    const cardAction = pendingCardAction; // capture before clearing
    setText('');
    setPendingCardAction(null);
    stopTyping();
    clearTimeout(typingTimerRef.current);
    try {
      if (cardAction) {
        const rideId = rideForSuggestions?._id;
        if (!rideId) throw new Error('Ride not loaded yet — please try again in a moment.');
        // Opens (or updates, via counter) the structured negotiation thread
        // for this card, then posts the actual typed sentence as a normal
        // chat message so the other party sees the friendly wording rather
        // than just the generic system line.
        const { source, message: _ignored, label: _label, ...fields } = cardAction;
        await initiateNegotiation({ rideId, source, message: trimmed, ...fields });
        await sendMessage(trimmed);
        setSummaryRefreshToken((v) => v + 1);
      } else {
        await sendMessage(trimmed);
      }
      // Sending is always "my" action — snap to bottom regardless of
      // current scroll position.
      requestAnimationFrame(() => {
        const el = scrollContainerRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      });
    } catch (err) {
      toastService.error(err?.response?.data?.message || err.message || 'Message failed to send. Please try again.');
      setText(trimmed);
      setPendingCardAction(cardAction);
    }
  };

  const handleQuickReplyClick = (card) => {
    setText(card.prefill);
    setPendingCardAction({
      source: 'preference',
      preferenceKey: card.negotiationKey,
      preferenceRequested: !card.allowed,
      label: card.label,
    });
    setQuickRepliesOpen(false);
  };

  const handleNegotiationCardPick = (payload) => {
    setText(payload.message);
    setPendingCardAction(payload);
    setLeftPanelOpen(false);
  };

  const handleInputChange = (e) => {
    setText(e.target.value);
    startTyping();
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(stopTyping, 2000);
  };

  // Used by NegotiationPanel to auto-send (Accept/Decline) or prefill
  // (Counter Offer) a canned reply. `sendMessage` comes from useChat, so
  // the negotiation panel never needs its own socket/REST wiring.
  const handleSendCannedMessage = useCallback(async (cannedText, opts = {}) => {
    if (opts.prefillOnly) {
      setText((current) => (current ? current : cannedText));
      return null;
    }
    return sendMessage(cannedText);
  }, [sendMessage]);

  const typingLabel = typingUser && typingUser !== user?._id ? 'Typing…' : null;
  const hasPrefill = Boolean(location.state?.prefillText);

  return (
    // Fixed to the viewport — the page itself never scrolls. h-dvh (dynamic
    // viewport height) keeps this accurate on mobile when the browser chrome
    // or keyboard resizes the visible area; h-screen is there as a fallback
    // for browsers that don't support dvh yet.
    <div className="h-screen h-dvh flex flex-col bg-gray-50 overflow-hidden">
      {/* Header — same gradient banner used on Home / MyBookings */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 px-4 sm:px-6 lg:px-8 py-4 shadow-sm z-20">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
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
          {/* Panel toggles — only meaningful below the lg breakpoint, where
              the side panels are collapsed into slide-over drawers. */}
          {!isDriver && (
            <button
              onClick={() => setLeftPanelOpen((v) => !v)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 transition-colors flex-shrink-0"
              title="Negotiate"
            >
              <Icon name="Handshake" size="button" className="text-white" />
            </button>
          )}
          <button
            onClick={() => setRightPanelOpen((v) => !v)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 transition-colors flex-shrink-0"
            title="Ride details"
          >
            <Icon name="Info" size="button" className="text-white" />
          </button>
        </div>
      </div>

      {/* Three-column layout on large screens: negotiation cards + live
          status on the left, chat in the center, ride summary / AI summary
          / preferences / safety on the right. Below lg, the side columns
          become slide-over drawers toggled from the header. */}
      <div className="flex-1 min-h-0 max-w-6xl w-full mx-auto lg:grid lg:grid-cols-[280px_1fr_300px] lg:gap-4 lg:px-4 relative">

        {/* Left panel — negotiation action cards + live status (passenger only for opening new threads; both sides can see status) */}
        <div
          className={`lg:relative lg:block lg:h-full lg:overflow-y-auto lg:py-4 lg:bg-transparent
            ${leftPanelOpen ? 'fixed inset-y-0 left-0 z-30 w-[85%] max-w-xs bg-gray-50 shadow-2xl overflow-y-auto p-4' : 'hidden'}`}
        >
          {leftPanelOpen && (
            <button
              onClick={() => setLeftPanelOpen(false)}
              className="lg:hidden mb-3 w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500"
            >
              <Icon name="X" size="xs" />
            </button>
          )}
          <div className="space-y-4">
            <NegotiationGuidePanel />
            {!isDriver && (
              <NegotiationCardsPanel ride={rideForSuggestions} onPick={handleNegotiationCardPick} />
            )}
            <LiveNegotiationStatusPanel rideId={rideForSuggestions?._id} refreshToken={summaryRefreshToken} />
          </div>
        </div>
        {leftPanelOpen && (
          <div onClick={() => setLeftPanelOpen(false)} className="lg:hidden fixed inset-0 z-20 bg-black/40" />
        )}

        {/* Center column — the actual chat surface */}
        <div className="flex-1 min-h-0 flex flex-col lg:h-full">
          {/* Messages — the ONLY scrollable region on this screen */}
          <div
            ref={scrollContainerRef}
            className="flex-1 min-h-0 overflow-y-auto"
          >
            <div className="px-4 sm:px-5 py-5 space-y-3">
              {hasMore && (
                <button
                  onClick={loadMore}
                  className="mx-auto mb-1 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white border border-gray-100 rounded-full px-3.5 py-1.5 shadow-sm hover:shadow transition-all"
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
                // First-time-conversation placeholder. When arriving with a
                // prefilled message (from a negotiation action), explain that
                // it's already waiting in the composer below instead of a bare
                // "say hello" empty state.
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center">
                    <Icon name={hasPrefill ? 'Sparkles' : 'MessageCircle'} size="lg" className="text-blue-400" />
                  </div>
                  {hasPrefill ? (
                    <>
                      <p className="font-semibold text-gray-900 text-sm">Conversation hasn't started yet</p>
                      <p className="text-xs text-gray-400 max-w-[260px]">
                        Your first message is already prepared below. Review it, edit if required, and press Send.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-gray-900 text-sm">Say hello 👋</p>
                      <p className="text-xs text-gray-400 max-w-[220px]">
                        Start the conversation — coordinate pickup, timing, or anything else about the ride.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                messages.map((m) => (
                  <MessageBubble
                    key={m._id}
                    message={m}
                    isOwn={idOf(m.sender) === user?._id}
                  />
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
          <div className="flex-shrink-0 bg-white">
            {/* Compact pinned negotiation banner directly above composer */}
            <NegotiationPanel
              negotiation={negotiation}
              userId={user?._id}
              onRefresh={refreshNegotiation}
              onSendCannedMessage={handleSendCannedMessage}
            />
            {/* Preference status cards, slide-up panel, passenger only. */}
            {quickRepliesOpen && !isDriver && (
              <div className="max-w-3xl mx-auto px-4 sm:px-5 pt-3">
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                    Ask the driver about…
                  </p>
                  {preferenceCards.length === 0 ? (
                    <p className="text-xs text-gray-400 px-1 pb-1">Preferences aren't available for this ride yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {preferenceCards.map((card) => (
                        <button
                          key={card.key}
                          type="button"
                          onClick={() => handleQuickReplyClick(card)}
                          className="flex flex-col items-start gap-1 text-left p-2.5 rounded-xl bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all"
                        >
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                            <Icon name={card.icon} size="xs" className="text-indigo-500" />
                            {card.label}
                          </span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${card.allowed ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                            Status: {card.allowed ? 'Allowed' : 'Not allowed'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pending-card-action indicator — shows once a preference or
            negotiation card is picked, so it's clear the next message sent
            will open a structured negotiation thread, with an easy way to
            back out of it. */}
            {pendingCardAction && (
              <div className="max-w-3xl mx-auto px-4 sm:px-5 pt-2.5">
                <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full pl-3 pr-1.5 py-1">
                  <Icon name="Sliders" size="xs" className="text-indigo-500" />
                  <span className="text-xs font-semibold text-indigo-700">
                    Replying about: {pendingCardAction.label || threadLabel(pendingCardAction)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingCardAction(null)}
                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-indigo-100 text-indigo-500 transition-colors"
                  >
                    <Icon name="X" size="xs" />
                  </button>
                </div>
              </div>
            )}

            <div className="px-4 sm:px-5 py-3 sm:py-4">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                {!isDriver && (
                  <button
                    type="button"
                    onClick={() => setQuickRepliesOpen((v) => !v)}
                    className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full border transition-colors ${quickRepliesOpen
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    title="Ask about a preference"
                  >
                    <Icon name="Sliders" size="button" />
                  </button>
                )}
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
        </div>

        {/* Right panel — ride summary, AI conversation summary, ride
            preferences (all 8, always visible), and safety information. */}
        <div
          className={`lg:relative lg:block lg:h-full lg:overflow-y-auto lg:py-4 lg:bg-transparent
            ${rightPanelOpen ? 'fixed inset-y-0 right-0 z-30 w-[85%] max-w-xs bg-gray-50 shadow-2xl overflow-y-auto p-4' : 'hidden'}`}
        >
          {rightPanelOpen && (
            <button
              onClick={() => setRightPanelOpen(false)}
              className="lg:hidden mb-3 w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500"
            >
              <Icon name="X" size="xs" />
            </button>
          )}
          <div className="space-y-4">
            <RideSummaryCard ride={rideForSuggestions} />
            <AiSummaryPanel conversationId={conversationId} refreshToken={summaryRefreshToken} />

            {!isDriver && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-3">
                  <Icon name="Sliders" size="sm" className="text-indigo-500" />
                  Ride Preferences
                </p>
                {preferenceCards.length === 0 ? (
                  <p className="text-xs text-gray-400">Preferences aren't available for this ride yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {preferenceCards.map((card) => (
                      <button
                        key={card.key}
                        type="button"
                        onClick={() => handleQuickReplyClick(card)}
                        className="flex flex-col items-start gap-1 text-left p-2.5 rounded-xl bg-gray-50 border border-gray-200 hover:border-indigo-300 hover:bg-white hover:shadow-sm transition-all"
                      >
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                          <Icon name={card.icon} size="xs" className="text-indigo-500" />
                          {card.label}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${card.allowed ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                          {card.allowed ? 'Allowed' : 'Not allowed'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <ConversationSafetyCard />
          </div>
        </div>
        {rightPanelOpen && (
          <div onClick={() => setRightPanelOpen(false)} className="lg:hidden fixed inset-0 z-20 bg-black/40" />
        )}
      </div>
    </div>
  );
}