import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import {
  getDriverBookings,
  updateBookingStatus,
  formatBookingStatus,
} from '../../services/bookingService.js';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(isoStr) {
  if (!isoStr) return '';
  const secs = Math.floor((Date.now() - new Date(isoStr)) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getInitial(name) {
  return (name || 'U').charAt(0).toUpperCase();
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  pending:   'bg-yellow-100 text-yellow-800',
  accepted:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700',
  completed: 'bg-purple-100 text-purple-700',
  no_show:   'bg-orange-100 text-orange-700',
};

const STATUS_DOTS = {
  pending:   'bg-yellow-400 animate-pulse',
  accepted:  'bg-green-500',
  rejected:  'bg-red-400',
  cancelled: 'bg-gray-400',
  completed: 'bg-purple-500',
  no_show:   'bg-orange-400',
};

function StatusBadge({ status }) {
  const label = formatBookingStatus(status).label;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOTS[status] || 'bg-gray-400'}`} />
      {label}
    </span>
  );
}

// ─── Payment Fare Row ─────────────────────────────────────────────────────────
function FareRow({ label, value, bold = false, color = '' }) {
  return (
    <div className={`flex items-center justify-between text-xs ${bold ? 'font-semibold' : ''} ${color || 'text-gray-600'}`}>
      <span>{label}</span>
      <span>₹{typeof value === 'number' ? value.toFixed(2) : value || '0.00'}</span>
    </div>
  );
}

// ─── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-gray-200 rounded w-32" />
          <div className="h-3 bg-gray-200 rounded w-20" />
        </div>
        <div className="w-20 h-6 bg-gray-200 rounded-full" />
      </div>
      <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-2/4" />
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
      </div>
      <div className="flex gap-2">
        <div className="flex-1 h-10 bg-gray-200 rounded-xl" />
        <div className="flex-1 h-10 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ activeFilter }) {
  const msgs = {
    all:       { title: 'No ride requests yet', sub: 'When passengers book your rides, requests will appear here.' },
    pending:   { title: 'No pending requests', sub: "You're all caught up — no requests waiting for your decision." },
    accepted:  { title: 'No accepted rides', sub: 'Accepted bookings will appear here once you approve requests.' },
    rejected:  { title: 'No rejected requests', sub: 'Requests you have declined will show here.' },
    cancelled: { title: 'No cancelled bookings', sub: 'Bookings cancelled by passengers will appear here.' },
    completed: { title: 'No completed rides', sub: 'Rides you have marked as completed will show here.' },
  };
  const { title, sub } = msgs[activeFilter] || msgs.all;
  return (
    <div className="col-span-full bg-white rounded-2xl border border-dashed border-gray-200 py-16 px-6 text-center">
      <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>
      <p className="font-semibold text-gray-900 mb-1">{title}</p>
      <p className="text-sm text-gray-500 max-w-xs mx-auto">{sub}</p>
    </div>
  );
}

// ─── Confirmation Modal ───────────────────────────────────────────────────────
function ConfirmModal({ booking, action, onConfirm, onCancel, processing }) {
  const isReject = action === 'rejected';
  const [reason, setReason] = useState('');
  const passengerName = booking?.passenger?.name || booking?.passengerId?.name || 'this passenger';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${isReject ? 'bg-red-50' : 'bg-green-50'}`}>
          {isReject ? (
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <h3 className="text-base font-bold text-gray-900 text-center mb-1">
          {isReject ? 'Reject this booking?' : 'Accept this booking?'}
        </h3>
        <p className="text-sm text-gray-500 text-center mb-5">
          {isReject
            ? `This will decline ${passengerName}'s request and return the seat(s) to your ride.`
            : `${passengerName} will be confirmed and receive your contact details.`}
        </p>
        {isReject && (
          <div className="mb-5">
            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
              Reason for rejection <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Ride cancelled, route changed, unavailable..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm placeholder-gray-400 focus:ring-2 focus:ring-red-300 focus:border-red-300 outline-none resize-none transition-all"
            />
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={processing}
            className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={processing}
            className={`flex-1 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2
              ${isReject ? 'bg-red-500 hover:bg-red-600' : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600'}`}
          >
            {processing ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </>
            ) : isReject ? 'Yes, reject' : 'Yes, accept'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Booking Card ─────────────────────────────────────────────────────────────
function BookingCard({ booking, onAction }) {
  const [expanded, setExpanded] = useState(false);

  const passenger = booking.passenger || {};
  const passengerName = passenger.name || 'Unknown Passenger';
  const passengerPhone = passenger.phone || null;
  const passengerEmail = passenger.email || null;
  const passengerAvatar = passenger.avatar || null;
  const passengerRating = passenger.ratings?.average || 0;

  const ride = booking.ride || {};
  const rideStart = ride.start || booking.pickupLocation || '—';
  const rideEnd = ride.end || booking.dropLocation || '—';
  const rideDate = formatDate(ride.date);
  const rideTime = formatTime(ride.time);
  const rideDatetime = rideDate && rideTime ? `${rideDate} · ${rideTime}` : rideDate || rideTime || '—';

  const status = booking.status;
  const isPending = status === 'pending';
  const isAccepted = status === 'accepted';
  const isCompleted = status === 'completed';
  const isClosed = ['rejected', 'cancelled', 'no_show'].includes(status);

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden
      ${isPending ? 'border-blue-200 shadow-md shadow-blue-50/60' : 'border-gray-100 shadow-sm'}`}>

      {/* Pending accent strip */}
      {isPending && <div className="h-1 bg-gradient-to-r from-blue-600 to-blue-400 w-full" />}
      {isAccepted && <div className="h-1 bg-gradient-to-r from-green-500 to-green-400 w-full" />}

      <div className="p-4 sm:p-5">

        {/* Header row */}
        <div className="flex items-start gap-3 mb-4">
          <div className="relative flex-shrink-0">
            {passengerAvatar ? (
              <img
                src={passengerAvatar}
                alt={passengerName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                {getInitial(passengerName)}
              </div>
            )}
            {isPending && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{passengerName}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {passengerRating > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-gray-500">
                  <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {Number(passengerRating).toFixed(1)}
                </span>
              )}
              <span className="text-xs text-gray-400">{timeAgo(booking.createdAt)}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <StatusBadge status={status} />
            {isPending && (
              <span className="text-xs text-blue-600 font-medium animate-pulse">Needs action</span>
            )}
          </div>
        </div>

        {/* Route */}
        <div className="bg-blue-50 rounded-xl p-3 mb-4">
          <div className="flex items-start gap-2 mb-2">
            <div className="flex flex-col items-center mt-0.5 flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="w-0.5 h-5 bg-blue-200 my-0.5" />
              <span className="w-2 h-2 rounded-full bg-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-blue-900 leading-tight mb-1.5 break-words">{rideStart}</p>
              <p className="text-xs font-semibold text-blue-900 leading-tight break-words">{rideEnd}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-blue-100">
            <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-blue-600 font-medium">{rideDatetime}</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-gray-50 rounded-xl p-2.5 text-center">
            <p className="text-xs text-gray-400 mb-0.5">Seats</p>
            <p className="font-bold text-gray-900 text-sm">{booking.seatsBooked || 1}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2.5 text-center">
            <p className="text-xs text-gray-400 mb-0.5">You earn</p>
            <p className="font-bold text-green-600 text-sm">₹{booking.baseFare?.toFixed(0) || '0'}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2.5 text-center">
            <p className="text-xs text-gray-400 mb-0.5">Passenger pays</p>
            <p className="font-bold text-gray-900 text-sm">₹{booking.totalFare?.toFixed(0) || '0'}</p>
          </div>
        </div>

        {/* Passenger note */}
        {booking.passengerNotes && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold">Note: </span>{booking.passengerNotes}
            </p>
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-blue-600 font-medium transition-colors mb-3 py-1"
        >
          <span>{expanded ? 'Hide details' : 'View full details'}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Expanded details */}
        {expanded && (
          <div className="border-t border-gray-100 pt-4 mb-4 space-y-4">

            {/* Contact info — only when accepted */}
            {(isAccepted || isCompleted) && (passengerPhone || passengerEmail) && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Contact</p>
                <div className="space-y-2">
                  {passengerPhone && (
                    <a
                      href={`tel:${passengerPhone}`}
                      className="flex items-center gap-2.5 text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors"
                    >
                      <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      {passengerPhone}
                    </a>
                  )}
                  {passengerEmail && (
                    <a
                      href={`mailto:${passengerEmail}`}
                      className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      {passengerEmail}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Fare breakdown */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Fare breakdown</p>
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                <FareRow label="Base fare" value={booking.baseFare} />
                <FareRow label="Service fee" value={booking.passengerServiceFee} />
                <FareRow label="GST on service fee" value={booking.passengerServiceFeeGST} />
                <div className="border-t border-gray-200 my-1.5" />
                <FareRow label="Passenger pays" value={booking.totalFare} bold color="text-gray-900" />
                <FareRow label="You receive" value={booking.baseFare} bold color="text-green-600" />
              </div>
            </div>

            {/* Booking metadata */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Booking info</p>
              <div className="space-y-2">
                {[
                  { label: 'Booking ID', value: `#${booking._id?.slice(-8).toUpperCase()}` },
                  { label: 'Requested', value: formatDateTime(booking.createdAt) },
                  ...(booking.confirmedAt ? [{ label: 'Accepted on', value: formatDateTime(booking.confirmedAt) }] : []),
                  ...(booking.rejectedAt ? [{ label: 'Rejected on', value: formatDateTime(booking.rejectedAt) }] : []),
                  ...(booking.cancelledAt ? [{ label: 'Cancelled on', value: formatDateTime(booking.cancelledAt) }] : []),
                  ...(booking.completedAt ? [{ label: 'Completed on', value: formatDateTime(booking.completedAt) }] : []),
                  { label: 'Payment method', value: (booking.paymentMethod || 'cash').toUpperCase() },
                  { label: 'Payment status', value: (booking.paymentStatus || 'pending') },
                  ...(booking.matchType ? [{ label: 'Match type', value: booking.matchType }] : []),
                  ...(booking.cancellationReason ? [{ label: 'Cancel reason', value: booking.cancellationReason }] : []),
                  ...(booking.rejectionReason ? [{ label: 'Reject reason', value: booking.rejectionReason }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-gray-400 flex-shrink-0">{label}</span>
                    <span className="text-gray-700 font-medium text-right break-all">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Special requests */}
            {booking.specialRequests?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Special requests</p>
                <div className="flex flex-wrap gap-1.5">
                  {booking.specialRequests.map((r, i) => (
                    <span key={i} className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">{r}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        {isPending && (
          <div className="flex gap-2">
            <button
              onClick={() => onAction(booking, 'accepted')}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white px-3 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Accept
            </button>
            <button
              onClick={() => onAction(booking, 'rejected')}
              className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject
            </button>
          </div>
        )}

        {/* Mark complete button for accepted bookings */}
        {isAccepted && (
          <button
            onClick={() => onAction(booking, 'completed')}
            className="w-full border border-purple-200 text-purple-600 hover:bg-purple-50 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Mark ride complete
          </button>
        )}

        {/* Closed status info */}
        {isClosed && (
          <div className="flex items-center gap-2 text-xs text-gray-400 justify-center py-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            This booking is closed
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Stats Strip ──────────────────────────────────────────────────────────────
function StatsStrip({ bookings }) {
  const counts = {
    all:       bookings.length,
    pending:   bookings.filter(b => b.status === 'pending').length,
    accepted:  bookings.filter(b => b.status === 'accepted').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    rejected:  bookings.filter(b => b.status === 'rejected').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };
  const totalEarned = bookings
    .filter(b => b.status === 'completed')
    .reduce((s, b) => s + (b.baseFare || 0), 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
      {[
        { label: 'Total requests', value: counts.all, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
        { label: 'Pending', value: counts.pending, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-100' },
        { label: 'Accepted', value: counts.accepted, color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
        { label: 'Completed', value: counts.completed, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
        { label: 'Rejected', value: counts.rejected, color: 'text-red-500', bg: 'bg-red-50 border-red-100' },
        { label: 'Earnings', value: `₹${totalEarned.toFixed(0)}`, color: 'text-green-700', bg: 'bg-green-50 border-green-100' },
      ].map(s => (
        <div key={s.label} className={`${s.bg} border rounded-2xl p-3 sm:p-4`}>
          <p className="text-xs text-gray-500 mb-1">{s.label}</p>
          <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const FILTERS = [
  { key: 'all',       label: 'All',       dot: null },
  { key: 'pending',   label: 'Pending',   dot: 'bg-yellow-400' },
  { key: 'accepted',  label: 'Accepted',  dot: 'bg-green-500' },
  { key: 'completed', label: 'Completed', dot: 'bg-purple-500' },
  { key: 'rejected',  label: 'Rejected',  dot: 'bg-red-400' },
  { key: 'cancelled', label: 'Cancelled', dot: 'bg-gray-400' },
];

function DriverRideRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [processingId, setProcessingId] = useState(null);
  const [modal, setModal] = useState(null); // { booking, action }
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef(null);

  const fetchBookings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await getDriverBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching driver bookings:', err);
      if (!silent) toast.error('Could not load ride requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchBookings();
    intervalRef.current = setInterval(() => fetchBookings(true), 30000);
    return () => clearInterval(intervalRef.current);
  }, [user, fetchBookings, navigate]);

  // ── Filtering + sorting ──────────────────────────────────────────────────
  const filtered = bookings
    .filter(b => activeFilter === 'all' || b.status === activeFilter)
    .filter(b => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const passenger = b.passenger || {};
      return (
        passenger.name?.toLowerCase().includes(q) ||
        (b.ride?.start || b.pickupLocation || '').toLowerCase().includes(q) ||
        (b.ride?.end || b.dropLocation || '').toLowerCase().includes(q) ||
        b._id?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'fare_high') return (b.totalFare || 0) - (a.totalFare || 0);
      if (sortBy === 'fare_low') return (a.totalFare || 0) - (b.totalFare || 0);
      return 0;
    });

  // Counts per filter tab
  const tabCounts = FILTERS.reduce((acc, f) => {
    acc[f.key] = f.key === 'all' ? bookings.length : bookings.filter(b => b.status === f.key).length;
    return acc;
  }, {});

  // ── Action flow ──────────────────────────────────────────────────────────
  const handleAction = (booking, action) => {
    setModal({ booking, action });
  };

  const handleConfirm = async (reason) => {
    if (!modal) return;
    const { booking, action } = modal;
    setProcessingId(booking._id);
    setModal(null);

    try {
      await updateBookingStatus(booking._id, action, reason || '');

      // Optimistic update
      setBookings(prev =>
        prev.map(b => b._id === booking._id ? { ...b, status: action } : b)
      );

      const labels = {
        accepted: 'Booking accepted — passenger notified!',
        rejected: 'Booking rejected.',
        completed: 'Ride marked as complete!',
      };

      toast.success(labels[action] || `Booking ${action}`, {
        duration: 3000,
        position: 'top-center',
        style: { background: '#10B981', color: '#fff', fontWeight: '600', padding: '16px', borderRadius: '12px' },
        iconTheme: { primary: '#fff', secondary: '#10B981' },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} booking.`, {
        duration: 4000,
        position: 'top-center',
        style: { background: '#EF4444', color: '#fff', fontWeight: '600', padding: '16px', borderRadius: '12px' },
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelModal = () => setModal(null);

  // ── Guard: not a driver ──────────────────────────────────────────────────
  if (user && !user.isDriverVerified && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Driver verification required</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            You need to complete driver verification before you can manage ride requests.
          </p>
          <Link
            to="/profile?tab=verification"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            Complete verification →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">

      {/* Hero strip */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 pt-5 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">Driver dashboard</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">Ride Requests</h1>
              <p className="text-blue-200 text-sm mt-1">
                Review and manage all passenger booking requests
              </p>
            </div>
            <div className="flex items-center gap-2">
              {refreshing && (
                <span className="text-blue-200 text-xs flex items-center gap-1.5">
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Refreshing…
                </span>
              )}
              <button
                onClick={() => fetchBookings()}
                className="flex items-center gap-2 border border-white/30 text-white hover:bg-white/10 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <Link
                to="/driver/bookings"
                className="flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
              >
                My rides →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16">

        {/* Stats */}
        {!loading && bookings.length > 0 && <StatsStrip bookings={bookings} />}

        {/* Controls bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by passenger, route, or booking ID…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm placeholder-gray-400 outline-none text-gray-900"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {/* Sort */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 sm:w-52">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-700 outline-none cursor-pointer"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="fare_high">Fare: High to low</option>
                <option value="fare_low">Fare: Low to high</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-hide">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-150
                ${activeFilter === f.key
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-200 hover:text-blue-600'}`}
            >
              {f.dot && (
                <span className={`w-2 h-2 rounded-full ${activeFilter === f.key ? 'bg-white/60' : f.dot}`} />
              )}
              {f.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold
                ${activeFilter === f.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {tabCounts[f.key] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Results info */}
        {!loading && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {filtered.length === 0
                ? 'No results'
                : `Showing ${filtered.length} ${filtered.length === 1 ? 'request' : 'requests'}`
              }
              {searchQuery && <span className="text-blue-600 font-medium"> for "{searchQuery}"</span>}
            </p>
            {filtered.filter(b => b.status === 'pending').length > 0 && (
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                {filtered.filter(b => b.status === 'pending').length} need your action
              </span>
            )}
          </div>
        )}

        {/* Cards grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="grid">
            <EmptyState activeFilter={activeFilter} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(booking => (
              <BookingCard
                key={booking._id}
                booking={booking}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {modal && (
        <ConfirmModal
          booking={modal.booking}
          action={modal.action}
          onConfirm={handleConfirm}
          onCancel={handleCancelModal}
          processing={!!processingId}
        />
      )}

    </div>
  );
}

export default DriverRideRequests;