import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../config/api.js';
import { useAuth } from '../../hooks/useAuth.jsx';

// ─── Formatters ───────────────────────────────────────────────────────────────
function formatNumber(num) {
  if (!num || num === 0) return '0';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toLocaleString('en-IN');
}
function formatRating(r) {
  return r && r > 0 ? Number(r).toFixed(1) : '4.8';
}
function formatDate(dateStr, timeStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const isToday = d.toDateString() === today.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const label = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return timeStr ? `${label}, ${timeStr}` : label;
}
function greet() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="w-14 h-8 bg-gray-200 rounded ml-3" />
      </div>
      <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
        <div className="w-7 h-7 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-1">
          <div className="h-3 bg-gray-200 rounded w-24" />
          <div className="h-2.5 bg-gray-200 rounded w-16" />
        </div>
        <div className="w-16 h-5 bg-gray-200 rounded-full" />
      </div>
    </div>
  );
}

// ─── Ride Card ────────────────────────────────────────────────────────────────
function RideCard({ ride }) {
  const driver = ride.driverId || ride.driver || {};
  const driverName = ride.driverInfo?.name || driver.name || 'Driver';
  const driverAvatar = ride.driverInfo?.photoURL || driver.avatar || null;
  const driverRating = driver.ratingSummary || ride.ratingSummary || 0;
  const isVerified = ride.driverInfo?.verified || driver.isDriverVerified || false;
  const availableSeats = ride.availableSeats ?? ride.seats ?? 0;
  const vehicle = ride.vehicle || {};
  const vehicleLabel = [vehicle.color, vehicle.model, vehicle.type].filter(Boolean).join(' · ') || vehicle.type || '';

  return (
    <Link
      to={`/ride/${ride._id}`}
      className="group block bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50/60 transition-all duration-200 overflow-hidden"
    >
      <div className="p-4 sm:p-5">
        {/* Route */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-0.5" />
              <span className="font-semibold text-gray-900 text-sm leading-tight truncate">{ride.start}</span>
            </div>
            <div className="ml-[3px] border-l-2 border-dashed border-gray-200 h-3 my-0.5" />
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-0.5" />
              <span className="font-semibold text-gray-900 text-sm leading-tight truncate">{ride.end}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-lg font-bold text-blue-600">₹{ride.segmentFare || ride.fare}</div>
            <div className="text-xs text-gray-400">per seat</div>
          </div>
        </div>

        {/* Vehicle tag */}
        {vehicleLabel ? (
          <div className="text-xs text-gray-400 mb-3 ml-4 truncate">{vehicleLabel}{vehicle.acAvailable ? ' · AC' : ''}</div>
        ) : null}

        {/* Meta */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <div className="flex items-center gap-2 min-w-0">
            {driverAvatar ? (
              <img src={driverAvatar} alt={driverName} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {driverName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-gray-800 truncate">{driverName.split(' ')[0]}</span>
                {isVerified && (
                  <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              {driverRating > 0 && (
                <div className="flex items-center gap-0.5">
                  <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-xs text-gray-500">{Number(driverRating).toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${availableSeats <= 1 ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-700'}`}>
              {availableSeats} {availableSeats === 1 ? 'seat left' : 'seats'}
            </span>
            <span className="text-xs text-gray-400">{formatDate(ride.date, ride.time)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyRideFeed({ isLoggedIn }) {
  return (
    <div className="col-span-full bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
      <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      </div>
      <p className="font-semibold text-gray-800 mb-1">No rides available right now</p>
      <p className="text-sm text-gray-500 mb-4">Be the first to offer a ride on this route.</p>
      <Link to="/ride/post" className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Offer a ride
      </Link>
    </div>
  );
}

// ─── Floating Ring Tagline ────────────────────────────────────────────────────
const TAGLINES = [
  { text: 'Verified riders.', icon: '🛡️' },
  { text: 'Shared journeys.', icon: '🤝' },
  { text: 'Better commuting.', icon: '🚗' },
];

function FloatingRingTagline() {
  const [activeIdx, setActiveIdx] = React.useState(0);
  const [phase, setPhase] = React.useState('in'); // 'in' | 'hold' | 'out'

  React.useEffect(() => {
    let t;
    if (phase === 'in') {
      t = setTimeout(() => setPhase('hold'), 600);
    } else if (phase === 'hold') {
      t = setTimeout(() => setPhase('out'), 2200);
    } else {
      t = setTimeout(() => {
        setActiveIdx(i => (i + 1) % TAGLINES.length);
        setPhase('in');
      }, 500);
    }
    return () => clearTimeout(t);
  }, [phase]);

  const current = TAGLINES[activeIdx];

  const scaleVal   = phase === 'in' ? 1   : phase === 'hold' ? 1   : 0.82;
  const opacityVal = phase === 'in' ? 1   : phase === 'hold' ? 1   : 0;
  const yVal       = phase === 'in' ? '0px' : phase === 'hold' ? '0px' : '12px';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
      }}
    >
      {/* Outer glow wrapper */}
      <div style={{ position: 'relative', width: '220px', height: '220px' }}>

        {/* Rotating dashed orbit ring */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          border: '2px dashed rgba(99,179,237,0.35)',
          animation: 'smr-spin 8s linear infinite',
        }} />

        {/* Slower counter-rotating ring */}
        <div style={{
          position: 'absolute', inset: '14px',
          borderRadius: '50%',
          border: '1.5px dashed rgba(154,230,180,0.3)',
          animation: 'smr-spin-rev 12s linear infinite',
        }} />

        {/* Pulse glow backdrop */}
        <div style={{
          position: 'absolute', inset: '28px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,179,237,0.12) 0%, transparent 70%)',
          animation: 'smr-pulse-ring 3s ease-in-out infinite',
        }} />

        {/* Glowing orbit dot */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: '10px', height: '10px',
          marginTop: '-110px',
          marginLeft: '-5px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #63b3ed, #68d391)',
          boxShadow: '0 0 8px 3px rgba(99,179,237,0.5)',
          animation: 'smr-orbit-dot 8s linear infinite',
          transformOrigin: '5px 110px',
        }} />

        {/* Inner circle with tagline */}
        <div style={{
          position: 'absolute', inset: '36px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.45s ease',
          transform: `scale(${scaleVal}) translateY(${yVal})`,
          opacity: opacityVal,
        }}>
          <span style={{ fontSize: '26px', lineHeight: 1 }}>{current.icon}</span>
          <span style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.3,
            letterSpacing: '0.01em',
            padding: '0 10px',
          }}>{current.text}</span>
        </div>

        {/* Active indicator dots */}
        <div style={{
          position: 'absolute',
          bottom: '-18px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '6px',
        }}>
          {TAGLINES.map((_, i) => (
            <div key={i} style={{
              width: i === activeIdx ? '18px' : '6px',
              height: '6px',
              borderRadius: '3px',
              background: i === activeIdx ? '#63b3ed' : 'rgba(255,255,255,0.25)',
              transition: 'width 0.4s ease, background 0.4s ease',
            }} />
          ))}
        </div>

        {/* Keyframe injector */}
        <style>{`
          @keyframes smr-spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes smr-spin-rev {
            from { transform: rotate(0deg); }
            to   { transform: rotate(-360deg); }
          }
          @keyframes smr-pulse-ring {
            0%, 100% { transform: scale(0.95); opacity: 0.7; }
            50%       { transform: scale(1.05); opacity: 1; }
          }
          @keyframes smr-orbit-dot {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGED-IN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function LoggedInDashboard({ user, stats, rides, ridesLoading }) {
  const firstName = user?.name?.split(' ')[0] || 'Traveller';
  const avatar = user?.avatar || null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard hero */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 pt-6 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              {avatar ? (
                <img src={avatar} alt={firstName} className="w-11 h-11 rounded-full object-cover border-2 border-white/30 flex-shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                  {firstName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-blue-200 text-xs font-medium">
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                  {greet()}, {firstName} 👋
                </h1>
                <p className="text-blue-200 text-xs mt-0.5">Where are you headed today?</p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link to="/ride/search" className="flex items-center gap-1.5 bg-white text-blue-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-50 transition-colors shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Find a ride
              </Link>
              {(user?.role === 'driver' || user?.isDriverVerified) && (
                <Link to="/ride/post" className="flex items-center gap-1.5 bg-green-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-400 transition-colors shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Offer a ride
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16">
        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Upcoming Trips', to: '/upcoming-rides', icon: '📅', bg: 'bg-blue-50 border-blue-100', text: 'text-blue-700' },
            { label: 'My Bookings', to: '/bookings/my-bookings', icon: '🎫', bg: 'bg-green-50 border-green-100', text: 'text-green-700' },
            { label: 'Ride Requests', to: '/notifications', icon: '🔔', bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700' },
            { label: 'Profile', to: '/profile', icon: '👤', bg: 'bg-purple-50 border-purple-100', text: 'text-purple-700' },
          ].map(card => (
            <Link key={card.label} to={card.to} className={`${card.bg} border rounded-2xl p-4 sm:p-5 flex flex-col items-start gap-2 hover:shadow-md transition-all duration-150`}>
              <span className="text-2xl">{card.icon}</span>
              <span className={`text-xs sm:text-sm font-semibold ${card.text}`}>{card.label}</span>
            </Link>
          ))}
        </div>

        {/* Driver upsell — only for non-drivers */}
        {!user?.isDriverVerified && user?.role !== 'driver' && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-100 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900 text-sm">Want to offer rides and earn back fuel costs?</p>
              <p className="text-xs text-gray-500 mt-0.5">Complete driver verification to start posting rides.</p>
            </div>
            <Link to="/driver-verification" className="flex-shrink-0 inline-flex items-center gap-1.5 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
              Become a driver →
            </Link>
          </div>
        )}

        {/* Floating ring tagline — replaces static stats */}
        <div className="flex justify-center mb-6">
          <FloatingRingTagline />
        </div>

        {/* Live ride feed */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Rides leaving soon</h2>
              {!ridesLoading && rides.length > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">{rides.length} available · updated just now</p>
              )}
            </div>
            <Link to="/ride/search" className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
              View all
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {ridesLoading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              : rides.length > 0
                ? rides.slice(0, 8).map(ride => <RideCard key={ride._id} ride={ride} />)
                : <EmptyRideFeed isLoggedIn />
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC LANDING PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function StatItem({ value, label, color, loading }) {
  return (
    <div>
      {loading ? (
        <div className="h-7 w-16 bg-white/20 animate-pulse rounded mb-1" />
      ) : (
        <div className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</div>
      )}
      <div className="text-xs text-blue-200 font-medium">{label}</div>
    </div>
  );
}

function PublicLanding({ stats, rides, ridesLoading }) {
  const navigate = useNavigate();
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchFrom) params.set('start', searchFrom);
    if (searchTo) params.set('end', searchTo);
    navigate(`/ride/search?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO ── */}
      <section className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-green-500/10 pointer-events-none" aria-hidden="true" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10 sm:pt-16 sm:pb-14 lg:pt-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 text-blue-100 text-xs font-semibold px-3 py-1.5 rounded-full mb-5 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Community carpooling · India
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight mb-4">
              Your next trip is{' '}
              <span className="text-green-300">already on its way.</span>
            </h1>
            <p className="text-blue-100 text-base sm:text-lg leading-relaxed mb-8 max-w-xl">
              Connect with verified drivers and passengers going your way. Share the cost, halve the traffic.
            </p>

            {/* Quick search */}
            <form onSubmit={handleSearch} className="bg-white rounded-2xl p-2 shadow-2xl shadow-blue-900/30 flex flex-col sm:flex-row gap-2 max-w-xl">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Leaving from…"
                    value={searchFrom}
                    onChange={e => setSearchFrom(e.target.value)}
                    className="flex-1 bg-transparent text-gray-900 text-sm placeholder-gray-400 outline-none min-w-0"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m0 0l-7-7m7 7l-7 7" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Going to…"
                    value={searchTo}
                    onChange={e => setSearchTo(e.target.value)}
                    className="flex-1 bg-transparent text-gray-900 text-sm placeholder-gray-400 outline-none min-w-0"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </button>
            </form>

            <p className="mt-4 text-blue-200 text-sm">
              Driving somewhere?{' '}
              <Link to="/ride/post" className="text-white font-semibold underline underline-offset-2 hover:text-green-300 transition-colors">
                Offer seats and recover fuel costs →
              </Link>
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative bg-blue-800/40 backdrop-blur-sm border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-2 sm:gap-6 flex-nowrap">
                <StatItem value={formatNumber(stats.totalUsers || 0)} label="Members" color="text-white" loading={stats.loading} />
                <div className="w-px h-7 bg-white/15 flex-shrink-0" />
                <StatItem value={formatNumber(stats.totalRides || 0)} label="Rides shared" color="text-white" loading={stats.loading} />
                <div className="w-px h-7 bg-white/15 flex-shrink-0" />
                <StatItem value={formatNumber(stats.totalCities || 0)} label="Cities" color="text-white" loading={stats.loading} />
                <div className="w-px h-7 bg-white/15 flex-shrink-0" />
                <StatItem value={`${formatRating(stats.averageRating)}★`} label="Avg. rating" color="text-amber-300" loading={stats.loading} />
              </div>
              <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0 text-blue-200 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Live
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE RIDE FEED ── */}
      <section id="live-rides" className="bg-gray-50 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-6 sm:mb-8">
            <div>
              <p className="text-blue-600 text-xs font-semibold uppercase tracking-widest mb-1">Available now</p>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Rides leaving soon</h2>
              {!ridesLoading && rides.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">{rides.length} rides found · no account needed to browse</p>
              )}
            </div>
            <Link to="/ride/search" className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 flex-shrink-0">
              Browse all
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {ridesLoading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              : rides.length > 0
                ? rides.slice(0, 8).map(ride => <RideCard key={ride._id} ride={ride} />)
                : <EmptyRideFeed />
            }
          </div>

          {rides.length > 0 && (
            <div className="mt-8 text-center">
              <Link to="/ride/search" className="inline-flex items-center gap-2 border border-blue-200 text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-xl text-sm font-semibold transition-colors">
                See all available rides
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── VALUE PROPS ── */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg mb-10 sm:mb-12">
            <p className="text-blue-600 text-xs font-semibold uppercase tracking-widest mb-2">Why ShareMyRide</p>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Built for real commuters, not tourists</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                iconBg: 'bg-blue-50',
                icon: <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
                title: 'Verified drivers only',
                desc: 'Every driver submits Aadhaar, driving licence, and vehicle docs. You see their rating history before you request.',
              },
              {
                iconBg: 'bg-green-50',
                icon: <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                title: 'Fair cost-sharing',
                desc: "Drivers set a per-seat price to cover fuel — not to profit. Passengers pay a fraction of what a solo trip would cost.",
              },
              {
                iconBg: 'bg-purple-50',
                icon: <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                title: 'Less traffic, less carbon',
                desc: 'Every filled seat is one fewer car on the road. This community has already saved thousands of solo trips.',
              },
            ].map(v => (
              <div key={v.title} className="flex gap-4 p-5 sm:p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-150">
                <div className={`${v.iconBg} w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0`}>{v.icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{v.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg mb-10 sm:mb-12">
            <p className="text-blue-600 text-xs font-semibold uppercase tracking-widest mb-2">Simple by design</p>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">From sign-up to departure in minutes</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative">
            {[
              { step: '01', title: 'Create your account', desc: 'Sign up free. Verify your phone. Done in under 2 minutes.' },
              { step: '02', title: 'Search or post a ride', desc: 'Browse live rides or list your own route with available seats and your price.' },
              { step: '03', title: 'Request or accept', desc: 'Passengers send a request. Drivers approve. Both get contact details.' },
              { step: '04', title: 'Travel and rate', desc: 'Share the road. After arrival, rate the experience to build trust for the next rider.' },
            ].map((s, i) => (
              <div key={s.step} className="relative bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm">
                <div className="text-4xl font-black text-gray-100 mb-3 leading-none select-none">{s.step}</div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1.5">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                {i < 3 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-3 z-10 -translate-y-1/2 w-6 h-6 bg-white border border-gray-100 rounded-full items-center justify-center shadow-sm">
                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-blue-700 via-blue-600 to-green-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Ready to share your next ride?
          </h2>
          <p className="text-blue-100 text-sm sm:text-base mb-8 max-w-lg mx-auto">
            Join {stats.totalUsers > 0 ? `${formatNumber(stats.totalUsers)} members` : 'a growing community'} already saving money and reducing traffic together.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup" className="inline-flex items-center justify-center gap-2 bg-white text-blue-700 px-6 py-3.5 rounded-xl text-sm font-bold hover:bg-blue-50 hover:shadow-lg transition-all duration-150">
              Create free account
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <button
              onClick={() => {
                const el = document.getElementById('live-rides');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="inline-flex items-center justify-center gap-2 border border-white/30 text-white hover:bg-white/10 px-6 py-3.5 rounded-xl text-sm font-semibold transition-colors"
            >
              Browse rides — no account needed
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT: fetch data, decide which view to render
// ═══════════════════════════════════════════════════════════════════════════════
function Home() {
  const { user, isLoading: authLoading } = useAuth();

  const [stats, setStats] = useState({
    totalUsers: 0, totalRides: 0, totalCities: 0, averageRating: 0, loading: true,
  });
  const [rides, setRides] = useState([]);
  const [ridesLoading, setRidesLoading] = useState(true);

  // ── Fetch platform stats ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/stats/home');
        // Response shape: { success: true, data: { totalUsers, totalRides, totalCities, averageRating } }
        const d = res.data?.data || res.data;
        setStats({
          totalUsers: d.totalUsers || 0,
          totalRides: d.totalRides || 0,
          totalCities: d.totalCities || 0,
          averageRating: d.averageRating || 0,
          loading: false,
        });
      } catch {
        setStats(s => ({ ...s, loading: false }));
      }
    };
    fetchStats();
  }, []);

  // ── Fetch live ride feed ──────────────────────────────────────────────────
  // Uses /api/rides/featured for the homepage teaser (public, no auth needed).
  // Falls back to /api/rides/search with no filters if featured returns empty.
  useEffect(() => {
    const fetchRides = async () => {
      setRidesLoading(true);
      try {
        let res = await api.get('/rides/featured', { params: { limit: 8 } });
        let data = res.data?.data || [];

        // Fallback: search for any upcoming rides if featured list is empty
        if (!data.length) {
          res = await api.get('/rides/search', {
            params: { start: '', end: '', limit: 8 },
          });
          data = res.data?.data || [];
        }

        setRides(data);
      } catch {
        // If both fail, leave rides as empty array — EmptyRideFeed handles the UI
        setRides([]);
      } finally {
        setRidesLoading(false);
      }
    };

    // Defer until auth loading is done so the token interceptor is ready
    if (!authLoading) fetchRides();
  }, [authLoading]);

  // Show a minimal full-page loading state while auth restores session
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <LoggedInDashboard user={user} stats={stats} rides={rides} ridesLoading={ridesLoading} />;
  }

  return <PublicLanding stats={stats} rides={rides} ridesLoading={ridesLoading} />;
}

export default Home;