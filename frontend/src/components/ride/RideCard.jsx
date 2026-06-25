// src/components/ride/RideCard.jsx
// Passenger-facing search result card.
// Design: matches Home.jsx exactly — white rounded-2xl, blue-600 primary, gray-50 bg.
// Payment: uses PaymentCalculator (3% platform fee, 5% GST) — never hardcoded.
// Bugs fixed: removed dead code after return, fixed undefined variable references.

import React, { useState } from 'react';
import { createBooking } from '../../services/bookingService';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import PaymentCalculator from '../../utils/paymentCalculator';

// ─── Shared verified badge ────────────────────────────────────────────────────
function VerifiedBadge() {
  return (
    <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
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

// ─── Booking Modal ────────────────────────────────────────────────────────────
function WaivedBadge() {
  return (
    <span className="ml-2 inline-flex items-center rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700">
      waived
    </span>
  );
}

function FirstRidePassengerCallout() {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4">
      <p className="text-sm font-bold text-green-800">First ride offer active</p>
      <p className="mt-1 text-xs leading-relaxed text-green-700">
        Your first booking has platform fee and GST waived. You pay only the fare the driver set.
      </p>
    </div>
  );
}

function BookingModal({ ride, onClose, onSuccess, isFirstRideFree = false }) {
  const [seats, setSeats]       = useState(1);
  const [pickup, setPickup]     = useState(ride.start || '');
  const [drop, setDrop]         = useState(ride.end   || '');
  const [notes, setNotes]       = useState('');
  const [loading, setLoading]   = useState(false);

  const availableSeats = ride.availableSeats ?? ride.seats ?? 1;
  const isSegment      = ride.matchType === 'on_route' && ride.userSearchDistance;
  const perKmRate      = ride.perKmRate || 0;
  const fareMode       = ride.fareMode || 'fixed';

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
      waivedGst: standard.serviceFeeGST,
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
        dropLocation:   { address: isSegment ? (ride.userDrop   || drop)   : drop   },
        passengerNotes: notes,
        paymentMethod: 'cash',
        matchType:          ride.matchType       || null,
        userSearchDistance: ride.userSearchDistance || null,
        segmentFare:        ride.segmentFare     || null,
        matchQuality:       ride.matchQuality    || null,
      });

      const waived = response?.isFirstRideFree || isFirstRideFree;
      toast.success(waived ? 'Booking request sent. First ride fees waived!' : 'Booking request sent!', {
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
          {isFirstRideFree && <FirstRidePassengerCallout />}

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
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-3">Fare breakdown</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Base fare</span>
                <span className="font-medium text-gray-800">₹{fareDisplay.base.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Platform fee ({(PaymentCalculator.PLATFORM_FEE_PERCENTAGE * 100).toFixed(0)}%)</span>
                <span className={`font-medium ${isFirstRideFree ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                  ₹{(isFirstRideFree ? fareDisplay.waivedFee : fareDisplay.fee).toFixed(2)}
                  {isFirstRideFree && <WaivedBadge />}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">GST ({(PaymentCalculator.GST_PERCENTAGE * 100).toFixed(0)}% on fare + fee)</span>
                <span className={`font-medium ${isFirstRideFree ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                  ₹{(isFirstRideFree ? fareDisplay.waivedGst : fareDisplay.gst).toFixed(2)}
                  {isFirstRideFree && <WaivedBadge />}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-green-200 font-bold text-green-700">
                <span>Total</span>
                <span className="text-base">₹{fareDisplay.total.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Payment after driver confirms your request.</p>
          </div>

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
                  <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  <span className="text-sm font-semibold text-gray-700">{Number(driver.ratingSummary).toFixed(1)}</span>
                </div>
              )}
              {driverInfo.gender && <p className="text-sm text-gray-600">Gender: <span className="font-medium capitalize">{driverInfo.gender}</span></p>}
            </div>
          )}

          {tab === 'vehicle' && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
              {[
                { label: 'Type',    val: vehicle.type },
                { label: 'Model',   val: vehicle.model },
                { label: 'Color',   val: vehicle.color },
                { label: 'AC',      val: vehicle.acAvailable ? 'Available' : 'Not available' },
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
                { key: 'smokingAllowed', label: '🚬 Smoking' },
                { key: 'musicAllowed',   label: '🎵 Music' },
                { key: 'petFriendly',    label: '🐾 Pets' },
                { key: 'luggageAllowed', label: '🧳 Luggage' },
                { key: 'womenOnly',      label: '👩 Women only' },
                { key: 'talkative',      label: '💬 Talkative' },
                { key: 'childSeatAvailable', label: '👶 Child seat' },
                { key: 'pickupFlexibility',  label: '📍 Flex pickup' },
              ].map(({ key, label }) => (
                <div key={key} className={`rounded-xl p-3 border text-sm font-semibold flex items-center gap-2 ${prefs[key] ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-700'}`}>
                  <span>{prefs[key] ? '✓' : '✗'}</span>
                  <span>{label}</span>
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
  const name  = driverInfo.name  || driver.name  || 'Driver';
  const phone = driverInfo.phone || driver.phone || ride.phoneNumber || 'Not provided';

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
            { label: 'Driver',   val: name },
            { label: 'Phone',    val: phone },
            { label: 'Vehicle',  val: [vehicle.color, vehicle.model, vehicle.type].filter(Boolean).join(' ') || 'N/A' },
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
  const [modal, setModal] = useState(null); // 'book' | 'details' | 'contact' | null

  const driver       = ride.driverId || ride.driver || {};
  const driverInfo   = ride.driverInfo || {};
  const vehicle      = ride.vehicle || {};
  const prefs        = ride.preferences || {};
  const isVerified   = driverInfo.verified || driver.isDriverVerified || false;
  const driverName   = driverInfo.name || driver.name || 'Driver';
  const driverRating = driver.ratingSummary || 0;
  const fareMode     = ride.fareMode || 'fixed';
  const perKmRate    = ride.perKmRate || 0;
  const isSegment    = ride.matchType === 'on_route' && ride.userSearchDistance;

  const availableSeats = ride.availableSeats ?? ride.seats ?? 0;
  const totalSeats     = ride.seats ?? 0;
  const bookedSeats    = Math.max(0, totalSeats - availableSeats);
  const isFull         = availableSeats === 0;

  // Passenger-facing price to show on card
  let displayPrice;
  let displayPriceLabel;
  if (isSegment && perKmRate) {
    const f = calcSegmentFare(perKmRate, ride.userSearchDistance, 1, isFirstRideFree);
    displayPrice      = `₹${f.total.toFixed(0)}`;
    displayPriceLabel = 'your segment';
  } else if (fareMode === 'per_km') {
    displayPrice      = `₹${perKmRate}/km`;
    displayPriceLabel = 'rate';
  } else {
    const f = calcPassengerFare(ride.fare || 0, 1, isFirstRideFree);
    displayPrice      = `₹${f.perSeat.toFixed(0)}`;
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
    setModal('contact');
  };

  // Preference pills to show
  const prefPills = [
    vehicle.acAvailable                && { label: 'AC',       color: 'blue'   },
    prefs.musicAllowed                 && { label: '🎵 Music', color: 'purple' },
    prefs.petFriendly                  && { label: '🐾 Pets',  color: 'green'  },
    prefs.womenOnly                    && { label: '👩 Women', color: 'pink'   },
    ride.tollIncluded                  && { label: 'Tolls ✓',  color: 'indigo' },
    ride.negotiableFare                && { label: 'Negotiable', color: 'amber' },
  ].filter(Boolean);

  const pillColors = {
    blue:   'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    green:  'bg-green-50 text-green-700',
    pink:   'bg-pink-50 text-pink-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    amber:  'bg-amber-50 text-amber-700',
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
              <svg className="w-3.5 h-3.5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
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
                    <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    <span className="text-xs text-gray-500">{Number(driverRating).toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Seats + date */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                isFull ? 'bg-orange-50 text-orange-600' : availableSeats <= 1 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-700'
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
                <span key={i} className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${pillColors[p.color]}`}>{p.label}</span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setModal('details')}
              className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 py-2 rounded-xl text-xs font-semibold transition-all"
            >
              Details
            </button>
            <button
              onClick={handleContact}
              className="flex-1 border border-blue-200 text-blue-600 hover:bg-blue-50 py-2 rounded-xl text-xs font-semibold transition-all"
            >
              Contact
            </button>
            <button
              onClick={handleBook}
              disabled={isFull}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isFull ? 'Full' : 'Book'}
            </button>
          </div>
        </div>
      </div>

      {modal === 'book'    && <BookingModal  ride={ride} onClose={() => setModal(null)} onSuccess={onBookingSuccess} isFirstRideFree={isFirstRideFree} />}
      {modal === 'details' && <DetailsModal  ride={ride} onClose={() => setModal(null)} isFirstRideFree={isFirstRideFree} />}
      {modal === 'contact' && <ContactModal  ride={ride} onClose={() => setModal(null)} />}
    </>
  );
}

export default RideCard;
