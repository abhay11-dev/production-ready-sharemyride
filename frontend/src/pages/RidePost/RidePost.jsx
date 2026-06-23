// src/pages/RidePost/RidePost.jsx
// Page wrapper: fetches user's posted rides, renders form + ride management cards
// API calls: postRide (POST /api/rides), getMyRides (GET /api/rides/my), deleteRide (DELETE /api/rides/:id)
// Preserves all existing logic, removes debug console.log spam, upgrades card UI

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import RideForm from '../../components/ride/RideForm';
import { postRide, getMyRides, deleteRide } from '../../services/rideService';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import PaymentCalculator from '../../utils/paymentCalculator';
import PaymentBreakdownCard from '../../components/PaymentBreakdownCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function getAvailableSeats(ride) {
  if (!ride.bookings?.length) return ride.seats;
  const booked = ride.bookings
    .filter(b => ['confirmed', 'pending', 'accepted'].includes(b.status))
    .reduce((sum, b) => sum + (b.seatsBooked || 1), 0);
  return Math.max(0, ride.seats - booked);
}

function StatusPill({ rideStatus, availableSeats }) {
  if (rideStatus === 'cancelled') return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />Cancelled
    </span>
  );
  if (availableSeats === 0) return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />Fully booked
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Active
    </span>
  );
}

// ─── Ride Card ────────────────────────────────────────────────────────────────
function RideCard({ ride, onDelete, isDeleting, onExpand, isExpanded }) {
  const availableSeats = getAvailableSeats(ride);
  const bookedSeats    = ride.seats - availableSeats;
  const driverCalc     = PaymentCalculator.calculateDriverEarnings(parseFloat(ride.fare) || 0, ride.seats);

  const pendingCount   = ride.bookings?.filter(b => b.status === 'pending').length   || 0;
  const confirmedCount = ride.bookings?.filter(b => b.status === 'confirmed' || b.status === 'accepted').length || 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Card header strip */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-4 h-4 text-blue-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-blue-100 text-xs font-medium truncate">{formatDate(ride.date)} · {formatTime(ride.time)}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusPill rideStatus={ride.rideStatus} availableSeats={availableSeats} />
          {/* Delete button */}
          <button
            onClick={() => onDelete(ride._id)}
            disabled={isDeleting}
            title="Cancel ride"
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/20 hover:bg-red-500 text-white transition-all duration-150 disabled:opacity-50"
          >
            {isDeleting ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* Route */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex flex-col items-center gap-0.5 mt-1 flex-shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="w-0.5 h-7 bg-gray-200" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 truncate">{ride.start}</p>
            {ride.waypoints?.filter(w => w.location).map((w, i) => (
              <p key={i} className="text-xs text-gray-400 py-0.5 pl-2">via {w.location}</p>
            ))}
            <p className="font-bold text-gray-900 truncate mt-1.5">{ride.end}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xl font-black text-blue-600">₹{ride.fare}</p>
            <p className="text-xs text-gray-400">per seat</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">Total seats</p>
            <p className="text-xl font-bold text-gray-900">{ride.seats}</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${bookedSeats > 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
            <p className="text-xs text-gray-400 mb-1">Booked</p>
            <p className={`text-xl font-bold ${bookedSeats > 0 ? 'text-amber-600' : 'text-green-600'}`}>{bookedSeats}/{ride.seats}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">Available</p>
            <p className="text-xl font-bold text-blue-600">{availableSeats}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">Max earn</p>
            <p className="text-xl font-bold text-green-600">₹{driverCalc.totalDriverEarnings.toFixed(0)}</p>
          </div>
        </div>

        {/* Booking requests summary */}
        {ride.bookings?.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-full font-semibold">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {pendingCount} pending
              </span>
            )}
            {confirmedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2.5 py-1 rounded-full font-semibold">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {confirmedCount} confirmed
              </span>
            )}
            <Link to="/notifications" className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold hover:bg-blue-200 transition-colors">
              Manage requests →
            </Link>
          </div>
        )}

        {/* Expand / collapse detailed view */}
        <button
          type="button"
          onClick={() => onExpand(isExpanded ? null : ride._id)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150"
        >
          {isExpanded ? 'Hide details' : 'View full details'}
          <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Expanded details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
            {/* Earnings breakdown using existing PaymentBreakdownCard */}
            <PaymentBreakdownCard
              baseFare={parseFloat(ride.fare) || 0}
              seatsBooked={ride.seats}
              showDriverView
              showPassengerView={false}
            />

            {/* Vehicle */}
            {ride.vehicle && (
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-3">Vehicle</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  {[
                    { label: 'Number',   val: ride.vehicleNumber || ride.vehicle?.number },
                    { label: 'Type',     val: ride.vehicle?.type },
                    { label: 'Model',    val: ride.vehicle?.model || '—' },
                    { label: 'Color',    val: ride.vehicle?.color || '—' },
                    { label: 'AC',       val: ride.vehicle?.acAvailable ? '✓ Available' : '✗ None' },
                    { label: 'Luggage',  val: ride.vehicle?.luggageSpace || '—' },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                      <p className="font-semibold text-gray-800 uppercase text-xs">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact */}
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3">Contact & Pickup</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Phone</span>
                  <span className="font-semibold text-gray-800">{ride.phoneNumber}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400 flex-shrink-0">Address</span>
                  <span className="font-semibold text-gray-800 text-right text-xs">{ride.address}</span>
                </div>
                {ride.pickupInstructions && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400 flex-shrink-0">Instructions</span>
                    <span className="font-medium text-gray-700 text-right text-xs">{ride.pickupInstructions}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Preferences */}
            {ride.preferences && (
              <div className="bg-pink-50 rounded-xl p-4 border border-pink-100">
                <p className="text-xs font-bold text-pink-700 uppercase tracking-wider mb-3">Ride Preferences</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'smokingAllowed',  label: 'Smoking' },
                    { key: 'musicAllowed',    label: 'Music' },
                    { key: 'petFriendly',     label: 'Pets' },
                    { key: 'luggageAllowed',  label: 'Luggage' },
                    { key: 'womenOnly',       label: 'Women only' },
                    { key: 'pickupFlexibility', label: 'Flexible pickup' },
                  ].map(({ key, label }) => ride.preferences[key] !== undefined && (
                    <div key={key} className="flex items-center gap-1.5">
                      <span className={ride.preferences[key] ? 'text-green-500' : 'text-red-400'}>{ride.preferences[key] ? '✓' : '✗'}</span>
                      <span className="text-gray-600">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {ride.notes && (
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <p className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-2">Notes</p>
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
function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
        </svg>
      </div>
      <h3 className="font-bold text-gray-900 text-lg mb-1">No rides posted yet</h3>
      <p className="text-sm text-gray-500 mb-4">Fill the form above to post your first ride and start sharing your journey.</p>
      <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="inline-flex items-center gap-1.5 text-blue-600 text-sm font-semibold hover:text-blue-700">
        <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
        Post your first ride
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
function RidePost() {
  const { user } = useAuth();
  const [rides, setRides]             = useState([]);
  const [isLoading, setIsLoading]     = useState(false);
  const [isFetching, setIsFetching]   = useState(false);
  const [deletingId, setDeletingId]   = useState(null);
  const [expandedId, setExpandedId]   = useState(null);

  // Scroll to top on page mount
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);

  // ── Fetch driver's rides ──────────────────────────────────────────────────
  const fetchRides = useCallback(async () => {
    if (!user) return;
    setIsFetching(true);
    try {
      const data = await getMyRides();
      // getMyRides → GET /api/rides/my → returns { success, data: [...] } or raw array
      const list = Array.isArray(data) ? data : (data?.data || []);
      setRides(list);
    } catch {
      // Silent — don't toast on background refresh
    } finally {
      setIsFetching(false);
    }
  }, [user]);

  useEffect(() => { fetchRides(); }, [fetchRides]);

  // ── Post ride ─────────────────────────────────────────────────────────────
  const handlePostRide = async (rideData) => {
    if (!user) {
      toast.error('Please log in to post a ride');
      return;
    }
    setIsLoading(true);
    try {
      const response = await postRide(rideData);
      // postRide → POST /api/rides → returns { success, data: Ride }
      const newRide = response?.data || response;
      setRides(prev => [newRide, ...prev]);
      toast.success('Ride published! Passengers can now find it.', {
        icon: '🚗',
        duration: 4000,
        style: { background: '#10B981', color: '#fff', fontWeight: '600' },
      });
      // Scroll to ride list
      setTimeout(() => {
        document.getElementById('posted-rides')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 600);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to post ride';
      toast.error(msg, { duration: 4000 });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Delete / cancel ride ──────────────────────────────────────────────────
  const handleDeleteRide = (rideId) => {
    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[260px]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Cancel this ride?</p>
            <p className="text-xs text-gray-500">This cannot be undone. All bookings will be cancelled.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { toast.dismiss(t.id); performDelete(rideId); }}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          >
            Yes, cancel
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          >
            Keep it
          </button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center', style: { background: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', maxWidth: '360px' } });
  };

  const performDelete = async (rideId) => {
    setDeletingId(rideId);
    try {
      await deleteRide(rideId);
      // Optimistic remove
      setRides(prev => prev.filter(r => r._id !== rideId));
      toast.success('Ride cancelled', { icon: '✓', style: { background: '#10B981', color: '#fff', fontWeight: '600' } });
      // Confirm with fresh server data
      setTimeout(fetchRides, 600);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to cancel ride';
      toast.error(msg);
      fetchRides(); // Refresh regardless
    } finally {
      setDeletingId(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Page header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">Post a Ride</h1>
          <p className="text-gray-500 text-sm sm:text-base">Share your journey · Split the cost · Help someone travel</p>
        </div>

        {/* Form */}
        <div className="flex justify-center mb-12">
          <RideForm onSubmit={handlePostRide} isLoading={isLoading} />
        </div>

        {/* Posted rides section */}
        {(rides.length > 0 || isFetching) && (
          <div id="posted-rides">
            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center">
                <span className="bg-gradient-to-br from-blue-50 via-white to-green-50 px-4 text-sm font-bold text-gray-600">
                  Your Posted Rides {isFetching ? '…' : `(${rides.length})`}
                </span>
              </div>
            </div>

            {isFetching && rides.length === 0 ? (
              <div className="flex justify-center py-12">
                <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {rides.map((ride, i) => (
                  <RideCard
                    key={ride._id || i}
                    ride={ride}
                    onDelete={handleDeleteRide}
                    isDeleting={deletingId === ride._id}
                    onExpand={setExpandedId}
                    isExpanded={expandedId === ride._id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {!isFetching && rides.length === 0 && <EmptyState />}

      </div>
    </div>
  );
}

export default RidePost;