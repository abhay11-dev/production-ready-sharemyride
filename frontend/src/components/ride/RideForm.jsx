// src/components/ride/RideForm.jsx
// Production-grade ride posting form
// Architecture: multi-step wizard (5 steps) with live fare preview
// Reads from: useAuth user object for auto-fill
// Submits: exact shape expected by rideController.postRide
// PaymentCalculator: uses existing utils/paymentCalculator.js (unchanged)
//
// ── First Ride Offer UI ───────────────────────────────────────────────────────
// When isFirstRideOffer=true, Step 2's fare field swaps FarePreview for
// FirstRideCelebration — a marketing-grade celebration block with:
//   • Confetti burst (canvas-free, DOM-only, auto-cleans up)
//   • Shimmer headline + animated tick badge
//   • Fare breakdown with "waived" pill badges on platform fee & GST
//   • Live fare/seat inputs update all numbers reactively
// No external dependencies beyond what the project already has.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import PaymentCalculator from '../../utils/paymentCalculator';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Route',       icon: '🗺️' },
  { id: 2, label: 'Schedule',    icon: '📅' },
  { id: 3, label: 'Vehicle',     icon: '🚗' },
  { id: 4, label: 'Preferences', icon: '⚙️' },
  { id: 5, label: 'Review',      icon: '✅' },
];

const VEHICLE_TYPES   = ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Bike'];
const LUGGAGE_OPTIONS = ['None', 'Small', 'Medium', 'Large'];

const formatMoney = (value) => {
  const amount  = Number(value || 0);
  const rounded = Math.round(amount * 100) / 100;
  return `₹${rounded.toLocaleString('en-IN', {
    maximumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    minimumFractionDigits: 0,
  })}`;
};

const clampDateInput = (value) => {
  if (!value) return '';
  const [year = '', month = '', day = ''] = value.split('-');
  return [year.slice(0, 4), month.slice(0, 2), day.slice(0, 2)]
    .filter(Boolean)
    .join('-');
};

const isValidRideDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const normalizeIndiaLocation = (value) => {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  return /\bindia\b/i.test(cleaned) ? cleaned : `${cleaned}, India`;
};

// ─── Small UI primitives ──────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-center justify-between gap-3 py-2.5 cursor-pointer group">
      <div className="min-w-0">
        <span className="text-sm font-medium text-gray-800 group-hover:text-gray-900">{label}</span>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          checked ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </label>
  );
}

function Field({ label, required, hint, error, children }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><span>⚠</span>{error}</p>}
    </div>
  );
}

const inputCls = (err) =>
  `w-full border ${err ? 'border-red-400 bg-red-50' : 'border-gray-300'} rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-gray-400`;

const selectCls = (err) => `${inputCls(err)} bg-white appearance-none`;

// ─── Step Progress Bar ─────────────────────────────────────────────────────────
function StepBar({ current, total }) {
  return (
    <div className="px-6 pt-6 pb-4">
      <div className="flex items-center justify-between mb-3">
        {STEPS.map((s, i) => {
          const done   = s.id < current;
          const active = s.id === current;
          return (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                  done   ? 'bg-blue-600 text-white' :
                  active ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                           'bg-gray-100 text-gray-400'
                }`}>
                  {done ? '✓' : s.icon}
                </div>
                <span className={`text-xs hidden sm:block ${active ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 transition-colors duration-300 ${s.id < current ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 text-center">Step {current} of {total}</p>
    </div>
  );
}

// ─── Standard Fare Preview (non-first-ride) ────────────────────────────────────
function FarePreview({ fare, seats }) {
  const base = parseFloat(fare) || 0;
  if (base <= 0) return null;
  const d           = PaymentCalculator.calculateDriverEarnings(base, 1);
  const netPerSeat  = d.driverNetAmount;
  const totalFull   = netPerSeat * (parseInt(seats) || 1);

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mt-3">
      <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <span>💰</span> Your earnings breakdown
      </p>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Fare you set</span>
          <span className="font-medium">{formatMoney(base)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Platform fee (3%)</span>
          <span>+{formatMoney(d.platformFee)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>GST (5% on fare + platform fee)</span>
          <span>+{formatMoney(d.gstOnPlatformFee)}</span>
        </div>
        <div className="flex justify-between font-bold text-green-700 border-t border-green-200 pt-1.5 mt-1.5">
          <span>You receive / seat</span>
          <span className="text-base">{formatMoney(netPerSeat)}</span>
        </div>
        {parseInt(seats) > 1 && (
          <div className="flex justify-between text-xs text-green-600">
            <span>If all {seats} seats filled</span>
            <span className="font-semibold">{formatMoney(totalFull)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── First Ride Celebration Component ─────────────────────────────────────────
//
// Renders when isFirstRideOffer=true in Step 2.
// Renders a celebration card with shimmer headline, tick badge, pulse ring,
// waived-fee breakdown, and a confetti burst on mount. Fare/seats come from
// parent Step 2 state so the numbers stay live.
//
// All animation is pure CSS @keyframes injected once via a <style> tag
// (idempotent — guarded by a ref so it only runs once per app lifecycle).
//
function FirstRideCelebration({ fare, seats }) {
  const base     = parseFloat(fare) || 0;
  const seatsNum = Math.max(1, parseInt(seats) || 1);

  // Fee math (waived for passenger, but shown struck-through so driver understands value)
  const platformFee = Math.round(base * 0.03 * 100) / 100;
  const gstFee      = Math.round((base + platformFee) * 0.05 * 100) / 100;
  const netPerSeat  = base; // driver gets 100% of their fare set — platform waived
  const totalFull   = netPerSeat * seatsNum;

  // Passenger also pays the full (waived) price = base only
  const passengerPays = base;

  // ── Inject CSS animations once ──────────────────────────────────────────────
  const styleInjected = useRef(false);
  useEffect(() => {
    if (styleInjected.current) return;
    styleInjected.current = true;
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

  // ── Confetti burst ───────────────────────────────────────────────────────────
  const confettiRef = useRef(null);
  useEffect(() => {
    if (!confettiRef.current || base <= 0) return;
    const stage  = confettiRef.current;
    const colors = ['#22c55e','#16a34a','#86efac','#fbbf24','#60a5fa','#a78bfa','#f472b6','#fb923c'];

    function burst(delay = 0) {
      setTimeout(() => {
        Array.from({ length: 32 }).forEach(() => {
          const el  = document.createElement('div');
          const dur = 1.1 + Math.random() * 1.3;
          const del = Math.random() * 0.5;
          Object.assign(el.style, {
            position:        'absolute',
            left:            (8 + Math.random() * 84) + '%',
            top:             '0px',
            width:           (5 + Math.random() * 8) + 'px',
            height:          (5 + Math.random() * 8) + 'px',
            borderRadius:    Math.random() > 0.5 ? '50%' : '2px',
            background:      colors[Math.floor(Math.random() * colors.length)],
            opacity:         '0',
            pointerEvents:   'none',
            animation:       `smr-confetti-fall ${dur}s linear ${del}s forwards`,
          });
          stage.appendChild(el);
          setTimeout(() => el.remove(), (dur + del + 0.1) * 1000);
        });
      }, delay);
    }

    burst(0);
    burst(700);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base > 0]);

  if (base <= 0) return null;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── 1. Celebration card ───────────────────────────────────────────── */}
      <div style={{
        borderRadius: 16,
        border: '1.5px solid #bbf7d0',
        background: 'linear-gradient(145deg, #f0fdf4 0%, #ecfdf5 100%)',
        padding: '20px 20px 16px',
        animation: 'smr-float-in 0.5s cubic-bezier(0.22,1,0.36,1) both',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Confetti stage — zero-height, overflow visible */}
        <div ref={confettiRef} style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 10,
        }} />

        {/* Pulse ring behind badge */}
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

        {/* Tick badge */}
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

        {/* Headline block */}
        <div style={{ paddingRight: 60, marginBottom: 14 }}>
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
            color: '#15803d', textTransform: 'uppercase', margin: '0 0 5px',
          }}>First ride offer</p>

          <h3 className="smr-shimmer-text" style={{
            fontSize: 20, fontWeight: 700, margin: '0 0 3px', lineHeight: 1.25,
          }}>
            Your first posting is free
          </h3>

          <p style={{ fontSize: 12, color: '#166534', margin: 0, opacity: 0.85, lineHeight: 1.5 }}>
            Platform fee &amp; GST waived on your first confirmed booking
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#bbf7d0', marginBottom: 12 }} />

        {/* Fare breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13 }}>

          {/* Fare set */}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#374151' }}>
            <span>Fare you set</span>
            <span style={{ fontWeight: 600 }}>{formatMoney(base)}</span>
          </div>

          {/* Platform fee — waived */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#9ca3af' }}>Platform fee (3%)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ textDecoration: 'line-through', color: '#9ca3af' }}>
                +{formatMoney(platformFee)}
              </span>
              <WaivedPill />
            </span>
          </div>

          {/* GST — waived */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#9ca3af' }}>GST on above (5%)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ textDecoration: 'line-through', color: '#9ca3af' }}>
                +{formatMoney(gstFee)}
              </span>
              <WaivedPill />
            </span>
          </div>

          {/* Net total */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            borderTop: '1px solid #bbf7d0', paddingTop: 10, marginTop: 3,
          }}>
            <span style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>
              You receive / seat
            </span>
            <span style={{
              fontSize: 22, fontWeight: 700, color: '#15803d',
              animation: 'smr-amount-pop 0.5s cubic-bezier(0.22,1,0.36,1) 0.55s both',
            }}>
              {formatMoney(netPerSeat)}
            </span>
          </div>

          {/* Multi-seat line */}
          {seatsNum > 1 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 12, color: '#6b7280',
            }}>
              <span>If all {seatsNum} seats filled</span>
              <span style={{ fontWeight: 600, color: '#16a34a' }}>{formatMoney(totalFull)}</span>
            </div>
          )}

          {/* Passenger clarity line */}
          <div style={{
            marginTop: 4,
            background: 'rgba(255,255,255,0.7)',
            borderRadius: 8, border: '1px solid #bbf7d0',
            padding: '7px 11px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 15 }}>🎁</span>
            <p style={{ fontSize: 11.5, color: '#166534', margin: 0, lineHeight: 1.5 }}>
              Passengers pay exactly <strong>{formatMoney(passengerPays)}</strong> per seat —
              no platform add-ons, no surprises. A rare offer they'll trust immediately.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
// ── Small helpers used by FirstRideCelebration ─────────────────────────────────

function WaivedPill() {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
      background: '#dcfce7', color: '#15803d',
      border: '1px solid #bbf7d0',
      borderRadius: 4, padding: '1px 7px',
      textTransform: 'uppercase',
    }}>
      waived
    </span>
  );
}

// ─── Ride Preview Card (Step 5) ────────────────────────────────────────────────
function RidePreviewCard({ data, user, isFirstRideOffer }) {
  const driverName   = user?.name || 'You';
  const driverAvatar = user?.avatar || null;
  const d            = data.fare ? PaymentCalculator.calculateDriverEarnings(data.fare, 1) : null;
  const passengerPays = data.fare
    ? PaymentCalculator.calculatePassengerTotal(data.fare, 1, { waivePlatformCharges: isFirstRideOffer }).totalPassengerPays
    : 0;

  const prefs = [
    data.preferences?.musicAllowed   && '🎵 Music OK',
    data.preferences?.petFriendly    && '🐾 Pet friendly',
    data.preferences?.luggageAllowed && '🧳 Luggage OK',
    data.preferences?.womenOnly      && '👩 Women only',
    data.preferences?.smokingAllowed && '🚬 Smoking OK',
  ].filter(Boolean);

  return (
    <div className="border-2 border-blue-200 rounded-2xl overflow-hidden shadow-md">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-3 flex items-center justify-between">
        <span className="text-white text-xs font-semibold uppercase tracking-wider">How passengers will see your ride</span>
        <span className="text-blue-200 text-xs">Live preview</span>
      </div>

      <div className="bg-white p-5">
        {/* Route */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="w-0.5 h-8 bg-gray-200" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm">{data.start || '—'}</p>
            {data.waypoints?.filter(w => w.location?.trim()).map((w, i) => (
              <p key={i} className="text-xs text-gray-400 py-0.5 pl-2">via {w.location}</p>
            ))}
            <p className="font-bold text-gray-900 text-sm mt-2">{data.end || '—'}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xl font-black text-blue-600">{formatMoney(data.fare || 0)}</p>
            <p className="text-xs text-gray-400">per seat</p>
            <p className="text-xs text-gray-500 mt-0.5">Passenger pays {formatMoney(passengerPays)}</p>
            {isFirstRideOffer && (
              <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full border border-green-200">
                No add-ons
              </span>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-center text-xs">
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-gray-400 mb-0.5">Date</p>
            <p className="font-semibold text-gray-800">
              {data.date ? new Date(data.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-gray-400 mb-0.5">Time</p>
            <p className="font-semibold text-gray-800">{data.time || '—'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-gray-400 mb-0.5">Seats</p>
            <p className="font-semibold text-gray-800">{data.seats || 1}</p>
          </div>
        </div>

        {/* Driver row */}
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100 mb-3">
          {driverAvatar ? (
            <img src={driverAvatar} alt={driverName} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {driverName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{driverName}</p>
            <div className="flex items-center gap-1">
              {user?.isDriverVerified && (
                <span className="text-xs text-blue-600 flex items-center gap-0.5">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Verified
                </span>
              )}
              {user?.ratingSummary > 0 && (
                <span className="text-xs text-amber-600">★ {Number(user.ratingSummary).toFixed(1)}</span>
              )}
            </div>
          </div>
          <div className="ml-auto text-right text-xs text-gray-400">
            <p>{data.vehicle?.type || 'Vehicle'}</p>
            <p>{data.vehicle?.color ? `${data.vehicle.color} ${data.vehicle?.model || ''}`.trim() : ''}</p>
          </div>
        </div>

        {/* Preferences */}
        {prefs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {prefs.map((p, i) => (
              <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p}</span>
            ))}
          </div>
        )}

        {data.tollIncluded  && <p className="text-xs text-green-600 mt-2 flex items-center gap-1"><span>✓</span> Toll charges included</p>}
        {data.negotiableFare && <p className="text-xs text-blue-600 mt-1 flex items-center gap-1"><span>✓</span> Fare is negotiable</p>}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN FORM COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
function RideForm({ onSubmit, isLoading, isFirstRideOffer = false }) {
  const { user } = useAuth();

  // ── Step ──────────────────────────────────────────────────────────────────
  const [step, setStep]     = useState(1);
  const [errors, setErrors] = useState({});

  // ── Step 1: Route ──────────────────────────────────────────────────────────
  const [start, setStart]                    = useState('');
  const [end, setEnd]                        = useState('');
  const [waypoints, setWaypoints]            = useState([]);
  const [allowPartialRoute, setAllowPartial] = useState(true);

  // ── Step 2: Schedule + Seats + Pricing ────────────────────────────────────
  const [date, setDate]                 = useState('');
  const [time, setTime]                 = useState('');
  const [seats, setSeats]               = useState(1);
  const [fare, setFare]                 = useState('');
  const [tollIncluded, setTollIncluded] = useState(false);
  const [negotiableFare, setNegotiable] = useState(false);
  const [isRoundTrip, setIsRoundTrip]   = useState(false);
  const [returnDate, setReturnDate]     = useState('');
  const [returnTime, setReturnTime]     = useState('');
  const [reusePreviousTripOptions, setReusePreviousTripOptions] = useState(true);

  // ── Step 3: Vehicle + Contact ──────────────────────────────────────────────
  const [vehicleNumber, setVehicleNumber]           = useState('');
  const [vehicleType, setVehicleType]               = useState('Sedan');
  const [vehicleModel, setVehicleModel]             = useState('');
  const [vehicleColor, setVehicleColor]             = useState('');
  const [acAvailable, setAcAvailable]               = useState(true);
  const [luggageSpace, setLuggageSpace]             = useState('Medium');
  const [phoneNumber, setPhoneNumber]               = useState('');
  const [address, setAddress]                       = useState('');
  const [pickupInstructions, setPickupInstructions] = useState('');

  // ── Step 4: Preferences + Notes ───────────────────────────────────────────
  const [smokingAllowed, setSmokingAllowed] = useState(false);
  const [musicAllowed, setMusicAllowed]     = useState(true);
  const [petFriendly, setPetFriendly]       = useState(false);
  const [luggageAllowed, setLuggageAllowed] = useState(true);
  const [womenOnly, setWomenOnly]           = useState(false);
  const [notes, setNotes]                   = useState('');

  // Auto-fill phone from profile
  useEffect(() => {
    if (user?.phone) setPhoneNumber(user.phone);
  }, [user]);

  const handleRoundTripToggle = (value) => {
    setIsRoundTrip(value);
    if (!value) {
      setReturnDate('');
      setReturnTime('');
      setReusePreviousTripOptions(false);
    } else {
      setReusePreviousTripOptions(true);
    }
  };

  // ── Waypoint helpers ───────────────────────────────────────────────────────
  const addWaypoint = () =>
    setWaypoints(p => [...p, { location: '', order: p.length + 1 }]);

  const removeWaypoint = (i) =>
    setWaypoints(p => p.filter((_, idx) => idx !== i).map((w, idx) => ({ ...w, order: idx + 1 })));

  const updateWaypoint = (i, val) =>
    setWaypoints(p => p.map((w, idx) => idx === i ? { ...w, location: val } : w));

  // ── Build full form data object ────────────────────────────────────────────
  const formData = {
    start, end, date, time,
    seats: parseInt(seats) || 1,
    fare: parseFloat(fare) || 0,
    tollIncluded, negotiableFare,
    isRoundTrip, returnDate, returnTime, reusePreviousTripOptions,
    waypoints: waypoints.filter(w => w.location.trim()),
    allowPartialRoute,
    vehicle: {
      number: vehicleNumber.replace(/\s/g, '').toUpperCase(),
      type: vehicleType, model: vehicleModel.trim(),
      color: vehicleColor.trim(), acAvailable, luggageSpace,
    },
    preferences: {
      smokingAllowed, musicAllowed, petFriendly, luggageAllowed, womenOnly,
      talkative: true, pickupFlexibility: true, childSeatAvailable: false,
    },
  };

  // ── Per-step validation ────────────────────────────────────────────────────
  const validateStep = useCallback((s) => {
    const errs = {};

    if (s === 1) {
      if (!start.trim()) errs.start = 'Starting location is required';
      else if (start.trim().length < 3) errs.start = 'Enter a more specific location';
      if (!end.trim()) errs.end = 'Destination is required';
      else if (end.trim().toLowerCase() === start.trim().toLowerCase())
        errs.end = 'Start and destination cannot be the same';
    }

    if (s === 2) {
      if (!date) errs.date = 'Select a departure date';
      else if (!isValidRideDate(date)) errs.date = 'Enter a valid 4-digit date';
      else {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (new Date(date) < today) errs.date = 'Date cannot be in the past';
      }
      if (!time) errs.time = 'Select departure time';
      const s_ = parseInt(seats);
      if (!s_ || s_ < 1 || s_ > 8) errs.seats = 'Must be between 1 and 8';
      const f = parseFloat(fare);
      if (!fare || isNaN(f) || f < 1) errs.fare = 'Enter a valid fare (min ₹1)';
      else if (f > 10000) errs.fare = 'Fare seems too high — double-check';
      if (isRoundTrip && !returnDate) errs.returnDate = 'Select a return date';
      else if (isRoundTrip && !isValidRideDate(returnDate)) errs.returnDate = 'Enter a valid 4-digit return date';
      if (isRoundTrip && !returnTime) errs.returnTime = 'Select a return time';
    }

    if (s === 3) {
      if (!vehicleNumber.trim()) {
        errs.vehicleNumber = 'Vehicle number is required';
      } else {
        const plate      = vehicleNumber.replace(/\s/g, '').toUpperCase();
        const plateRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/;
        if (!plateRegex.test(plate)) errs.vehicleNumber = 'e.g. PB10AB1234 or MH02XY5678';
      }
      if (!phoneNumber.trim()) {
        errs.phoneNumber = 'Contact number is required';
      } else if (!/^[6-9]\d{9}$/.test(phoneNumber.replace(/\s/g, ''))) {
        errs.phoneNumber = 'Enter a valid 10-digit Indian mobile number';
      }
      if (!address.trim()) errs.address = 'Pickup address is required';
      else if (address.trim().length < 10) errs.address = 'Add more detail (landmark, area)';
    }

    return errs;
  }, [start, end, date, time, seats, fare, isRoundTrip, returnDate, returnTime, vehicleNumber, phoneNumber, address]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleNext = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length) {
      setErrors(errs);
      toast.error(Object.values(errs)[0], { position: 'top-center' });
      return;
    }
    setErrors({});
    setStep(s => Math.min(s + 1, STEPS.length));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setErrors({});
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    const allErrors = { ...validateStep(1), ...validateStep(2), ...validateStep(3) };
    if (Object.keys(allErrors).length) {
      setErrors(allErrors);
      toast.error('Please fix all errors before posting', { position: 'top-center' });
      return;
    }

    const payload = {
      start:  normalizeIndiaLocation(start),
      end:    normalizeIndiaLocation(end),
      date,   time,
      seats:  parseInt(seats),
      fareMode:       'fixed',
      fare:           parseFloat(fare),
      tollIncluded,   negotiableFare,
      isRoundTrip,    returnDate, returnTime, reusePreviousTripOptions,
      vehicleNumber:  vehicleNumber.replace(/\s/g, '').toUpperCase(),
      vehicle: {
        number:    vehicleNumber.replace(/\s/g, '').toUpperCase(),
        type:      vehicleType,
        model:     vehicleModel.trim(),
        color:     vehicleColor.trim(),
        acAvailable, luggageSpace,
      },
      phoneNumber:        phoneNumber.replace(/\s/g, ''),
      address:            address.trim(),
      pickupInstructions: pickupInstructions.trim(),
      waypoints: waypoints.filter(w => w.location.trim()).map((w, i) => ({
        location: normalizeIndiaLocation(w.location), order: i + 1,
      })),
      allowPartialRoute,
      preferences: {
        smokingAllowed, musicAllowed, petFriendly, luggageAllowed, womenOnly,
        talkative: true, pickupFlexibility: true, childSeatAvailable: false,
      },
      notes: notes.trim(),
    };

    onSubmit(payload);
    resetForm();
  };

  const resetForm = () => {
    setStep(1); setErrors({});
    setStart(''); setEnd(''); setWaypoints([]); setAllowPartial(true);
    setDate(''); setTime(''); setSeats(1);
    setFare(''); setTollIncluded(false); setNegotiable(false);
    setIsRoundTrip(false); setReturnDate(''); setReturnTime(''); setReusePreviousTripOptions(true);
    setVehicleNumber(''); setVehicleType('Sedan'); setVehicleModel('');
    setVehicleColor(''); setAcAvailable(true); setLuggageSpace('Medium');
    setPhoneNumber(user?.phone || ''); setAddress(''); setPickupInstructions('');
    setSmokingAllowed(false); setMusicAllowed(true); setPetFriendly(false);
    setLuggageAllowed(true); setWomenOnly(false); setNotes('');
  };

  const today = new Date().toISOString().split('T')[0];

  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="bg-white shadow-2xl rounded-2xl w-full max-w-2xl border border-gray-100 overflow-hidden">
      <StepBar current={step} total={STEPS.length} />

      <form onSubmit={handleSubmit} noValidate>
        <div className="px-5 sm:px-8 pb-8">

          {/* ── STEP 1: Route ────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Where are you going?</h2>
                <p className="text-sm text-gray-500">Enter your start and destination — passengers will search by these.</p>
              </div>

              <Field label="From" required error={errors.start}>
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="text" placeholder="e.g. Phagwara, Punjab"
                    value={start}
                    onChange={e => { setStart(e.target.value); setErrors(p => ({ ...p, start: '' })); }}
                    className={`${inputCls(errors.start)} pl-10`}
                  />
                </div>
              </Field>

              {waypoints.length > 0 && (
                <div className="pl-4 border-l-2 border-dashed border-gray-200 space-y-2">
                  {waypoints.map((wp, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-gray-300 w-5 text-center flex-shrink-0">{i + 1}</span>
                      <input
                        type="text" placeholder={`Stop ${i + 1}`}
                        value={wp.location}
                        onChange={e => updateWaypoint(i, e.target.value)}
                        className={`${inputCls(false)} flex-1 py-2`}
                      />
                      <button type="button" onClick={() => removeWaypoint(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button type="button" onClick={addWaypoint} className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 hover:bg-blue-50 rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add a stop along the way
              </button>

              <Field label="To" required error={errors.end}>
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="text" placeholder="e.g. Chandigarh"
                    value={end}
                    onChange={e => { setEnd(e.target.value); setErrors(p => ({ ...p, end: '' })); }}
                    className={`${inputCls(errors.end)} pl-10`}
                  />
                </div>
              </Field>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <Toggle
                  checked={allowPartialRoute} onChange={setAllowPartial}
                  label="Allow passengers to book partial segments"
                  hint="e.g. someone only going half your route — improves bookings"
                />
              </div>
            </div>
          )}

          {/* ── STEP 2: Schedule + Seats + Pricing ───────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">When &amp; how much?</h2>
                <p className="text-sm text-gray-500">Set your departure time and fair cost-sharing price.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Date" required error={errors.date}>
                  <input type="date" value={date} min={today} max="9999-12-31"
                    onChange={e => { setDate(clampDateInput(e.target.value)); setErrors(p => ({ ...p, date: '' })); }}
                    className={inputCls(errors.date)} />
                </Field>
                <Field label="Departure time" required error={errors.time}>
                  <input type="time" value={time}
                    onChange={e => { setTime(e.target.value); setErrors(p => ({ ...p, time: '' })); }}
                    className={inputCls(errors.time)} />
                </Field>
              </div>

              {/* Seats stepper */}
              <Field label="Available seats" required error={errors.seats} hint="How many passengers can join? (1–8)">
                <div className="flex items-center gap-4 mt-1">
                  <button type="button" onClick={() => setSeats(s => Math.max(1, parseInt(s) - 1))}
                    className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 transition-colors text-lg">−</button>
                  <input
                    type="number" min={1} max={8} value={seats}
                    onChange={e => setSeats(Math.min(8, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-16 text-center border-2 border-gray-300 rounded-xl py-2 text-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button type="button" onClick={() => setSeats(s => Math.min(8, parseInt(s) + 1))}
                    className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 transition-colors text-lg">+</button>
                  <span className="text-sm text-gray-400">{seats === 1 ? '1 passenger' : `${seats} passengers`}</span>
                </div>
              </Field>

              {/* Fare — uses celebration or standard preview based on flag */}
              <Field
                label="Cost per seat (₹)"
                required
                error={errors.fare}
                hint="What you want each passenger to contribute to your fuel cost"
              >
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-gray-500 text-sm">₹</span>
                  <input
                    type="number" min={1} step={1} placeholder="e.g. 500"
                    value={fare}
                    onChange={e => { setFare(e.target.value); setErrors(p => ({ ...p, fare: '' })); }}
                    className={`${inputCls(errors.fare)} pl-8`}
                  />
                </div>

                {/*
                  ── Fare preview switcher ──────────────────────────────────
                  isFirstRideOffer=true  → celebration UI with confetti +
                                           chat thread + waived-fee breakdown
                  isFirstRideOffer=false → standard earnings breakdown card
                */}
                {isFirstRideOffer
                  ? <FirstRideCelebration fare={fare} seats={seats} />
                  : <FarePreview         fare={fare} seats={seats} />
                }
              </Field>

              {/* Posting policy notice */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">Posting policy</p>
                <ul className="mt-2 space-y-1 text-xs text-amber-700">
                  <li>• First offer is free to post. On the first eligible booking, platform fee and GST are shown but waived.</li>
                  <li>• Standard model: passenger pays fare + 3% platform fee + 5% GST on fare plus platform fee.</li>
                  <li>• Cancellations 24+ hours before departure are free. Later cancellations incur a 3% charge.</li>
                </ul>
              </div>

              {/* Round-trip */}
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <Toggle checked={isRoundTrip} onChange={handleRoundTripToggle}
                  label="Offer a return trip" hint="Add a return date and time for the same route" />
                {isRoundTrip && (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Return date" required error={errors.returnDate}>
                        <input type="date" value={returnDate} min={date || today} max="9999-12-31"
                          onChange={e => { setReturnDate(clampDateInput(e.target.value)); setErrors(p => ({ ...p, returnDate: '' })); }}
                          className={inputCls(errors.returnDate)} />
                      </Field>
                      <Field label="Return time" required error={errors.returnTime}>
                        <input type="time" value={returnTime}
                          onChange={e => { setReturnTime(e.target.value); setErrors(p => ({ ...p, returnTime: '' })); }}
                          className={inputCls(errors.returnTime)} />
                      </Field>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-white p-3">
                      <Toggle checked={reusePreviousTripOptions} onChange={setReusePreviousTripOptions}
                        label="Reuse previous trip options for the return ride"
                        hint="Same route, seats, fare, vehicle and preferences will be reused" />
                    </div>
                  </div>
                )}
              </div>

              {/* Fare toggles */}
              <div className="border border-gray-100 rounded-xl divide-y divide-gray-100">
                <div className="px-4"><Toggle checked={tollIncluded} onChange={setTollIncluded} label="Toll charges included in fare" hint="Check this if tolls are already factored in" /></div>
                <div className="px-4"><Toggle checked={negotiableFare} onChange={setNegotiable} label="Fare is negotiable" hint="Passengers may request a lower price" /></div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Vehicle + Contact ─────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Vehicle &amp; contact</h2>
                <p className="text-sm text-gray-500">Passengers need this to identify your vehicle and reach you.</p>
              </div>

              <Field label="Registration number" required error={errors.vehicleNumber} hint="e.g. PB10AB1234">
                <input
                  type="text" placeholder="PB10AB1234"
                  value={vehicleNumber}
                  onChange={e => { setVehicleNumber(e.target.value.toUpperCase().replace(/\s/g, '')); setErrors(p => ({ ...p, vehicleNumber: '' })); }}
                  maxLength={13}
                  className={`${inputCls(errors.vehicleNumber)} uppercase font-mono tracking-widest`}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Vehicle type">
                  <div className="relative">
                    <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} className={selectCls(false)}>
                      {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </Field>
                <Field label="Luggage space">
                  <div className="relative">
                    <select value={luggageSpace} onChange={e => setLuggageSpace(e.target.value)} className={selectCls(false)}>
                      {LUGGAGE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Model" hint="optional">
                  <input type="text" placeholder="e.g. Honda City" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} className={inputCls(false)} />
                </Field>
                <Field label="Color" hint="optional">
                  <input type="text" placeholder="e.g. White" value={vehicleColor} onChange={e => setVehicleColor(e.target.value)} className={inputCls(false)} />
                </Field>
              </div>

              <div className="bg-gray-50 rounded-xl px-4 border border-gray-100">
                <Toggle checked={acAvailable} onChange={setAcAvailable} label="AC available in vehicle" />
              </div>

              <div className="border-t border-gray-100 pt-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Contact &amp; Pickup</p>

                <Field label="Contact number" required error={errors.phoneNumber}
                  hint={user?.phone ? 'Auto-filled from your profile — edit if needed' : 'Passengers will call/WhatsApp this number'}>
                  <input
                    type="tel" placeholder="98765 43210"
                    value={phoneNumber}
                    onChange={e => { setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10)); setErrors(p => ({ ...p, phoneNumber: '' })); }}
                    maxLength={10}
                    className={inputCls(errors.phoneNumber)}
                  />
                </Field>

                <div className="mt-4">
                  <Field label="Pickup address" required error={errors.address} hint="Street / landmark — enough for a passenger to find you">
                    <textarea
                      placeholder="e.g. Near HDFC Bank, GT Road, Phagwara Bus Stand"
                      value={address}
                      onChange={e => { setAddress(e.target.value); setErrors(p => ({ ...p, address: '' })); }}
                      rows={2} maxLength={300}
                      className={`${inputCls(errors.address)} resize-none`}
                    />
                    <p className="text-xs text-gray-400 mt-0.5 text-right">{address.length}/300</p>
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Pickup instructions" hint="Optional — special directions or meeting point">
                    <input
                      type="text" placeholder="e.g. Call when 5 min away, I'll come out"
                      value={pickupInstructions}
                      onChange={e => setPickupInstructions(e.target.value)}
                      maxLength={200}
                      className={inputCls(false)}
                    />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: Preferences + Notes ──────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Ride preferences</h2>
                <p className="text-sm text-gray-500">Help passengers know what to expect. These show on your ride card.</p>
              </div>

              <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-hidden">
                <div className="px-4"><Toggle checked={musicAllowed}   onChange={setMusicAllowed}   label="🎵  Music allowed" /></div>
                <div className="px-4"><Toggle checked={smokingAllowed} onChange={setSmokingAllowed} label="🚬  Smoking allowed" /></div>
                <div className="px-4"><Toggle checked={petFriendly}    onChange={setPetFriendly}    label="🐾  Pet friendly" /></div>
                <div className="px-4"><Toggle checked={luggageAllowed} onChange={setLuggageAllowed} label="🧳  Luggage allowed" /></div>
                <div className="px-4"><Toggle checked={womenOnly}      onChange={setWomenOnly}      label="👩  Women passengers only" /></div>
              </div>

              <Field label="Additional notes" hint="Optional — anything else passengers should know">
                <textarea
                  placeholder="e.g. I stop for chai once. No loud calls during drive."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4} maxLength={500}
                  className={`${inputCls(false)} resize-none`}
                />
                <p className="text-xs text-gray-400 text-right mt-0.5">{notes.length}/500</p>
              </Field>
            </div>
          )}

          {/* ── STEP 5: Review & Publish ──────────────────────────────────── */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Review &amp; publish</h2>
                <p className="text-sm text-gray-500">This is exactly how passengers will discover your ride.</p>
              </div>

              <RidePreviewCard data={{ ...formData, notes }} user={user} isFirstRideOffer={isFirstRideOffer} />

              {/* Quick summary checklist */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Summary</p>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Route',       val: start && end ? `${start} → ${end}` : null },
                    { label: 'Date',        val: date ? new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) + ` at ${time}` : null },
                    { label: 'Seats',       val: `${seats} seat${seats > 1 ? 's' : ''} available` },
                    { label: 'Fare',        val: fare ? `₹${fare} per seat • passenger pays ₹${PaymentCalculator.calculatePassengerTotal(parseFloat(fare), 1, { waivePlatformCharges: isFirstRideOffer }).totalPassengerPays.toFixed(0)} incl. fees${isFirstRideOffer ? ' (waived)' : ''}` : null },
                    { label: 'Round trip',  val: isRoundTrip ? `Return ${returnDate ? new Date(returnDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'selected'} at ${returnTime || 'time'}` : 'One way' },
                    { label: 'Vehicle',     val: vehicleNumber || null },
                    { label: 'Contact',     val: phoneNumber || null },
                  ].map(({ label, val }) => val ? (
                    <div key={label} className="flex gap-3">
                      <span className="text-gray-400 w-20 flex-shrink-0">{label}</span>
                      <span className="text-gray-800 font-medium">{val}</span>
                    </div>
                  ) : null)}
                </div>
              </div>

              {/* First-ride callout on review step */}
              {isFirstRideOffer && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                  <span className="text-2xl flex-shrink-0">🎉</span>
                  <div>
                    <p className="text-sm font-semibold text-green-800">First ride offer active</p>
                    <p className="text-xs text-green-700 mt-0.5">Platform fee &amp; GST waived on your first confirmed booking. Passengers pay exactly what you set.</p>
                  </div>
                </div>
              )}

              <p className="text-xs text-center text-gray-400">
                By publishing, you agree to ShareMyRide's community guidelines. Your contact number will be shared with confirmed passengers.
              </p>
            </div>
          )}

          {/* ── Navigation ─────────────────────────────────────────────────── */}
          <div className={`flex gap-3 mt-8 ${step > 1 ? 'justify-between' : 'justify-end'}`}>
            {step > 1 && (
              <button
                type="button" onClick={handleBack}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
            )}

            {step < STEPS.length ? (
              <button
                type="button" onClick={handleNext}
                className="flex items-center gap-2 ml-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-md hover:shadow-lg"
              >
                Continue
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            ) : (
              <button
                type="submit" disabled={isLoading}
                className="flex items-center gap-2 ml-auto bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Publishing…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Publish Ride
                  </>
                )}
              </button>
            )}
          </div>

        </div>
      </form>
    </div>
  );
}

export default RideForm;
