import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RideForm from '../../components/ride/RideForm';
import { postRide, getMyRides, deleteRide } from '../../services/rideService';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import PaymentCalculator from '../../utils/paymentCalculator';
import PaymentBreakdownCard from '../../components/PaymentBreakdownCard';
import api from '../../config/api.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function getAvailableSeats(ride) {
  if (!ride.bookings?.length) return ride.availableSeats ?? ride.seats;
  const booked = ride.bookings
    .filter(b => ['confirmed', 'pending', 'accepted'].includes(b.status))
    .reduce((sum, b) => sum + (b.seatsBooked || 1), 0);
  return Math.max(0, ride.seats - booked);
}

// ─── Shared icon: verified shield ─────────────────────────────────────────────
function VerifiedIcon({ className = 'w-3.5 h-3.5 text-blue-500' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

// ─── Status Pill — matches Home.jsx inline-flex pill pattern ──────────────────
function StatusPill({ rideStatus, availableSeats }) {
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold';
  if (rideStatus === 'cancelled') return (
    <span className={`${base} bg-red-100 text-red-700`}>
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />Cancelled
    </span>
  );
  if (rideStatus === 'completed') return (
    <span className={`${base} bg-purple-100 text-purple-700`}>
      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />Completed
    </span>
  );
  if (rideStatus === 'in_progress') return (
    <span className={`${base} bg-blue-100 text-blue-700`}>
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />In progress
    </span>
  );
  if (availableSeats === 0) return (
    <span className={`${base} bg-orange-100 text-orange-700`}>
      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />Fully booked
    </span>
  );
  return (
    <span className={`${base} bg-green-100 text-green-700`}>
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />Active
    </span>
  );
}

// ─── Skeleton Card — same pattern as Home.jsx SkeletonCard ───────────────────
function SkeletonRideCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-1 bg-gray-200" />
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
          <div className="w-14 h-8 bg-gray-200 rounded ml-3" />
        </div>
        <div className="grid grid-cols-4 gap-2 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-14" />
          ))}
        </div>
        <div className="h-9 bg-gray-100 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Ride management card ─────────────────────────────────────────────────────
function RideCard({ ride, onDelete, isDeleting, onExpand, isExpanded }) {
  const availableSeats = getAvailableSeats(ride);
  const bookedSeats = ride.seats - availableSeats;
  const driverCalc = PaymentCalculator.calculateDriverEarnings(parseFloat(ride.fare) || 0, ride.seats);
  const pendingCount = ride.bookings?.filter(b => b.status === 'pending').length || 0;
  const confirmedCount = ride.bookings?.filter(b => ['confirmed', 'accepted'].includes(b.status)).length || 0;
  const isInactive = ['cancelled', 'completed'].includes(ride.rideStatus);

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all duration-200
      ${isInactive
        ? 'border-gray-100 opacity-70'
        : 'border-gray-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50/60'
      }`}
    >
      {/* Top accent strip — matches Home.jsx header gradient */}
      <div className={`px-4 py-3 flex items-center justify-between gap-2
        ${isInactive
          ? 'bg-gray-100'
          : 'bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg className={`w-3.5 h-3.5 flex-shrink-0 ${isInactive ? 'text-gray-400' : 'text-blue-200'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className={`text-xs font-medium truncate ${isInactive ? 'text-gray-500' : 'text-blue-100'}`}>
            {formatDate(ride.date)}{ride.time ? ` · ${formatTime(ride.time)}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusPill rideStatus={ride.rideStatus} availableSeats={availableSeats} />
          {!isInactive && (
            <button
              onClick={() => onDelete(ride._id)}
              disabled={isDeleting}
              title="Cancel ride"
              className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/15 hover:bg-red-500 text-white transition-all duration-150 disabled:opacity-40 flex-shrink-0"
            >
              {isDeleting
                ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              }
            </button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {/* Route — same dot + dashed line pattern as Home.jsx RideCard */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex flex-col items-center gap-0.5 mt-1 flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="w-px h-6 bg-gray-200" />
            <span className="w-2 h-2 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{ride.start}</p>
            {ride.waypoints?.filter(w => w.location).map((w, i) => (
              <p key={i} className="text-xs text-gray-400 py-0.5 pl-2">via {w.location}</p>
            ))}
            <p className="font-semibold text-gray-900 text-sm truncate mt-1.5">{ride.end}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-blue-600">₹{ride.fare}</p>
            <p className="text-xs text-gray-400">per seat</p>
          </div>
        </div>

        {/* Stats grid — same bg-[color]-50 cell pattern as Home.jsx stats strip */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-gray-50 rounded-xl p-2.5 text-center border border-gray-100">
            <p className="text-[10px] text-gray-400 mb-0.5">Seats</p>
            <p className="text-base font-bold text-gray-900">{ride.seats}</p>
          </div>
          <div className={`rounded-xl p-2.5 text-center border ${bookedSeats > 0 ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
            <p className="text-[10px] text-gray-400 mb-0.5">Booked</p>
            <p className={`text-base font-bold ${bookedSeats > 0 ? 'text-amber-600' : 'text-green-600'}`}>{bookedSeats}/{ride.seats}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-2.5 text-center border border-blue-100">
            <p className="text-[10px] text-gray-400 mb-0.5">Free</p>
            <p className="text-base font-bold text-blue-600">{availableSeats}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-2.5 text-center border border-green-100">
            <p className="text-[10px] text-gray-400 mb-0.5">{ride.rideStatus === 'completed' ? 'Earned' : 'Max'}</p>
            <p className="text-base font-bold text-green-600">₹{driverCalc.totalDriverEarnings.toFixed(0)}</p>
          </div>
        </div>

        {/* Booking request pills — only for active rides */}
        {!isInactive && ride.bookings?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-full font-semibold">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {pendingCount} pending
              </span>
            )}
            {confirmedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2.5 py-1 rounded-full font-semibold">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {confirmedCount} confirmed
              </span>
            )}
            <Link
              to="/notifications"
              className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold hover:bg-blue-200 transition-colors"
            >
              Manage →
            </Link>
          </div>
        )}

        {/* Expand toggle — ghost button matching Home.jsx style */}
        <button
          type="button"
          onClick={() => onExpand(isExpanded ? null : ride._id)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150"
        >
          {isExpanded ? 'Hide details' : 'View full details'}
          <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Expanded details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <PaymentBreakdownCard
              baseFare={parseFloat(ride.fare) || 0}
              seatsBooked={ride.seats}
              showDriverView
              showPassengerView={false}
            />

            {ride.vehicle && (
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                <p className="text-xs font-bold text-purple-700 uppercase tracking-widest mb-3">Vehicle</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { label: 'Number', val: ride.vehicleNumber || ride.vehicle?.number },
                    { label: 'Type', val: ride.vehicle?.type },
                    { label: 'Model', val: ride.vehicle?.model || '—' },
                    { label: 'Color', val: ride.vehicle?.color || '—' },
                    { label: 'AC', val: ride.vehicle?.acAvailable ? '✓ Yes' : '✗ No' },
                    { label: 'Luggage', val: ride.vehicle?.luggageSpace || '—' },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
                      <p className="text-xs font-semibold text-gray-800 uppercase">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-3">Contact & Pickup</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Phone</span>
                  <span className="text-xs font-semibold text-gray-800">{ride.phoneNumber}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-xs text-gray-400 flex-shrink-0">Address</span>
                  <span className="text-xs font-semibold text-gray-800 text-right">{ride.address}</span>
                </div>
                {ride.pickupInstructions && (
                  <div className="flex justify-between gap-4">
                    <span className="text-xs text-gray-400 flex-shrink-0">Instructions</span>
                    <span className="text-xs font-medium text-gray-700 text-right">{ride.pickupInstructions}</span>
                  </div>
                )}
              </div>
            </div>

            {ride.preferences && (
              <div className="bg-pink-50 border border-pink-100 rounded-xl p-4">
                <p className="text-xs font-bold text-pink-700 uppercase tracking-widest mb-3">Preferences</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'smokingAllowed', label: 'Smoking' },
                    { key: 'musicAllowed', label: 'Music' },
                    { key: 'petFriendly', label: 'Pets' },
                    { key: 'luggageAllowed', label: 'Luggage' },
                    { key: 'womenOnly', label: 'Women only' },
                    { key: 'pickupFlexibility', label: 'Flexible pickup' },
                  ].map(({ key, label }) => ride.preferences[key] !== undefined && (
                    <div key={key} className="flex items-center gap-1.5">
                      <span className={`text-xs ${ride.preferences[key] ? 'text-green-500' : 'text-red-400'}`}>
                        {ride.preferences[key] ? '✓' : '✗'}
                      </span>
                      <span className="text-xs text-gray-600">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ride.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2">Notes</p>
                <p className="text-sm text-gray-700">{ride.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ filter }) {
  const messages = {
    active: { title: 'No active rides', sub: 'Post a ride above and it will appear here.' },
    completed: { title: 'No completed rides yet', sub: 'Completed rides will appear here after the trip date passes.' },
    cancelled: { title: 'No cancelled rides', sub: 'Rides you cancel will show up here.' },
  };
  const m = messages[filter] || messages.active;
  return (
    <div className="col-span-full bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
      <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
        </svg>
      </div>
      <p className="font-semibold text-gray-800 mb-1">{m.title}</p>
      <p className="text-sm text-gray-500 mb-4">{m.sub}</p>
      {filter === 'active' && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Post your first ride
        </button>
      )}
    </div>
  );
}

// ─── Auth gate ────────────────────────────────────────────────────────────────
function AuthGate() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-10 max-w-sm w-full text-center">
        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <p className="text-blue-600 text-xs font-semibold uppercase tracking-widest mb-2">Sign in required</p>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Post a ride</h2>
        <p className="text-sm text-gray-500 mb-6">Sign in to start sharing your journey and earning on every trip.</p>
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors mb-2"
        >
          Sign in
        </button>
        <button
          onClick={() => navigate('/signup')}
          className="w-full border border-gray-200 text-gray-600 hover:bg-gray-50 py-2.5 rounded-xl font-semibold text-sm transition-colors"
        >
          Create free account
        </button>
      </div>
    </div>
  );
}

// ─── Driver Verification Gate ─────────────────────────────────────────────────
function VerificationGate({ verificationStatus }) {
  const navigate = useNavigate();
  const [platformStats, setPlatformStats] = useState({
    totalUsers: 0,
    verifiedDrivers: 0,
    totalRides: 0,
    totalCities: 0,
    averageRating: 0,
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const res = await api.get('/stats/home');
        const data = res?.data?.data || {};
        if (!isMounted) return;
        setPlatformStats({
          totalUsers: Number(data.totalUsers || 0),
          verifiedDrivers: Number(data.verifiedDrivers || 0),
          totalRides: Number(data.totalRides || 0),
          totalCities: Number(data.totalCities || 0),
          averageRating: Number(data.averageRating || 0),
          loading: false,
        });
      } catch {
        if (isMounted) {
          setPlatformStats((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    fetchStats();
    return () => { isMounted = false; };
  }, []);

  const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);
  const formatRating = (value) => `${Number(value || 0).toFixed(1)}★`;

  const CONFIG = {
    not_started: {
      iconBg: 'bg-blue-50',
      icon: (
        <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      badge: null,
      heading: 'Verify your driver profile first',
      body: 'To post rides on ShareMyRide, complete a quick one-time verification. It keeps the community safe and builds passenger trust.',
      cta: 'Start driver verification',
      ctaStyle: 'bg-blue-600 hover:bg-blue-700 text-white',
      showDocs: true,
    },
    pending: {
      iconBg: 'bg-amber-50',
      icon: <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      badge: { label: 'Submitted · under review', color: 'bg-amber-100 text-amber-800' },
      heading: 'Your verification is being reviewed',
      body: 'Our team is checking your documents. This usually takes 1–2 business days. We will notify you by email once approved.',
      cta: 'View verification status',
      ctaStyle: 'bg-amber-500 hover:bg-amber-600 text-white',
      showDocs: false,
    },
    submitted: {
      iconBg: 'bg-amber-50',
      icon: <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      badge: { label: 'Documents submitted', color: 'bg-amber-100 text-amber-800' },
      heading: 'Under review — almost there',
      body: 'Your documents are with our team. We review every driver manually to maintain quality. You will hear back within 24 hours.',
      cta: 'View verification status',
      ctaStyle: 'bg-amber-500 hover:bg-amber-600 text-white',
      showDocs: false,
    },
    under_review: {
      iconBg: 'bg-amber-50',
      icon: <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      badge: { label: 'Final review in progress', color: 'bg-amber-100 text-amber-800' },
      heading: 'Our team is reviewing your documents',
      body: 'Everything looks good so far. Final approval is in progress. You will be notified by email once your driver profile is verified.',
      cta: 'View verification status',
      ctaStyle: 'bg-amber-500 hover:bg-amber-600 text-white',
      showDocs: false,
    },
    rejected: {
      iconBg: 'bg-red-50',
      icon: <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
      badge: { label: 'Action required', color: 'bg-red-100 text-red-800' },
      heading: 'Issue with your verification',
      body: 'There was a problem with your submitted documents. Please re-submit with clear, valid copies of your Aadhaar and Driving License.',
      cta: 'Re-submit documents',
      ctaStyle: 'bg-red-500 hover:bg-red-600 text-white',
      showDocs: false,
    },
    needs_info: {
      iconBg: 'bg-orange-50',
      icon: <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      badge: { label: 'Additional info needed', color: 'bg-orange-100 text-orange-800' },
      heading: 'We need a little more from you',
      body: 'Our team has flagged your verification and needs additional information. Please check your registered email or visit the verification page.',
      cta: 'Update verification',
      ctaStyle: 'bg-orange-500 hover:bg-orange-600 text-white',
      showDocs: false,
    },
  };

  const c = CONFIG[verificationStatus] || CONFIG.not_started;

  const benefits = [
    { icon: '🔵', text: 'Verified badge on every ride listing' },
    { icon: '📈', text: 'Higher search ranking, more booking requests' },
    { icon: '🤝', text: 'Passengers prefer and trust verified drivers' },
    { icon: '💰', text: 'Transparent payouts after each completed ride' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero strip — exact same as Home.jsx dashboard hero */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 pt-5 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <p className="text-blue-200 text-xs font-medium">Post a Ride · Driver Verification</p>
          </div>
          <h1 className="text-lg sm:text-2xl font-bold text-white">One step before you post</h1>
          <p className="text-blue-200 text-xs sm:text-sm mt-1">Complete verification to unlock ride posting</p>
        </div>
      </div>

      {/* Main content — floats up over hero like Home.jsx dashboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Left: gate card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
              {/* Top gradient accent */}
              <div className="h-1 bg-gradient-to-r from-blue-600 to-blue-400" />
              <div className="p-6 sm:p-8">
                {/* Icon + badge + heading */}
                <div className="flex flex-col items-center text-center mb-6">
                  <div className={`w-16 h-16 ${c.iconBg} rounded-full flex items-center justify-center mb-3`}>
                    {c.icon}
                  </div>
                  {c.badge && (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mb-3 ${c.badge.color}`}>
                      {c.badge.label}
                    </span>
                  )}
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{c.heading}</h2>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-md">{c.body}</p>
                </div>

                {/* Documents checklist — not_started only */}
                {c.showDocs && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-3">What you will need</p>
                    <div className="space-y-2.5">
                      {[
                        { doc: 'Aadhaar Card', detail: 'Front + back photo — for identity' },
                        { doc: 'Driving License', detail: 'Front + back — must be valid' },
                        { doc: 'Profile Photo', detail: 'Clear face photo shown to passengers' },
                      ].map(({ doc, detail }) => (
                        <div key={doc} className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                          <span className="text-sm font-semibold text-gray-800">{doc}</span>
                          <span className="text-xs text-gray-400 hidden sm:inline">— {detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA button */}
                <button
                  onClick={() => navigate('/profile?tab=verification')}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors shadow-sm ${c.ctaStyle}`}
                >
                  {c.cta}
                </button>
                <p className="text-center text-xs text-gray-400 mt-3">
                  Free · Takes less than 5 minutes · Reviewed within 24 hours
                </p>
              </div>
            </div>
          </div>

          {/* Right: benefits panel — matches quick action card style from Home.jsx */}
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-5 sm:p-6">
              <p className="text-blue-600 text-xs font-semibold uppercase tracking-widest mb-4">Why verify</p>
              <div className="space-y-3">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-lg flex-shrink-0">{b.icon}</span>
                    <p className="text-sm text-gray-700 font-medium leading-snug">{b.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform trust stat — real live data from the backend */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-100 rounded-2xl p-4 sm:p-5">
              <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-3">Live platform stats</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { num: platformStats.loading ? '—' : formatNumber(platformStats.verifiedDrivers), label: 'Verified drivers' },
                  { num: platformStats.loading ? '—' : formatRating(platformStats.averageRating), label: 'Avg. community rating' },
                  { num: platformStats.loading ? '—' : formatNumber(platformStats.totalRides), label: 'Rides shared' },
                  { num: platformStats.loading ? '—' : formatNumber(platformStats.totalCities), label: 'Cities covered' },
                ].map(s => (
                  <div key={s.label} className="text-center rounded-xl bg-white/70 p-2.5">
                    <p className="text-lg font-bold text-gray-900">{s.num}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
function RidePost() {
  const { user, isLoading: authLoading } = useAuth();
  const [rides, setRides] = useState([]);
  const [isPosting, setIsPosting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('active');

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);

  // ── Fetch rides ───────────────────────────────────────────────────────────
  const fetchRides = useCallback(async () => {
    if (!user) return;
    setIsFetching(true);
    try {
      const data = await getMyRides({ status: statusFilter });
      const list = Array.isArray(data) ? data : (data?.data || []);
      setRides(list);
    } catch {
      // silent
    } finally {
      setIsFetching(false);
    }
  }, [user, statusFilter]);

  useEffect(() => { fetchRides(); }, [fetchRides]);

  // ── Auth loading ──────────────────────────────────────────────────────────
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

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!user) return <AuthGate />;

  // ── Not verified ──────────────────────────────────────────────────────────
  const verificationStatus = user?.driverVerification?.status || 'not_started';
  const isVerified = user?.isDriverVerified === true || verificationStatus === 'approved';
  if (!isVerified) return <VerificationGate verificationStatus={verificationStatus} />;

  // ── Post ride handler ─────────────────────────────────────────────────────
  const handlePostRide = async (rideData) => {
    if (!user?.isDriverVerified && user?.role !== 'driver') {
      toast.error('Only verified drivers can post rides. Complete verification first.', {
        duration: 5000,
        icon: '🔒',
        style: { background: '#EF4444', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' },
      });
      return;
    }

    setIsPosting(true);
    const postingToast = toast.loading('Publishing your ride…', {
      style: { background: '#2563EB', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' },
    });

    try {
      const response = await postRide(rideData);
      const newRide = response?.data || response;
      setRides(prev => [newRide, ...prev]);
      toast.dismiss(postingToast);
      toast.success('Ride published! It is now visible to nearby passengers.', {
        icon: '🚗',
        duration: 4000,
        style: { background: '#10B981', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' },
      });
      setTimeout(() => {
        document.getElementById('my-rides-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 600);
    } catch (err) {
      toast.dismiss(postingToast);
      const msg = err?.response?.data?.message || err?.message || 'Failed to post ride';
      toast.error(msg, {
        duration: 4000,
        style: { background: '#EF4444', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' },
      });
    } finally {
      setIsPosting(false);
    }
  };

  // ── Delete ride ───────────────────────────────────────────────────────────
  const handleDeleteRide = (rideId) => {
    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[260px]">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Cancel this ride?</p>
            <p className="text-xs text-gray-500 mt-0.5">This cannot be undone. All bookings will be cancelled.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { toast.dismiss(t.id); performDelete(rideId); }}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            Yes, cancel
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            Keep it
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      position: 'top-center',
      style: { background: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', maxWidth: '360px' },
    });
  };

  const performDelete = async (rideId) => {
    setDeletingId(rideId);
    try {
      await deleteRide(rideId);
      setRides(prev => prev.filter(r => r._id !== rideId));
      toast.success('Ride cancelled', {
        icon: '✓',
        style: { background: '#10B981', color: '#fff', fontWeight: '600', borderRadius: '12px' },
      });
      setTimeout(fetchRides, 600);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to cancel ride', {
        style: { background: '#EF4444', color: '#fff', fontWeight: '600', borderRadius: '12px' },
      });
      fetchRides();
    } finally {
      setDeletingId(null);
    }
  };

  const firstName = user?.name?.split(' ')[0] || 'Driver';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero strip — identical structure to Home.jsx LoggedInDashboard ── */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 pt-5 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              {user?.avatar ? (
                <img src={user.avatar} alt={firstName} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-white/30 flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                  {firstName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-blue-200 text-xs font-medium">Post a Ride</p>
                  {/* Verified badge — green dot style from Home.jsx */}
                  <span className="inline-flex items-center gap-1 bg-white/15 border border-white/20 text-green-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Verified driver
                  </span>
                </div>
                <h1 className="text-lg sm:text-2xl font-bold text-white leading-tight">
                  Share your journey, {firstName}
                </h1>
                <p className="text-blue-200 text-xs mt-0.5">Offer empty seats · recover fuel costs · help someone travel</p>
              </div>
            </div>
            {/* Quick nav links — same style as Home.jsx quick action cards */}
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/notifications"
                className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Ride requests
              </Link>
              <Link
                to="/upcoming-rides"
                className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Upcoming rides
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content — floats up over hero with -mt-8, same as Home.jsx ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16">

        {/* ── Quick stat strip — above the form, same as Home.jsx stats strip ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-4 sm:p-5 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
          {[
            {
              num: rides.filter(r => r.rideStatus === 'active').length || 0,
              label: 'Active rides',
              color: 'text-blue-600',
            },
            {
              num: rides.filter(r => ['confirmed', 'accepted'].some(s =>
                r.bookings?.some(b => b.status === s))).length || 0,
              label: 'Rides with bookings',
              color: 'text-green-600',
            },
            {
              num: rides.reduce((sum, r) => sum + (r.seats - getAvailableSeats(r)), 0),
              label: 'Total seats booked',
              color: 'text-amber-500',
            },
            {
              num: '₹' + rides.reduce((sum, r) => {
                const c = PaymentCalculator.calculateDriverEarnings(parseFloat(r.fare) || 0, r.seats);
                return sum + (c.totalDriverEarnings || 0);
              }, 0).toFixed(0),
              label: 'Potential earnings',
              color: 'text-green-600',
            },
          ].map((s, i) => (
            <div key={i} className={`text-center ${i > 0 ? 'pt-4 sm:pt-0 sm:pl-4' : 'pb-4 sm:pb-0 sm:pr-4'}`}>
              <div className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.num}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Two-column layout on large screens ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Left: ride form */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-blue-600 to-blue-400" />
              <div className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-blue-600 text-xs font-semibold uppercase tracking-widest">New ride</p>
                    <h2 className="text-base font-bold text-gray-900 leading-tight">Post a ride</h2>
                  </div>
                </div>
                <RideForm onSubmit={handlePostRide} isLoading={isPosting} />
              </div>
            </div>
          </div>

          {/* Right: tips panel */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">

            {/* Tips card — matches Home.jsx upsell banner style */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-100 rounded-2xl p-4 sm:p-5">
              <p className="text-green-700 text-xs font-semibold uppercase tracking-widest mb-3">Tips for more bookings</p>
              <div className="space-y-3">
                {[
                  { icon: '📍', tip: 'Add a specific pickup landmark — passengers find you faster.' },
                  { icon: '⏰', tip: 'Post rides at least a day in advance for maximum visibility.' },
                  { icon: '💬', tip: 'Add clear pickup instructions — reduces no-shows.' },
                  { icon: '✅', tip: 'Keep your preferences honest — sets the right expectations.' },
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-base flex-shrink-0">{t.icon}</span>
                    <p className="text-xs text-gray-600 leading-relaxed">{t.tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick links — same quick action card pattern as Home.jsx */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Ride Requests', to: '/notifications', icon: '🔔', bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700' },
                { label: 'Upcoming Rides', to: '/upcoming-rides', icon: '📅', bg: 'bg-blue-50 border-blue-100', text: 'text-blue-700' },
                { label: 'My Bookings', to: '/bookings/my-bookings', icon: '🎫', bg: 'bg-green-50 border-green-100', text: 'text-green-700' },
                { label: 'My Profile', to: '/profile', icon: '👤', bg: 'bg-purple-50 border-purple-100', text: 'text-purple-700' },
              ].map(card => (
                <Link
                  key={card.label}
                  to={card.to}
                  className={`${card.bg} border rounded-2xl p-4 flex flex-col items-start gap-1.5 hover:shadow-md transition-all duration-150`}
                >
                  <span className="text-xl">{card.icon}</span>
                  <span className={`text-xs font-semibold ${card.text}`}>{card.label}</span>
                </Link>
              ))}
            </div>

          </div>
        </div>

        {/* ── My Rides section ── */}
        <div id="my-rides-section" className="mt-8">

          {/* Section header — same structure as Home.jsx "Rides leaving soon" */}
          <div className="flex items-center justify-between mb-4 gap-2">
            <div>
              <p className="text-blue-600 text-xs font-semibold uppercase tracking-widest mb-1">Your rides</p>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Ride management</h2>
              {!isFetching && rides.length > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {rides.length} ride{rides.length !== 1 ? 's' : ''} · {statusFilter}
                </p>
              )}
            </div>
            {/* Filter tabs */}
            <div className="flex items-center gap-1.5">
              {[
                { key: 'active', label: 'Active' },
                { key: 'completed', label: 'Done' },
                { key: 'cancelled', label: 'Cancelled' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${statusFilter === tab.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid — same 1/2/4 col breakpoints as Home.jsx */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {isFetching && rides.length === 0
              ? [...Array(2)].map((_, i) => <SkeletonRideCard key={i} />)
              : rides.length > 0
                ? rides.map((ride, i) => (
                  <RideCard
                    key={ride._id || i}
                    ride={ride}
                    onDelete={handleDeleteRide}
                    isDeleting={deletingId === ride._id}
                    onExpand={setExpandedId}
                    isExpanded={expandedId === ride._id}
                  />
                ))
                : <EmptyState filter={statusFilter} />
            }
          </div>

        </div>
      </div>
    </div>
  );
}

export default RidePost;
