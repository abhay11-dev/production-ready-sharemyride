// src/components/chat/NegotiationPanel.jsx
import React, { useState } from 'react';
import toast from '../../services/toastService';
import {
  counterOffer, acceptNegotiation, rejectNegotiation,
  cancelNegotiation, finalizeNegotiation, NEGOTIATION_STATUS_LABELS,
} from '../../services/negotiationService';
import Icon from '../ui/Icon';

const STATUS_PILL = {
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  green: 'bg-green-50 text-green-700 border-green-100',
  red: 'bg-red-50 text-red-700 border-red-100',
  gray: 'bg-gray-50 text-gray-600 border-gray-100',
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function NegotiationPanel({ negotiation, currentUserId, onUpdated }) {
  const [expanded, setExpanded] = useState(true);
  const [counterOpen, setCounterOpen] = useState(false);
  const [fare, setFare] = useState(negotiation?.currentTerms?.fare || '');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  if (!negotiation) return null;

  const isDriver = negotiation.driver?._id === currentUserId || negotiation.driver === currentUserId;
  const role = isDriver ? 'driver' : 'passenger';
  const isOpen = ['pending', 'countered'].includes(negotiation.status);
  const canAccept = isOpen;
  const canCounter = isOpen && negotiation.roundCount < negotiation.maxRounds;
  const canFinalize = isDriver && negotiation.status === 'accepted';
  const lastProposal = negotiation.proposals?.[negotiation.proposals.length - 1];
  const lastProposalIsMine = lastProposal?.proposedBy === role;
  const statusMeta = NEGOTIATION_STATUS_LABELS[negotiation.status] || { label: negotiation.status, color: 'gray' };

  const run = async (fn, successMsg) => {
    setBusy(true);
    try {
      const result = await fn();
      toast.success(successMsg, { style: { background: '#10B981', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' } });
      onUpdated?.(result);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Action failed', { style: { background: '#EF4444', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' } });
    } finally {
      setBusy(false);
    }
  };

  const handleCounter = async (e) => {
    e.preventDefault();
    if (!fare || parseFloat(fare) <= 0) {
      toast.error('Enter a valid fare');
      return;
    }
    await run(
      () => counterOffer(negotiation._id, { fare: parseFloat(fare), message: msg }),
      'Counter-offer sent'
    );
    setCounterOpen(false);
    setMsg('');
  };

  return (
    <div className="mx-4 mt-3 bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-amber-50"
      >
        <div className="flex items-center gap-2">
          <Icon name="Sliders" size="sm" className="text-amber-600" />
          <span className="text-sm font-bold text-gray-900">Negotiation</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_PILL[statusMeta.color]}`}>
            {statusMeta.label}
          </span>
        </div>
        <Icon name={expanded ? 'ChevronUp' : 'ChevronDown'} size="sm" className="text-gray-400" />
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          {/* Current terms */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Fare</p>
              <p className="font-bold text-gray-900">₹{negotiation.currentTerms?.fare ?? '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Seats</p>
              <p className="font-bold text-gray-900">{negotiation.currentTerms?.seats ?? 1}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 col-span-2">
              <p className="text-xs text-gray-400 mb-0.5">Pickup → Drop</p>
              <p className="font-semibold text-gray-800 truncate">
                {negotiation.currentTerms?.pickupLocation} → {negotiation.currentTerms?.dropLocation}
              </p>
            </div>
            {negotiation.currentTerms?.date && (
              <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                <p className="text-xs text-gray-400 mb-0.5">Date / time</p>
                <p className="font-semibold text-gray-800">
                  {formatDate(negotiation.currentTerms.date)}{negotiation.currentTerms.time ? ` · ${negotiation.currentTerms.time}` : ''}
                </p>
              </div>
            )}
          </div>

          {lastProposal?.message && (
            <p className="text-xs text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2">
              "{lastProposal.message}"
            </p>
          )}

          <p className="text-xs text-gray-400">
            Round {negotiation.roundCount} of {negotiation.maxRounds}
            {lastProposalIsMine && isOpen && ' · waiting on the other party'}
          </p>

          {/* Counter form */}
          {counterOpen ? (
            <form onSubmit={handleCounter} className="space-y-2 bg-blue-50 rounded-xl p-3 border border-blue-100">
              <label className="block text-xs font-semibold text-gray-600">Propose a new fare (₹)</label>
              <input
                type="number" min="1" step="1" value={fare} onChange={(e) => setFare(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                disabled={busy}
              />
              <textarea
                value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} placeholder="Optional message…"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                disabled={busy}
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setCounterOpen(false)} disabled={busy}
                  className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-xs font-semibold hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={busy}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-semibold disabled:opacity-50">
                  Send counter
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              {canAccept && !lastProposalIsMine && (
                <button
                  disabled={busy}
                  onClick={() => run(() => acceptNegotiation(negotiation._id), 'Terms accepted')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Accept terms
                </button>
              )}
              {canCounter && (
                <button
                  disabled={busy}
                  onClick={() => setCounterOpen(true)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Counter
                </button>
              )}
              {canFinalize && (
                <button
                  disabled={busy}
                  onClick={() => run(() => finalizeNegotiation(negotiation._id), 'Booking confirmed!')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Finalize into booking
                </button>
              )}
              {isOpen && (
                <button
                  disabled={busy}
                  onClick={() => run(() => rejectNegotiation(negotiation._id), 'Negotiation rejected')}
                  className="border border-red-200 text-red-600 hover:bg-red-50 py-2 px-3 rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  Reject
                </button>
              )}
              {negotiation.status !== 'finalized' && !['rejected', 'cancelled', 'expired'].includes(negotiation.status) && (
                <button
                  disabled={busy}
                  onClick={() => run(() => cancelNegotiation(negotiation._id), 'Negotiation cancelled')}
                  className="border border-gray-200 text-gray-500 hover:bg-gray-50 py-2 px-3 rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
            </div>
          )}

          {negotiation.status === 'finalized' && negotiation.finalizedBookingId && (
            <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 font-semibold">
              ✓ Booking confirmed. Check "My Bookings" for details.
            </p>
          )}
        </div>
      )}
    </div>
  );
}