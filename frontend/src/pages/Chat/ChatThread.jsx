// src/pages/Chat/ChatThread.jsx


import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat';
import { useSocketContext } from '../../contexts/SocketContext';
import {
  getNegotiationById,
  getMyNegotiations,
  acceptNegotiation,
  rejectNegotiation,
  cancelNegotiation,
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
        <span className="text-[11px] text-center text-gray-500 bg-white border border-gray-100 shadow-sm rounded-full px-3.5 py-1.5 max-w-[85%] flex items-center gap-1.5">
          <Icon name="Info" size="xs" className="text-gray-400 flex-shrink-0" />
          {message.text}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2.5`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-shadow hover:shadow-md ${isOwn
          ? 'bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 text-white rounded-br-md'
          : 'bg-white border border-gray-100 text-gray-900 rounded-bl-md'
          }`}
      >
        <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>

        <p className={`text-[10px] mt-1.5 flex items-center gap-1 ${isOwn ? 'text-blue-100 justify-end' : 'text-gray-400'}`}>
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

function NegotiationGuidePanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3.5 text-left hover:bg-gray-50/80 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Icon name="Handshake" size="sm" className="text-indigo-500" />
          </span>
          How negotiation works
        </span>
        <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size="xs" className="text-gray-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-gray-600 space-y-2.5 animate-[fadeIn_0.15s_ease-out]">
          <p>You can negotiate:</p>
          <div className="flex flex-wrap gap-1.5">
            {['Price', 'Partial route', 'Pickup', 'Drop', 'Seats', 'Preferences'].map((item) => (
              <span key={item} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
                {item}
              </span>
            ))}
          </div>
          <p className="pt-1 text-gray-500 text-xs leading-relaxed">Once both parties agree, the driver can finalize the negotiation into a confirmed booking.</p>
        </div>
      )}
    </div>
  );
}

function ConversationSafetyCard() {
  const [expanded, setExpanded] = useState(false);
  const AVOID_ITEMS = [
    'Sharing phone numbers', 'Sharing WhatsApp numbers', 'Asking users to leave the platform',
    'Offering direct payments', 'Fake promises', 'Harassment', 'Abuse', 'Threats', 'Misleading behaviour',
  ];

  return (
    <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3.5 shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-amber-800 leading-relaxed">
          <Icon name="ShieldAlert" size="sm" className="text-amber-600 flex-shrink-0" />
          Chats are monitored using AI for safety. Violations may be reviewed by administrators.
        </span>
        <Icon name={expanded ? 'ChevronUp' : 'ChevronDown'} size="xs" className="text-amber-500 flex-shrink-0" />
      </button>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-amber-200/60 animate-[fadeIn_0.15s_ease-out]">
          <p className="text-xs font-semibold text-amber-800 mb-2 px-1">Please avoid:</p>
          <div className="flex flex-wrap gap-1.5">
            {AVOID_ITEMS.map((item) => (
              <span key={item} className="text-[11px] font-medium px-2 py-1 rounded-full bg-white/70 text-amber-800 border border-amber-200/60">
                {item}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-amber-700 mt-2.5 leading-relaxed">Unsafe behaviour may lead to account action, including a warning, suspension, block, or removal.</p>
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-3">
          <span className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Icon name="Sparkles" size="sm" className="text-blue-500" />
          </span>
          AI Conversation Summary
        </p>
        <div className="h-3 bg-gray-200 rounded-full animate-pulse w-3/4 mb-1.5" />
        <div className="h-3 bg-gray-200 rounded-full animate-pulse w-1/2" />
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 p-4 sm:p-5">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-3">
        <span className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Icon name="Sparkles" size="sm" className="text-blue-500" />
        </span>
        AI Conversation Summary
      </p>

      {summary.summary && (
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">{summary.summary}</p>
      )}

      {!hasAnything ? (
        <p className="text-xs text-gray-400">Nothing agreed yet — updates automatically as you negotiate.</p>
      ) : (
        <div className="space-y-2">
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

function ModalShell({ title, icon, tone = 'blue', onClose, children }) {
  const toneClasses = tone === 'amber'
    ? 'from-amber-600 via-amber-500 to-amber-400'
    : 'from-blue-700 via-blue-600 to-blue-500';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className={`bg-gradient-to-r ${toneClasses} px-5 py-4 flex items-center justify-between`}>
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <Icon name={icon} size="sm" className="text-white" />
            {title}
          </h3>
          <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 transition-colors text-white">
            <Icon name="X" size="xs" className="text-white" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

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
    <ModalShell title="Counter Offer" icon="RefreshCw" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
        <label className="block text-xs font-semibold text-gray-700">Your counter fare (₹ per seat)</label>
        <input
          type="number" min="1" step="1" value={value} autoFocus disabled={busy}
          onChange={(e) => setValue(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
        />
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
            {busy ? 'Sending…' : 'Send counter'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function NegotiationPanel({ negotiation, userId, onRefresh, onSendCannedMessage, onDismiss }) {
  const [busy, setBusy] = useState(false);
  const [counterOpen, setCounterOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);

  if (!negotiation) return null;
  if (!['pending', 'countered'].includes(negotiation.status)) return null;
  if (negotiation.disputed) return null;

  const isDriver = idOf(negotiation.driver) === userId;
  const terms = negotiation.currentTerms || {};
  const style = NEGOTIATION_STATUS[negotiation.status] || NEGOTIATION_STATUS.pending;
  const sourceLabel = threadLabel(negotiation);

  const lastProposal = negotiation.proposals?.[negotiation.proposals.length - 1];
  const myRole = isDriver ? 'driver' : 'passenger';
  const isMyTurn = !lastProposal || lastProposal.proposedBy !== myRole;

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
    <div className="bg-gradient-to-r from-indigo-50 to-blue-50/60 border-b border-indigo-100 px-4 py-3 flex flex-col gap-2.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide flex items-center gap-1.5">
            <span className={`w-5 h-5 rounded-md flex items-center justify-center ${style.badge}`}>
              <Icon name={style.icon} size="xs" className="text-indigo-600" />
            </span>
            <span className="truncate">{sourceLabel}</span>
            <span className="text-gray-400 font-medium lowercase whitespace-nowrap">— {style.label}</span>
          </span>
          {terms.fare != null && negotiation.source !== 'preference' && (
            <span className="text-xs font-semibold text-gray-700 mt-1 ml-6.5 pl-0.5">
              Proposed Fare: <span className="text-indigo-700">₹{terms.fare}</span>
              {terms.seats && <span className="text-gray-500 font-normal ml-1">({terms.seats} seats)</span>}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {negotiation.disputed && (
            <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
              <Icon name="AlertTriangle" size="xs" /> Disputed
            </span>
          )}
          {['pending', 'countered'].includes(negotiation.status) && (
            <button
              type="button"
              onClick={() => runAction(rejectNegotiation, 'Negotiation ended')}
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
        <div className="pt-1 border-t border-indigo-100/70 flex items-center gap-1.5 text-xs text-gray-500">
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
              className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Icon name="Check" size="xs" /> Yes
            </button>
            <button
              disabled={busy}
              onClick={() => runAction(rejectNegotiation, 'Negotiation declined', 'decline')}
              className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
            >
              <Icon name="X" size="xs" /> No
            </button>
            {negotiation.source === 'negotiate_fare' && (
              <button
                disabled={busy}
                onClick={() => setCounterOpen(true)}
                className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-colors"
              >
                <Icon name="RefreshCw" size="xs" /> Counter
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white/70 border border-amber-100 rounded-xl px-3 py-2 flex items-center justify-center gap-1.5">
            <Icon name="Clock" size="xs" className="text-amber-600 flex-shrink-0" />
            <p className="text-[10px] font-medium text-amber-800">Waiting for a reply...</p>
          </div>
        )
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
    <ModalShell title="Raise a Dispute" icon="Flag" tone="amber" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
        <label className="block text-xs font-semibold text-gray-700">What went wrong?</label>
        <textarea
          value={reason} autoFocus disabled={busy} rows={4} maxLength={500}
          onChange={(e) => setReason(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none transition-shadow"
          placeholder="Describe the issue — our support team will review this negotiation's full history."
        />
        <p className="text-[11px] text-gray-400 leading-relaxed">This negotiation will be flagged for admin review. It stays usable while under review.</p>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="flex-1 bg-amber-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm">
            {busy ? 'Submitting…' : 'Submit dispute'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

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
    <ModalShell title={card.label} icon={card.icon} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
        {card.field === 'fare' && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Your proposed fare (₹ per seat)</label>
            <input
              type="number" min="1" step="1" value={fare} autoFocus
              onChange={(e) => setFare(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
            />
          </div>
        )}
        {(card.field === 'pickupLocation' || card.field === 'partial') && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Preferred pickup point</label>
            <input
              type="text" value={pickupLocation} autoFocus
              onChange={(e) => setPickupLocation(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
            />
          </div>
        )}
        {(card.field === 'dropLocation' || card.field === 'partial') && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Preferred drop point</label>
            <input
              type="text" value={dropLocation}
              onChange={(e) => setDropLocation(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
            />
          </div>
        )}
        {card.field === 'partial' && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Seats needed</label>
            <select
              value={seats}
              onChange={(e) => setSeats(parseInt(e.target.value, 10))}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
            >
              {Array.from({ length: Math.max(1, availableSeats) }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1} seat{i > 0 ? 's' : ''}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
            Prefill message
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function NegotiationCardsPanel({ ride, onPick, disabled }) {
  const [activeCard, setActiveCard] = useState(null);

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 p-4 sm:p-5 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-3">
        <span className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <Icon name="Handshake" size="sm" className="text-indigo-500" />
        </span>
        Negotiate
      </p>
      {disabled && <p className="text-[11px] text-amber-600 mb-3 font-medium bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">Please resolve the open negotiation before starting a new one.</p>}
      <div className="space-y-2">
        {NEGOTIATION_CARD_DEFS.map((card) => (
          <button
            key={card.source}
            type="button"
            onClick={() => setActiveCard(card)}
            className="w-full flex items-start gap-2.5 text-left p-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:border-indigo-300 hover:bg-white hover:shadow-sm transition-all duration-150"
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

function LiveNegotiationStatusPanel({ rideId, ride, refreshToken, isDriver, onFinalize, onThreadsUpdate, onSelectThread }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rideId) return;
    let cancelled = false;
    setLoading(true);
    getMyNegotiations({ rideId })
      .then((data) => {
        if (!cancelled) {
          setThreads(data);
          if (onThreadsUpdate) onThreadsUpdate(data);
        }
      })
      .catch(() => { })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [rideId, refreshToken, onThreadsUpdate]);

  if (loading) return null;
  if (threads.length === 0) return null;

  const hasPending = threads.some(t => ['pending', 'countered'].includes(t.status));
  const acceptedThread = threads.find(t => t.status === 'accepted');
  const availableSeats = ride?.availableSeats ?? ride?.seats ?? 0;
  const acceptedTerms = acceptedThread?.currentTerms || {};
  const requestedSeats = Number.isFinite(Number(acceptedTerms.seats)) ? parseInt(acceptedTerms.seats, 10) : 1;
  const seatShortage = requestedSeats > availableSeats;
  const isRideFull = availableSeats <= 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 p-4 sm:p-5">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-3">
        <span className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Icon name="ListChecks" size="sm" className="text-blue-500" />
        </span>
        Live Negotiation Status
      </p>
      <div className="space-y-1.5">
        {threads.map((n) => {
          const style = LIVE_STATUS_STYLE[n.status] || LIVE_STATUS_STYLE.pending;
          return (
            <button
              key={n._id}
              onClick={() => onSelectThread && onSelectThread(n)}
              className="w-full flex items-center justify-between gap-2 text-xs hover:bg-gray-50 p-2 -mx-1.5 rounded-xl transition-colors text-left"
            >
              <span className="text-gray-600 truncate">{threadLabel(n)}</span>
              <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${style.className}`}>
                {style.label}
              </span>
            </button>
          );
        })}
      </div>

      {isDriver && acceptedThread && (
        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-blue-900">Finalize this accepted agreement</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div className="rounded-xl bg-white border border-blue-100 p-3">
              <p className="text-[11px] uppercase tracking-wide text-blue-500 mb-1">Fare</p>
              <p className="font-semibold text-gray-900">₹{acceptedTerms.fare ?? ride?.fare} / seat</p>
            </div>
            <div className="rounded-xl bg-white border border-blue-100 p-3">
              <p className="text-[11px] uppercase tracking-wide text-blue-500 mb-1">Seats</p>
              <p className="font-semibold text-gray-900">{requestedSeats}</p>
            </div>
            {acceptedTerms.pickupLocation && (
              <div className="col-span-2 rounded-xl bg-white border border-blue-100 p-3">
                <p className="text-[11px] uppercase tracking-wide text-blue-500 mb-1">Pickup</p>
                <p className="font-semibold text-gray-900 truncate">{acceptedTerms.pickupLocation}</p>
              </div>
            )}
            {acceptedTerms.dropLocation && (
              <div className="col-span-2 rounded-xl bg-white border border-blue-100 p-3">
                <p className="text-[11px] uppercase tracking-wide text-blue-500 mb-1">Drop</p>
                <p className="font-semibold text-gray-900 truncate">{acceptedTerms.dropLocation}</p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px] text-gray-600">
            <span>Seats available:</span>
            <span className="font-semibold text-gray-900">{availableSeats}</span>
          </div>
          {isRideFull && (
            <p className="text-[11px] text-red-600">This ride has no available seats left. Finalization is disabled.</p>
          )}
          {seatShortage && !isRideFull && (
            <p className="text-[11px] text-red-600">Need {requestedSeats} seats but only {availableSeats} available.</p>
          )}
          <button
            type="button"
            disabled={hasPending || !acceptedThread || seatShortage || isRideFull}
            onClick={() => acceptedThread && onFinalize(acceptedThread._id)}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-300 transition-colors shadow-sm"
          >
            <Icon name="Ticket" size="xs" />
            Finalize booking
          </button>
        </div>
      )}

      {isDriver && !acceptedThread && (
        <div className="mt-4 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
          Accept one negotiation first, then confirm the booking from here.
        </div>
      )}
    </div>
  );
}

function RideSummaryCard({ ride }) {
  if (!ride) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 p-4 sm:p-5">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-3">
        <span className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Icon name="Ticket" size="sm" className="text-blue-500" />
        </span>
        Ride Summary
      </p>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <Icon name="MapPin" size="xs" className="text-blue-500 flex-shrink-0" />
          <span className="text-gray-500">From:</span>
          <span className="font-semibold text-gray-800 truncate">{ride.start}</span>
        </div>
        <div className="flex items-center gap-2">
          <Icon name="MapPinOff" size="xs" className="text-green-500 flex-shrink-0" />
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
          <div className="flex items-center gap-2 pt-2 mt-1 border-t border-gray-50">
            <Icon name="IndianRupee" size="xs" className="text-gray-400 flex-shrink-0" />
            <span className="text-gray-500">Listed fare:</span>
            <span className="font-semibold text-blue-600">₹{ride.fare} / seat</span>
          </div>
        )}
        {ride.availableSeats != null && (
          <div className="flex items-center gap-2">
            <Icon name="Users" size="xs" className="text-gray-400 flex-shrink-0" />
            <span className="text-gray-500">Seats available:</span>
            <span className={`inline-flex items-center font-semibold px-2 py-0.5 rounded-full text-[11px] ${ride.availableSeats <= 1 ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-700'}`}>
              {ride.availableSeats}
            </span>
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
  const [activeThreads, setActiveThreads] = useState([]);
  const [dismissedNegotiationId, setDismissedNegotiationId] = useState(null);
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

  // ── Load the negotiation for this thread ────────────────────────────────
  // Three sources, tried in order, so the banner (Yes/No, End, Finalize,
  // Reopen, Dispute) reliably appears for BOTH the passenger and the
  // driver, regardless of which one navigated here or how:
  //   1. location.state.negotiationId — set only on the passenger's very
  //      first navigation right after initiating (from NegotiationActions.jsx).
  //   2. conversation.negotiationId — set on the Conversation document once
  //      a negotiation exists on it. Depends on getConversationById actually
  //      returning/populating this field.
  //   3. getMyNegotiations({ rideId }) fallback — queries by ride instead of
  //      by conversation, so it works even if source #2's field is missing
  //      or unpopulated on the backend. Picks the most recently updated
  //      negotiation for this ride between these two users (the same
  //      endpoint that already powers LiveNegotiationStatusPanel, so it's
  //      proven to return data correctly).
  useEffect(() => {
    let cancelled = false;

    const negIdFromState = location.state?.negotiationId;
    const negIdFromConversation = conversation?.negotiationId;
    const directId = negIdFromState || negIdFromConversation;

    async function load() {
      if (directId) {
        try {
          const negotiationIdStr = typeof directId === 'object' ? directId._id : directId;
          const data = await getNegotiationById(negotiationIdStr);
          if (!cancelled) setNegotiation(data);
          return;
        } catch {
          // fall through to ride-based fallback below
        }
      }

      const rideId = rideForSuggestions?._id;
      if (!rideId) {
        if (!cancelled) setNegotiation(null);
        return;
      }

      try {
        const list = await getMyNegotiations({ rideId });
        if (cancelled) return;
        // getMyNegotiations already sorts by updatedAt desc — take the most
        // recent thread for this ride between these two users.
        setNegotiation(list && list.length > 0 ? list[0] : null);
      } catch {
        if (!cancelled) setNegotiation(null);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [conversationId, location.state?.negotiationId, conversation?.negotiationId, rideForSuggestions?._id]);

  const { socket } = useSocketContext();

  const refreshNegotiation = useCallback(async () => {
    try {
      const negId = negotiation?._id || location.state?.negotiationId || conversation?.negotiationId;
      if (negId) {
        const negotiationIdStr = typeof negId === 'object' ? negId._id : negId;
        const data = await getNegotiationById(negotiationIdStr);
        setNegotiation(data);
      } else if (rideForSuggestions?._id) {
        const list = await getMyNegotiations({ rideId: rideForSuggestions._id });
        setNegotiation(list && list.length > 0 ? list[0] : null);
      }
      if (conversationId) {
        const convData = await getConversationById(conversationId);
        setConversation(convData);
      }
      setSummaryRefreshToken((v) => v + 1);
    } catch (err) {
      console.error('❌ Failed to refresh state:', err.message);
    }
  }, [negotiation?._id, location.state?.negotiationId, conversation?.negotiationId, conversationId, rideForSuggestions?._id]);

  // Mark read once history has loaded and whenever new messages arrive
  // while this screen is open.
  useEffect(() => {
    if (!loading) markRead();
  }, [loading, messages.length, markRead]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleNegotiationEvent = async (payload) => {
      if (!payload) return;
      if (payload.conversationId === conversationId || payload.negotiationId === negotiation?._id) {
        await refreshNegotiation();
      }
    };

    socket.on('negotiation:new', handleNegotiationEvent);
    socket.on('negotiation:countered', handleNegotiationEvent);
    socket.on('negotiation:accepted', handleNegotiationEvent);
    socket.on('negotiation:reopened', handleNegotiationEvent);
    socket.on('negotiation:cancelled', handleNegotiationEvent);
    socket.on('negotiation:expired', handleNegotiationEvent);
    socket.on('negotiation:finalized', handleNegotiationEvent);

    return () => {
      socket.off('negotiation:new', handleNegotiationEvent);
      socket.off('negotiation:countered', handleNegotiationEvent);
      socket.off('negotiation:accepted', handleNegotiationEvent);
      socket.off('negotiation:reopened', handleNegotiationEvent);
      socket.off('negotiation:cancelled', handleNegotiationEvent);
      socket.off('negotiation:expired', handleNegotiationEvent);
      socket.off('negotiation:finalized', handleNegotiationEvent);
    };
  }, [socket, conversationId, negotiation?._id, refreshNegotiation]);

  const prevLengthRef = useRef(0);
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isNewMessage = messages.length > prevLengthRef.current;
    prevLengthRef.current = messages.length;
    if (!isNewMessage) return;

    refreshNegotiation();

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 240) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length, refreshNegotiation]);

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
        const { source, message: _ignored, label: _label, ...fields } = cardAction;

        const existingThread = activeThreads.find(t =>
          t.source === source &&
          (source !== 'preference' || t.preferenceKey === fields.preferenceKey)
        );

        if (existingThread) {
          const counterPayload = { message: trimmed };
          if (fields.proposedFare) counterPayload.fare = fields.proposedFare;
          if (fields.seats) counterPayload.seats = fields.seats;
          if (fields.pickupLocation) counterPayload.pickupLocation = fields.pickupLocation;
          if (fields.dropLocation) counterPayload.dropLocation = fields.dropLocation;
          if (fields.preferenceRequested != null) counterPayload.preferenceNote = trimmed;

          await counterOffer(existingThread._id, counterPayload);
        } else {
          await initiateNegotiation({ rideId, source, message: trimmed, ...fields });
        }

        await sendMessage(trimmed);
        setSummaryRefreshToken((v) => v + 1);
      } else {
        await sendMessage(trimmed);
      }
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

  const handleSendCannedMessage = useCallback(async (cannedText, opts = {}) => {
    if (opts.prefillOnly) {
      setText((current) => (current ? current : cannedText));
      return null;
    }
    return sendMessage(cannedText);
  }, [sendMessage]);

  const handleFinalizeBooking = async (negId) => {
    try {
      await finalizeNegotiation(negId);
      toastService.success('Booking created');
      refreshNegotiation();
    } catch (err) {
      toastService.error(err.response?.data?.message || 'Failed to create booking.');
    }
  };

  const typingLabel = typingUser && typingUser !== user?._id ? 'Typing…' : null;
  const hasPrefill = Boolean(location.state?.prefillText);

  return (
    <div className="h-screen h-dvh flex flex-col bg-gray-50 overflow-hidden">
      {/* ── Header — matches Home hero gradient ── */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 px-3 sm:px-6 lg:px-8 py-3.5 sm:py-4 shadow-sm z-20">
        <div className="max-w-6xl mx-auto flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => navigate('/messages')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all flex-shrink-0"
          >
            <Icon name="ChevronLeft" size="button" className="text-white" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <Icon name="MessageCircle" size="md" className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-white leading-tight truncate text-sm sm:text-base">Conversation</p>
            <p className="text-blue-100 text-[11px] flex items-center gap-1 h-4">
              {typingLabel ? (
                <span className="italic">{typingLabel}</span>
              ) : (
                <span className="truncate">Chat with your driver or passenger</span>
              )}
            </p>
          </div>
          <button
            onClick={() => setLeftPanelOpen((v) => !v)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all flex-shrink-0"
            title={isDriver ? 'Negotiation Status' : 'Negotiate'}
          >
            <Icon name="Handshake" size="button" className="text-white" />
          </button>
          <button
            onClick={() => setRightPanelOpen((v) => !v)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all flex-shrink-0"
            title="Ride details"
          >
            <Icon name="Info" size="button" className="text-white" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 max-w-6xl w-full mx-auto lg:grid lg:grid-cols-[280px_1fr_300px] lg:gap-4 lg:px-4 relative">

        {/* ── Left panel (negotiate) ── */}
        <div
          className={`lg:relative lg:block lg:h-full lg:overflow-y-auto lg:py-4 lg:bg-transparent
            ${leftPanelOpen ? 'fixed inset-y-0 left-0 z-30 w-[88%] max-w-xs bg-gray-50 shadow-2xl overflow-y-auto p-4' : 'hidden'}`}
        >
          {leftPanelOpen && (
            <button
              onClick={() => setLeftPanelOpen(false)}
              className="lg:hidden mb-3 w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <Icon name="X" size="xs" />
            </button>
          )}
          <div className="space-y-4">
            <NegotiationGuidePanel />
            {!isDriver && (
              <NegotiationCardsPanel
                ride={rideForSuggestions}
                onPick={handleNegotiationCardPick}
                disabled={activeThreads.some(t => ['pending', 'countered'].includes(t.status)) || (rideForSuggestions?.availableSeats ?? rideForSuggestions?.seats ?? 0) <= 0}
              />
            )}
            <LiveNegotiationStatusPanel
              rideId={rideForSuggestions?._id}
              ride={rideForSuggestions}
              refreshToken={summaryRefreshToken}
              isDriver={isDriver}
              onFinalize={handleFinalizeBooking}
              onThreadsUpdate={setActiveThreads}
              onSelectThread={(t) => {
                setNegotiation(t);
                setDismissedNegotiationId(null);
                setLeftPanelOpen(false);
              }}
            />
          </div>
        </div>
        {leftPanelOpen && (
          <div onClick={() => setLeftPanelOpen(false)} className="lg:hidden fixed inset-0 z-20 bg-black/40 animate-[fadeIn_0.15s_ease-out]" />
        )}

        {/* ── Center: message thread ── */}
        <div className="flex-1 min-h-0 flex flex-col lg:h-full">
          <div
            ref={scrollContainerRef}
            className="flex-1 min-h-0 overflow-y-auto"
          >
            <div className="px-3 sm:px-5 py-4 sm:py-5 space-y-1">
              {hasMore && (
                <button
                  onClick={loadMore}
                  className="mx-auto mb-2 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white border border-gray-100 rounded-full px-3.5 py-1.5 shadow-sm hover:shadow transition-all"
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
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center">
                    <Icon name={hasPrefill ? 'Sparkles' : 'MessageCircle'} size="lg" className="text-blue-400" />
                  </div>
                  {hasPrefill ? (
                    <>
                      <p className="font-semibold text-gray-900 text-sm">Conversation hasn't started yet</p>
                      <p className="text-xs text-gray-400 max-w-[260px] leading-relaxed">
                        Your first message is already prepared below. Review it, edit if required, and press Send.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-gray-900 text-sm">Say hello 👋</p>
                      <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed">
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
                <p className="text-xs text-gray-400 italic px-2 flex items-center gap-1.5 pt-1">
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

          {/* ── Composer — sticky at the bottom, safe-area aware on mobile ── */}
          <div className="flex-shrink-0 bg-white border-t border-gray-100 sm:border-t-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {negotiation?._id !== dismissedNegotiationId && (
              <NegotiationPanel
                negotiation={negotiation}
                userId={user?._id}
                onRefresh={refreshNegotiation}
                onSendCannedMessage={handleSendCannedMessage}
                onDismiss={() => setDismissedNegotiationId(negotiation._id)}
              />
            )}
            {quickRepliesOpen && !isDriver && (
              <div className="max-w-3xl mx-auto px-3 sm:px-5 pt-3">
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
                          className="flex flex-col items-start gap-1 text-left p-2.5 rounded-xl bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all duration-150"
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

            {pendingCardAction && (
              <div className="max-w-3xl mx-auto px-3 sm:px-5 pt-2.5">
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

            <div className="px-3 sm:px-5 py-3 sm:py-4">
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
                  className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-60 transition-shadow"
                />
                <button
                  type="submit"
                  disabled={!text.trim() || sending}
                  className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 active:scale-95 text-white disabled:opacity-40 transition-all shadow-sm"
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

        {/* ── Right panel (ride details / summary / safety) ── */}
        <div
          className={`lg:relative lg:block lg:h-full lg:overflow-y-auto lg:py-4 lg:bg-transparent
            ${rightPanelOpen ? 'fixed inset-y-0 right-0 z-30 w-[88%] max-w-xs bg-gray-50 shadow-2xl overflow-y-auto p-4' : 'hidden'}`}
        >
          {rightPanelOpen && (
            <button
              onClick={() => setRightPanelOpen(false)}
              className="lg:hidden mb-3 w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <Icon name="X" size="xs" />
            </button>
          )}
          <div className="space-y-4">
            <RideSummaryCard ride={rideForSuggestions} />
            <AiSummaryPanel conversationId={conversationId} refreshToken={summaryRefreshToken} />

            {!isDriver && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 p-4 sm:p-5">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-3">
                  <span className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <Icon name="Sliders" size="sm" className="text-indigo-500" />
                  </span>
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
                        className="flex flex-col items-start gap-1 text-left p-2.5 rounded-xl bg-gray-50 border border-gray-200 hover:border-indigo-300 hover:bg-white hover:shadow-sm transition-all duration-150"
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
          <div onClick={() => setRightPanelOpen(false)} className="lg:hidden fixed inset-0 z-20 bg-black/40 animate-[fadeIn_0.15s_ease-out]" />
        )}
      </div>
    </div>
  );
}