// src/components/ride/RideCard.jsx
// Passenger-facing search result card.
// Design: matches Home.jsx exactly — white rounded-2xl, blue-600 primary, gray-50 bg.
// Payment: uses PaymentCalculator (3% platform fee, 5% GST) — never hardcoded.
//
// FIX (this session, Milestone 4 wiring pass):
//   1. `handleMessage` was previously defined inside BookingModal but
//      referenced `user`/`setMessaging`/`navigate`, none of which exist in
//      that component's scope — calling it would throw a ReferenceError.
//      It's now defined in RideCard (the component that actually renders
//      the "Message" button) with its own `messaging` state and `navigate`.
//   2. The action-button row contained a second, complete copy of itself
//      nested inside the first `<div className="grid grid-cols-4 ...">` —
//      a leftover from an incomplete paste. There is now a single 4-button
//      grid: Details / Contact / Message / Book.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBooking } from '../../services/bookingService';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import PaymentCalculator from '../../utils/paymentCalculator';
import NegotiationActions from '../../pages/rides/NegotiationActions';
import Icon from '../ui/Icon';
import { getOrCreateConversation } from '../../services/chatService';

// ─── Shared verified badge ────────────────────────────────────────────────────
function VerifiedBadge() {
  return <Icon name="ShieldCheck" size="sm" className="text-blue-500 flex-shrink-0" />;
}

// ─── Fare calculation helpers (use PaymentCalculator — never hardcode %) ──────
function calcPassengerFare(baseFare, seats = 1, waivePlatformCharges = false) {
  const calc = PaymentCalculator.calculatePassengerTotal(parseFloat(baseFare) || 0, seats, {
    waivePlatformCharges,
  });
  return {
    baseFare: calc.baseFareTotal,
    serviceFee: calc.serviceFeeTotal,
    serviceFeeGST: calc.gstOnServiceFeeTotal,
    total: calc.totalForAllSeats,
    perSeat: calc.totalPassengerPays,
  };
}

function calcSegmentFare(perKmRate, distanceKm, seats = 1, waivePlatformCharges = false) {
  const base = (parseFloat(perKmRate) || 0) * (parseFloat(distanceKm) || 0) * seats;
  const fee = base * PaymentCalculator.PLATFORM_FEE_PERCENTAGE;
  const gst = (base + fee) * PaymentCalculator.GST_PERCENTAGE;
  return {
    base,
    fee: waivePlatformCharges ? 0 : fee,
    gst: waivePlatformCharges ? 0 : gst,
    waivedFee: fee,
    waivedGst: gst,
    total: waivePlatformCharges ? base : base + fee + gst,
  };
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

// ─── Booking Modal helpers ────────────────────────────────────────────────────
const formatMoneyLocal = (value) => {
  const amount = Number(value || 0);
  const rounded = Math.round(amount * 100) / 100;
  return `₹${rounded.toLocaleString('en-IN', {
    maximumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    minimumFractionDigits: 0,
  })}`;
};

function FirstBookingCelebration({ baseFare, seats }) {
  const base = parseFloat(baseFare) || 0;
  const seatsNum = Math.max(1, parseInt(seats) || 1);

  // Platform fee (3%) is waived. GST (5%) still applies on base.
  const platformFee = Math.round(base * 0.03 * 100) / 100;
  const gstFee = Math.round(base * 0.05 * 100) / 100;
  const totalPays = base + gstFee;

  const confettiRef = React.useRef(null);
  const styleInjected = React.useRef(false);

  React.useEffect(() => {
    if (styleInjected.current) return;
    styleInjected.current = true;
    if (document.querySelector('style[data-smr-first-ride]')) return;
    const style = document.createElement('style');
    style.setAttribute('data-smr-first-ride', '1');
    style.textContent = `
      @keyframes smr-float-in {
        from { opacity: 0; transform: translateY(14px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes smr-confetti-fall {
        0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(240px) rotate(720deg); opacity: 0; }
      }
      @keyframes smr-shimmer {
        0%   { background-position: -200% center; }
        100% { background-position:  200% center; }
      }
      @keyframes smr-pulse-ring {
        0%  { transform: scale(0.9); opacity: 0.7; }
        70% { transform: scale(1.3); opacity: 0; }
        100%{ transform: scale(1.3); opacity: 0; }
      }
      @keyframes smr-bounce-in {
        0%  { transform: scale(0.3); opacity: 0; }
        60% { transform: scale(1.15); opacity: 1; }
        80% { transform: scale(0.93); }
        100%{ transform: scale(1); }
      }
      @keyframes smr-tick {
        from { stroke-dashoffset: 60; }
        to   { stroke-dashoffset: 0; }
      }
      @keyframes smr-amount-pop {
        0%  { transform: scale(0.6); opacity: 0; }
        70% { transform: scale(1.1); }
        100%{ transform: scale(1);   opacity: 1; }
      }
      .smr-shimmer-text {
        background: linear-gradient(90deg, #15803d 0%, #22c55e 40%, #86efac 60%, #15803d 100%);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: smr-shimmer 2.8s linear infinite;
      }
    `;
    document.head.appendChild(style);
  }, []);

  React.useEffect(() => {
    if (!confettiRef.current || base <= 0) return;
    const stage = confettiRef.current;
    const colors = ['#22c55e', '#16a34a', '#86efac', '#fbbf24', '#60a5fa', '#a78bfa', '#f472b6', '#fb923c'];

    function burst(delay = 0) {
      setTimeout(() => {
        Array.from({ length: 32 }).forEach(() => {
          const el = document.createElement('div');
          const dur = 1.1 + Math.random() * 1.3;
          const del = Math.random() * 0.5;
          Object.assign(el.style, {
            position: 'absolute',
            left: (8 + Math.random() * 84) + '%',
            top: '0px',
            width: (5 + Math.random() * 8) + 'px',
            height: (5 + Math.random() * 8) + 'px',
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            background: colors[Math.floor(Math.random() * colors.length)],
            opacity: '0',
            pointerEvents: 'none',
            animation: `smr-confetti-fall ${dur}s linear ${del}s forwards`,
          });
          stage.appendChild(el);
          setTimeout(() => el.remove(), (dur + del + 0.1) * 1000);
        });
      }, delay);
    }

    burst(0);
    burst(600);
  }, [base, seatsNum]);

  return (
    <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        borderRadius: 16,
        border: '1.5px solid #bbf7d0',
        background: 'linear-gradient(145deg, #f0fdf4 0%, #ecfdf5 100%)',
        padding: '20px 20px 16px',
        animation: 'smr-float-in 0.5s cubic-bezier(0.22,1,0.36,1) both',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div ref={confettiRef} style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 10,
        }} />

        <div style={{
          position: 'absolute', top: 16, right: 16,
          width: 50, height: 50, pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2px solid #22c55e',
            animation: 'smr-pulse-ring 1.9s ease-out infinite',
          }} />
        </div>

        <div style={{
          position: 'absolute', top: 16, right: 16,
          width: 46, height: 46, borderRadius: '50%',
          background: 'linear-gradient(135deg, #15803d, #22c55e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'smr-bounce-in 0.65s cubic-bezier(0.22,1,0.36,1) 0.15s both',
          boxShadow: '0 4px 14px rgba(34,197,94,0.35)',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" style={{
              strokeDasharray: 60, strokeDashoffset: 60,
              animation: 'smr-tick 0.4s ease 0.5s forwards',
            }} />
          </svg>
        </div>

        <div style={{ paddingRight: 60, marginBottom: 14 }}>
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
            color: '#15803d', textTransform: 'uppercase', margin: '0 0 5px',
          }}>First Booking Offer</p>

          <h3 className="smr-shimmer-text" style={{
            fontSize: 18, fontWeight: 700, margin: '0 0 3px', lineHeight: 1.25,
          }}>
            Your first booking is free
          </h3>

          <p style={{ fontSize: 11.5, color: '#166534', margin: 0, opacity: 0.85, lineHeight: 1.5 }}>
            Platform fee is waived. Only base fare and GST apply.
          </p>
        </div>

        <div style={{ height: 1, background: '#bbf7d0', marginBottom: 12 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13 }}>
          <div style={{ display: 'flex', color: '#374151', justifyContent: 'space-between' }}>
            <span>Base Fare ({seatsNum} seat{seatsNum > 1 ? 's' : ''})</span>
            <span style={{ fontWeight: 600 }}>{formatMoneyLocal(base)}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <span style={{ color: '#9ca3af' }}>Platform fee (3%)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ textDecoration: 'line-through', color: '#9ca3af' }}>
                +{formatMoneyLocal(platformFee)}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#166534', background: '#d1fae5', padding: '1.5px 5px', borderRadius: 4, textTransform: 'uppercase' }}>
                waived
              </span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <span style={{ color: '#374151' }}>GST (5% on base fare)</span>
            <span style={{ fontWeight: 600, color: '#374151' }}>
              +{formatMoneyLocal(gstFee)}
            </span>
          </div>

          <div style={{
            display: 'flex', alignItems: 'baseline',
            borderTop: '1px solid #bbf7d0', paddingTop: 10, marginTop: 3, justifyContent: 'space-between'
          }}>
            <span style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>
              Total you pay
            </span>
            <span style={{
              fontSize: 22, fontWeight: 700, color: '#15803d',
              animation: 'smr-amount-pop 0.5s cubic-bezier(0.22,1,0.36,1) 0.55s both',
            }}>
              {formatMoneyLocal(totalPays)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingModal({ ride, onClose, onSuccess, isFirstRideFree = false }) {
  const [seats, setSeats] = useState(1);
  const [pickup, setPickup] = useState(ride.start || '');
  const [drop, setDrop] = useState(ride.end || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const availableSeats = ride.availableSeats ?? ride.seats ?? 1;
  const isSegment = ride.matchType === 'on_route' && ride.userSearchDistance;
  const perKmRate = ride.perKmRate || 0;
  const fareMode = ride.fareMode || 'fixed';

  // Compute fare for current seat selection
  let fareDisplay;
  if (isSegment && perKmRate) {
    fareDisplay = calcSegmentFare(perKmRate, ride.userSearchDistance, seats, isFirstRideFree);
  } else if (fareMode === 'per_km' && perKmRate && ride.totalDistance) {
    fareDisplay = calcSegmentFare(perKmRate, ride.totalDistance, seats, isFirstRideFree);
  } else {
    const standard = calcPassengerFare(ride.fare, seats, false);
    const f = calcPassengerFare(ride.fare, seats, isFirstRideFree);
    fareDisplay = {
      base: f.baseFare,
      fee: f.serviceFee,
      gst: f.serviceFeeGST,
      waivedFee: standard.serviceFee,
      waivedGst: standard.serviceFeeGST - f.serviceFeeGST,
      total: f.total,
    };
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await createBooking({
        rideId: ride._id,
        seatsBooked: seats,
        pickupLocation: { address: isSegment ? (ride.userPickup || pickup) : pickup },
        dropLocation: { address: isSegment ? (ride.userDrop || drop) : drop },
        passengerNotes: notes,
        paymentMethod: 'cash',
        matchType: ride.matchType || null,
        userSearchDistance: ride.userSearchDistance || null,
        segmentFare: ride.segmentFare || null,
        matchQuality: ride.matchQuality || null,
      });

      const waived = response?.isFirstRideFree || isFirstRideFree;
      toast.success(waived ? 'Booking request sent. First booking platform fee waived!' : 'Booking request sent!', {
        style: { background: '#10B981', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' },
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Booking failed', {
        style: { background: '#EF4444', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 px-6 py-4 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold text-white">Book Ride</h3>
            {isSegment && <p className="text-blue-100 text-xs mt-0.5">Segment booking · route-matched</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Route summary */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Your journey</p>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-0.5 mt-1 flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="w-px h-5 bg-gray-200" />
                <span className="w-2 h-2 rounded-full bg-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {isSegment ? (ride.userPickup || ride.start) : ride.start}
                </p>
                {isSegment && ride.userSearchDistance && (
                  <p className="text-xs text-blue-600 font-medium py-0.5">{ride.userSearchDistance} km segment</p>
                )}
                <p className="text-sm font-semibold text-gray-900 truncate mt-1">
                  {isSegment ? (ride.userDrop || ride.end) : ride.end}
                </p>
              </div>
            </div>
          </div>

          {/* Seats */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Seats</label>
            <select
              value={seats}
              onChange={e => setSeats(parseInt(e.target.value))}
              disabled={loading}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {Array.from({ length: availableSeats }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1} seat{i > 0 ? 's' : ''}</option>
              ))}
            </select>
          </div>

          {/* Pickup/drop — only for non-segment */}
          {!isSegment && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pickup point</label>
                <input
                  type="text" value={pickup} onChange={e => setPickup(e.target.value)} disabled={loading}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Specific pickup location"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Drop point</label>
                <input
                  type="text" value={drop} onChange={e => setDrop(e.target.value)} disabled={loading}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Specific drop location"
                />
              </div>
            </>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes for driver <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)} rows={2} disabled={loading}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="Any special requirements…"
            />
          </div>

          {/* Fare breakdown */}
          {isFirstRideFree ? (
            <FirstBookingCelebration baseFare={fareDisplay.base} seats={seats} />
          ) : (
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-3">Fare breakdown</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Base fare</span>
                  <span className="font-medium text-gray-800">₹{fareDisplay.base.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Platform fee ({(PaymentCalculator.PLATFORM_FEE_PERCENTAGE * 100).toFixed(0)}%)</span>
                  <span className="font-medium text-gray-800">
                    ₹{fareDisplay.fee.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">GST ({(PaymentCalculator.GST_PERCENTAGE * 100).toFixed(0)}% on fare + fee)</span>
                  <span className="font-medium text-gray-800">
                    ₹{fareDisplay.gst.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-green-200 font-bold text-green-700">
                  <span>Total</span>
                  <span className="text-base">₹{fareDisplay.total.toFixed(2)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Payment after driver confirms your request.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button" onClick={onClose} disabled={loading}
              className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 py-2.5 rounded-xl font-semibold text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading
                ? <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Sending…</>
                : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Confirm Booking</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Details Modal ────────────────────────────────────────────────────────────
function DetailsModal({ ride, onClose, isFirstRideFree = false }) {
  const [tab, setTab] = useState('overview');
  const driver = ride.driverId || ride.driver || {};
  const driverInfo = ride.driverInfo || {};
  const vehicle = ride.vehicle || {};
  const prefs = ride.preferences || {};
  const fareMode = ride.fareMode || 'fixed';
  const perKmRate = ride.perKmRate || 0;
  const standardSingleFare = calcPassengerFare(ride.fare || 0, 1, false);
  const singleFare = calcPassengerFare(ride.fare || 0, 1, isFirstRideFree);

  const tabs = ['overview', 'driver', 'vehicle', 'preferences'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 px-6 py-4 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
          <h3 className="text-lg font-bold text-white">Ride Details</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-100 px-4 sticky top-14 bg-white z-10">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-semibold capitalize transition-all ${tab === t ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {tab === 'overview' && (
            <>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Route</p>
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-0.5 mt-1 flex-shrink-0">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="w-px h-5 bg-gray-200" />
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{ride.start}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-2">{ride.end}</p>
                  </div>
                </div>
                {ride.totalDistance > 0 && (
                  <p className="text-xs text-gray-400">~{ride.totalDistance} km · ~{Math.round((ride.estimatedDuration || 0) / 60)} hrs</p>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Schedule</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-400 text-xs">Date</p><p className="font-semibold">{formatDate(ride.date)}</p></div>
                  <div><p className="text-gray-400 text-xs">Time</p><p className="font-semibold">{formatTime(ride.time)}</p></div>
                  <div><p className="text-gray-400 text-xs">Available seats</p><p className="font-semibold text-blue-600">{ride.availableSeats ?? ride.seats}</p></div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-100 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-green-700 uppercase tracking-widest">Pricing</p>
                {isFirstRideFree && (
                  <p className="rounded-lg border border-green-200 bg-white/70 px-3 py-2 text-xs font-semibold text-green-700">
                    First booking offer: platform fee and GST waived.
                  </p>
                )}
                {fareMode === 'per_km' ? (
                  <p className="text-sm font-semibold text-gray-900">₹{perKmRate}/km</p>
                ) : (
                  <>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Base fare</span><span>₹{(ride.fare || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Platform fee</span>
                      <span className={isFirstRideFree ? 'text-gray-400 line-through' : ''}>₹{(isFirstRideFree ? standardSingleFare.serviceFee : singleFare.serviceFee).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">GST</span>
                      <span className={isFirstRideFree ? 'text-gray-400 line-through' : ''}>₹{(isFirstRideFree ? standardSingleFare.serviceFeeGST : singleFare.serviceFeeGST).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-green-700 pt-1 border-t border-green-200"><span>You pay / seat</span><span>₹{singleFare.perSeat.toFixed(2)}</span></div>
                  </>
                )}
                {ride.tollIncluded && <p className="text-xs text-green-600">✓ Tolls included</p>}
                {ride.negotiableFare && <p className="text-xs text-blue-600">✓ Negotiable</p>}
              </div>

              {ride.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2">Notes</p>
                  <p className="text-sm text-gray-700">{ride.notes}</p>
                </div>
              )}
              {ride.pickupInstructions && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-2">Pickup instructions</p>
                  <p className="text-sm text-gray-700">{ride.pickupInstructions}</p>
                </div>
              )}
            </>
          )}

          {tab === 'driver' && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {(driverInfo.name || driver.name || 'D').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{driverInfo.name || driver.name || 'Driver'}</p>
                  {(driverInfo.verified || driver.isDriverVerified) && (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold">
                      <VerifiedBadge /> Verified Driver
                    </span>
                  )}
                </div>
              </div>
              {driver.ratingSummary > 0 && (
                <div className="flex items-center gap-1">
                  <Icon name="Star" size="sm" className="text-amber-400 fill-amber-400" />
                  <span className="text-sm font-semibold text-gray-700">{Number(driver.ratingSummary).toFixed(1)}</span>
                </div>
              )}
              {driverInfo.gender && <p className="text-sm text-gray-600">Gender: <span className="font-medium capitalize">{driverInfo.gender}</span></p>}
            </div>
          )}

          {tab === 'vehicle' && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
              {[
                { label: 'Type', val: vehicle.type },
                { label: 'Model', val: vehicle.model },
                { label: 'Color', val: vehicle.color },
                { label: 'AC', val: vehicle.acAvailable ? 'Available' : 'Not available' },
                { label: 'Luggage', val: vehicle.luggageSpace },
              ].filter(r => r.val).map(({ label, val }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-semibold text-gray-900 capitalize">{val}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'preferences' && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'smokingAllowed', label: 'Smoking', icon: 'Cigarette' },
                { key: 'musicAllowed', label: 'Music', icon: 'Music' },
                { key: 'petFriendly', label: 'Pets', icon: 'Footprints' },
                { key: 'luggageAllowed', label: 'Luggage', icon: 'Briefcase' },
                { key: 'womenOnly', label: 'Women only', icon: 'Sparkles' },
                { key: 'talkative', label: 'Talkative', icon: 'MessageSquare' },
                { key: 'childSeatAvailable', label: 'Child seat', icon: 'Baby' },
                { key: 'pickupFlexibility', label: 'Flex pickup', icon: 'MapPin' },
              ].map(({ key, label, icon }) => (
                <div key={key} className={`rounded-xl p-3 border text-sm font-semibold flex items-center gap-2.5 ${prefs[key] ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-700'}`}>
                  <Icon name={icon} size="sm" className="flex-shrink-0" />
                  <div className="flex-1">
                    <span className="block font-semibold text-gray-800">{label}</span>
                    <span className="text-[10px] font-medium opacity-75">{prefs[key] ? 'Allowed' : 'Not allowed'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Contact Modal ────────────────────────────────────────────────────────────
function ContactModal({ ride, onClose }) {
  const driver = ride.driverId || ride.driver || {};
  const driverInfo = ride.driverInfo || {};
  const vehicle = ride.vehicle || {};
  const name = driverInfo.name || driver.name || 'Driver';
  const phone = driverInfo.phone || driver.phone || ride.phoneNumber || 'Not provided';
  const hasConfirmedBooking = ride.bookingStatus === 'accepted' || ride.bookingStatus === 'completed' || ride.bookingStatus === 'paid';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Contact</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 space-y-3">
          {[
            { label: 'Driver', val: name },
            { label: 'Phone', val: hasConfirmedBooking ? phone : 'Hidden until booking confirmation' },
            { label: 'Vehicle', val: [vehicle.color, vehicle.model, vehicle.type].filter(Boolean).join(' ') || 'N/A' },
            { label: 'Reg. No.', val: vehicle.number || ride.vehicleNumber || 'N/A' },
          ].map(({ label, val }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className="text-sm font-bold text-gray-900 uppercase">{val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN RIDE CARD
// ═══════════════════════════════════════════════════════════════════════════════
function RideCard({ ride, onBookingSuccess, isFirstRideFree = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null); // 'book' | 'details' | 'contact' | null
  const [messaging, setMessaging] = useState(false);

  const driver = ride.driverId || ride.driver || {};
  const driverInfo = ride.driverInfo || {};
  const vehicle = ride.vehicle || {};
  const prefs = ride.preferences || {};
  const isVerified = driverInfo.verified || driver.isDriverVerified || false;
  const driverName = driverInfo.name || driver.name || 'Driver';
  const driverRating = driver.ratingSummary || 0;
  const fareMode = ride.fareMode || 'fixed';
  const perKmRate = ride.perKmRate || 0;
  const isSegment = ride.matchType === 'on_route' && ride.userSearchDistance;

  const availableSeats = ride.availableSeats ?? ride.seats ?? 0;
  const totalSeats = ride.seats ?? 0;
  const bookedSeats = Math.max(0, totalSeats - availableSeats);
  const isFull = availableSeats === 0;

  // Passenger-facing price to show on card
  let displayPrice;
  let displayPriceLabel;
  if (isSegment && perKmRate) {
    const f = calcSegmentFare(perKmRate, ride.userSearchDistance, 1, isFirstRideFree);
    displayPrice = `₹${f.total.toFixed(0)}`;
    displayPriceLabel = 'your segment';
  } else if (fareMode === 'per_km') {
    displayPrice = `₹${perKmRate}/km`;
    displayPriceLabel = 'rate';
  } else {
    const f = calcPassengerFare(ride.fare || 0, 1, isFirstRideFree);
    displayPrice = `₹${f.perSeat.toFixed(0)}`;
    displayPriceLabel = 'per seat';
  }

  const handleBook = () => {
    if (!user) {
      toast.error('Sign in to book a ride', { style: { background: '#EF4444', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' } });
      return;
    }
    if (isFull) {
      toast.error('No seats available');
      return;
    }
    setModal('book');
  };

  const handleContact = () => {
    if (!user) {
      toast.error('Sign in to view contact', { style: { background: '#EF4444', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' } });
      return;
    }

    const hasConfirmedBooking = ride.bookingStatus === 'accepted' || ride.bookingStatus === 'completed' || ride.bookingStatus === 'paid';
    if (!hasConfirmedBooking) {
      toast.info('Contact details are available after booking confirmation. Use chat to negotiate and confirm your ride.', {
        style: { background: '#2563EB', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' },
      });
      return;
    }

    setModal('contact');
  };

  // MILESTONE 4 — start (or resume) a chat thread with this ride's driver.
  // Moved here from BookingModal, where it was defined but unreachable
  // (referenced state/hooks that didn't exist in that component's scope).
  const handleMessage = async () => {
    if (!user) {
      toast.error('Sign in to message the driver', { style: { background: '#EF4444', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' } });
      return;
    }
    const driverId = driver._id || ride.driverId || ride.postedBy;
    if (driverId && user._id && driverId.toString() === user._id.toString()) {
      toast.error('You cannot message yourself');
      return;
    }
    setMessaging(true);
    try {
      const conversation = await getOrCreateConversation(ride._id);
      navigate(`/messages/${conversation._id}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not start chat');
    } finally {
      setMessaging(false);
    }
  };

  // Preference pills to show
  const prefPills = [
    vehicle.acAvailable && { label: 'AC', icon: 'Wind', color: 'blue' },
    prefs.musicAllowed && { label: 'Music', icon: 'Music', color: 'purple' },
    prefs.petFriendly && { label: 'Pets', icon: 'Footprints', color: 'green' },
    prefs.womenOnly && { label: 'Women', icon: 'Sparkles', color: 'pink' },
    ride.tollIncluded && { label: 'Tolls', icon: 'Check', color: 'indigo' },
    ride.negotiableFare && { label: 'Negotiable', icon: 'Sliders', color: 'amber' },
  ].filter(Boolean);

  const pillColors = {
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    green: 'bg-green-50 text-green-700',
    pink: 'bg-pink-50 text-pink-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-lg hover:border-blue-200 transition-all duration-200 overflow-hidden">

        {/* Top accent: verified = blue gradient, else gray */}
        <div className={`h-1 ${isVerified ? 'bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500' : 'bg-gray-100'}`} />

        <div className="p-4 sm:p-5">
          {/* Header row: route + price */}
          <div className="flex items-start gap-3 mb-4">
            <div className="flex flex-col items-center gap-0.5 mt-1 flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="w-px h-5 bg-gray-200" />
              <span className="w-2 h-2 rounded-full bg-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{ride.start}</p>
              {ride.waypoints?.filter(w => w.location).map((w, i) => (
                <p key={i} className="text-xs text-gray-400 pl-1">via {w.location}</p>
              ))}
              <p className="text-sm font-semibold text-gray-900 truncate mt-1.5">{ride.end}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold text-blue-600">{displayPrice}</p>
              <p className="text-xs text-gray-400">{displayPriceLabel}</p>
            </div>
          </div>

          {/* Segment badge */}
          {isSegment && (
            <div className="mb-3 flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2 text-xs font-semibold text-green-800">
              <Icon name="CheckCircle" size="sm" className="text-green-600 flex-shrink-0" />
              Your segment: {ride.userSearchDistance} km
              {ride.matchQuality && <span className="ml-1 opacity-60">· {ride.matchQuality}% match</span>}
            </div>
          )}

          {isFirstRideFree && (
            <div className="mb-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">
              First booking: platform fee and GST waived
            </div>
          )}

          {/* Vehicle subtitle */}
          {[vehicle.color, vehicle.model, vehicle.type].filter(Boolean).length > 0 && (
            <p className="text-xs text-gray-400 mb-3 truncate">
              {[vehicle.color, vehicle.model, vehicle.type].filter(Boolean).join(' · ')}
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center justify-between py-3 border-t border-gray-50">
            {/* Driver */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {driverName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-gray-900 truncate">{driverName.split(' ')[0]}</span>
                  {isVerified && <VerifiedBadge />}
                </div>
                {driverRating > 0 && (
                  <div className="flex items-center gap-0.5">
                    <Icon name="Star" size="xs" className="text-amber-400 fill-amber-400" />
                    <span className="text-xs text-gray-500">{Number(driverRating).toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Seats + date */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isFull ? 'bg-orange-50 text-orange-600' : availableSeats <= 1 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-700'
                }`}>
                {isFull ? 'Full' : `${availableSeats} seat${availableSeats !== 1 ? 's' : ''}`}
              </span>
              <span className="text-xs text-gray-400">
                {formatDate(ride.date)}{ride.time ? ` · ${formatTime(ride.time)}` : ''}
              </span>
            </div>
          </div>

          {/* Pref pills */}
          {prefPills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {prefPills.map((p, i) => (
                <span key={i} className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${pillColors[p.color]}`}>
                  <Icon name={p.icon} size="xs" />
                  {p.label}
                </span>
              ))}
            </div>
          )}

          {/* Negotiation Cards (Milestone 2/3) — only rendered when at least
              one action applies to this ride; see utils/negotiationActions.js */}
          <NegotiationActions ride={ride} />

          {/* Action buttons — single 4-button grid: Details / Contact / Message / Book.
              (Previously this rendered a 3-button grid with a broken, fully
              duplicated 4-button grid nested inside it — removed.) */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            <button
              onClick={() => setModal('details')}
              className="border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 py-2 rounded-xl text-xs font-semibold transition-all"
            >
              Details
            </button>
            <button
              onClick={handleContact}
              className="border border-blue-200 text-blue-600 hover:bg-blue-50 py-2 rounded-xl text-xs font-semibold transition-all"
            >
              Contact
            </button>
              Contact
            </button>
            <button
              onClick={handleMessage}
              disabled={messaging}
              className="border border-indigo-200 text-indigo-600 hover:bg-indigo-50 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            >
              {messaging ? '…' : 'Message'}
            </button>
            <button
              onClick={handleBook}
              disabled={isFull}
              className="bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isFull ? 'Full' : 'Book'}
            </button>
          </div>

        </div>
      </div>

      {modal === 'book' && <BookingModal ride={ride} onClose={() => setModal(null)} onSuccess={onBookingSuccess} isFirstRideFree={isFirstRideFree} />}
      {modal === 'details' && <DetailsModal ride={ride} onClose={() => setModal(null)} isFirstRideFree={isFirstRideFree} />}
      {modal === 'contact' && <ContactModal ride={ride} onClose={() => setModal(null)} />}
    </>
  );
}

export default RideCard;