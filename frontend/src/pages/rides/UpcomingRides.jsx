import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

import ReceiptService from '../../services/receiptService';
import { getMyBookings, getDriverBookings } from '../../services/bookingService';
import toastService from '../../services/toastService';
import PaymentCalculator from '../../utils/paymentCalculator';

// ─── Payment math (uses utils/paymentCalculator.js — the single source of
// truth for these rates; previously this file kept its own hardcoded copy
// of PLATFORM_FEE_RATE/GST_RATE, which is exactly the kind of drift spec
// §12 calls out) ────────────────────────────────────────────────────────
// Driver ask = driver receives, in full. Platform fee + GST (on fare+fee)
// are charged ONLY to the passenger, on top of the base fare. See
// Transaction.calculateAmounts on the backend: driverNetAmount === baseFare,
// platformFee / gstOnPlatformFee for the driver side are always 0.
const PLATFORM_FEE_RATE = PaymentCalculator.PLATFORM_FEE_PERCENTAGE;
const GST_RATE = PaymentCalculator.GST_PERCENTAGE;

function calculatePassengerPayment(booking) {
  const baseFare = booking.baseFare || 0;
  const serviceFee = booking.passengerServiceFee ?? booking.platformFee ?? baseFare * PLATFORM_FEE_RATE;
  const gst = booking.passengerServiceFeeGST ?? booking.gst ?? (baseFare + serviceFee) * GST_RATE;
  const totalPaid = booking.totalFare || (baseFare + serviceFee + gst);
  return { baseFare, serviceFee, gst, totalPaid };
}

function calculateDriverEarnings(booking) {
  // Driver receives the exact fare they set — no deductions.
  return { baseFare: booking.baseFare || 0, netEarnings: booking.baseFare || 0 };
}

// Only these statuses actually exist on the Booking schema for an
// "upcoming, paid-for" ride. ('confirmed' is not a valid enum value.)
const UPCOMING_STATUSES = ['accepted', 'completed'];

const UpcomingRides = () => {
  const { user } = useAuth();
  const [passengerRides, setPassengerRides] = useState([]);
  const [driverRides, setDriverRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('passenger');
  const [downloadingReceipt, setDownloadingReceipt] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callDetails, setCallDetails] = useState(null);
  const toastRef = useRef(null);

  useEffect(() => {
    fetchAllUpcomingRides();
  }, []);

  useEffect(() => {
    return () => {
      if (toastRef.current) {
        toastService.dismiss(toastRef.current);
        toastRef.current = null;
      }
    };
  }, []);

  const fetchAllUpcomingRides = async () => {
    try {
      setLoading(true);

      const passengerResponse = await getMyBookings();
      const upcomingPassenger = passengerResponse.filter(booking => {
        if (!booking.ride) return false;
        const rideDate = new Date(booking.ride.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const statusMatch = UPCOMING_STATUSES.includes(booking.status);
        const paymentMatch = booking.paymentStatus === 'completed';
        const dateMatch = rideDate >= today;

        return statusMatch && paymentMatch && dateMatch;
      });
      upcomingPassenger.sort((a, b) => new Date(a.ride.date) - new Date(b.ride.date));
      setPassengerRides(upcomingPassenger);

      const driverResponse = await getDriverBookings();
      const upcomingDriver = driverResponse.filter(booking => {
        if (!booking.ride) return false;
        const rideDate = new Date(booking.ride.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const statusMatch = UPCOMING_STATUSES.includes(booking.status);
        const paymentMatch = booking.paymentStatus === 'completed';
        const dateMatch = rideDate >= today;

        return statusMatch && paymentMatch && dateMatch;
      });
      upcomingDriver.sort((a, b) => new Date(a.ride.date) - new Date(b.ride.date));
      setDriverRides(upcomingDriver);

      if (upcomingPassenger.length === 0 && upcomingDriver.length > 0) {
        setActiveTab('driver');
      }

      const totalRides = upcomingPassenger.length + upcomingDriver.length;
      if (totalRides > 0) {
        toastRef.current = toastService.success(
          'Upcoming rides loaded',
          `Found ${totalRides} upcoming ${totalRides === 1 ? 'ride' : 'rides'}.`,
          { duration: 900, position: 'top-center', id: 'upcoming-rides-loaded' }
        );
      }
    } catch (error) {
      console.error('Failed to load upcoming rides:', error);
      toastService.error('Failed to load upcoming rides', 'Please refresh the page and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async (bookingId) => {
    if (downloadingReceipt) return;
    try {
      setDownloadingReceipt(bookingId);
      await ReceiptService.downloadReceipt(bookingId, { showToast: true });
    } catch (error) {
      console.error('Receipt download error:', error);
    } finally {
      setDownloadingReceipt(null);
    }
  };

  const handleCallAction = (booking, phoneNumber, role, name) => {
    if (!contactAllowed(booking)) {
      toastService.error('Contact restricted', 'Phone numbers are shared only after payment is complete and the ride is confirmed.');
      return;
    }

    if (!phoneNumber || phoneNumber === 'Not provided') {
      toastService.error('Phone number unavailable', `${role} phone number is not available.`);
      return;
    }
    setCallDetails({ phoneNumber, role, name });
    setShowCallModal(true);
  };

  const handleConfirmCall = () => {
    if (callDetails) {
      window.location.href = `tel:${callDetails.phoneNumber}`;
      toastService.success('Calling now', `${callDetails.name} is being dialed.`, { duration: 2000, position: 'top-center' });
    }
    setShowCallModal(false);
    setCallDetails(null);
  };

  const handleCancelCall = () => {
    setShowCallModal(false);
    setCallDetails(null);
    toastService.info('Call cancelled', 'You can call again anytime.');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const count = tab === 'passenger' ? passengerRides.length : driverRides.length;
    if (count === 0) {
      toastService.info('No rides scheduled', `No ${tab} rides are scheduled yet.`);
    }
  };

  const getDayLabel = (date) => {
    const rideDate = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    rideDate.setHours(0, 0, 0, 0);

    if (rideDate.getTime() === today.getTime()) return { label: 'TODAY', dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' };
    if (rideDate.getTime() === tomorrow.getTime()) return { label: 'TOMORROW', dot: 'bg-orange-400', bg: 'bg-orange-50', text: 'text-orange-700' };
    return {
      label: rideDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700'
    };
  };

  const contactAllowed = (booking) => {
    const paymentCompleted = booking.paymentStatus === 'completed';
    const confirmed = UPCOMING_STATUSES.includes(booking.status);
    return paymentCompleted && confirmed;
  };

  // ── Icons (heroicons-outline, stroke-2 — same set as Home.jsx) ──────────────
  const Icon = {
    calendar: (cls) => (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    search: (cls) => (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    plus: (cls) => (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    passenger: (cls) => (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    driver: (cls) => (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    pin: (cls) => (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    arrowDown: (cls) => (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
    phone: (cls) => (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
    download: (cls) => (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    ticket: (cls) => (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    route: (cls) => (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.553 2.776A1 1 0 0021 18.382V7.618a1 1 0 00-.447-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    check: (cls) => (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    wallet: (cls) => (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    info: (cls) => (
      <svg className={cls} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    close: (cls) => (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    empty: (cls) => (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    spinner: (cls) => (
      <svg className={`animate-spin ${cls}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    ),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading your rides…</p>
        </div>
      </div>
    );
  }

  const currentRides = activeTab === 'passenger' ? passengerRides : driverRides;
  const totalRides = passengerRides.length + driverRides.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── HEADER (gradient banner — matches Home's LoggedInDashboard header) ── */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 pt-6 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              {Icon.calendar('w-5 h-5 text-white')}
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-white leading-tight">My Upcoming Rides</h1>
          </div>
          <p className="text-blue-100 text-xs sm:text-sm ml-0.5">
            {totalRides === 0
              ? 'No scheduled rides yet'
              : `You have ${totalRides} upcoming ${totalRides === 1 ? 'ride' : 'rides'}`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16">

        {/* ── Quick stats (mirrors Home's stats bar) ── */}
        {totalRides > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 mb-6 grid grid-cols-3 gap-4 divide-x divide-gray-100">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{totalRides}</div>
              <div className="text-xs text-gray-500 mt-0.5">Total rides</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{passengerRides.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">As passenger</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{driverRides.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">As driver</div>
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        {(passengerRides.length > 0 || driverRides.length > 0) && (
          <div className="mb-6 flex gap-2 bg-white rounded-2xl border border-gray-100 p-1.5">
            <button
              onClick={() => handleTabChange('passenger')}
              className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'passenger' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-800'
                }`}
            >
              {Icon.passenger('w-4 h-4')}
              As Passenger
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'passenger' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {passengerRides.length}
              </span>
            </button>
            <button
              onClick={() => handleTabChange('driver')}
              className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'driver' ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:text-gray-800'
                }`}
            >
              {Icon.driver('w-4 h-4')}
              As Driver
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'driver' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {driverRides.length}
              </span>
            </button>
          </div>
        )}

        {/* ── Empty states (mirrors Home's EmptyRideFeed) ── */}
        {totalRides === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 sm:p-12 text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              {Icon.calendar('w-7 h-7 text-blue-400')}
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">No upcoming rides</h3>
            <p className="text-sm text-gray-500 mb-6">You don't have any scheduled rides yet.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                to="/ride/search"
                className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                {Icon.search('w-4 h-4')}
                Search rides
              </Link>
              <Link
                to="/ride/post"
                className="inline-flex items-center gap-1.5 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
              >
                {Icon.plus('w-4 h-4')}
                Post a ride
              </Link>
            </div>
          </div>
        ) : currentRides.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 sm:p-12 text-center">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              {Icon.empty('w-7 h-7 text-gray-400')}
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">
              No {activeTab === 'passenger' ? 'passenger' : 'driver'} rides
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              You don't have any upcoming rides as a {activeTab === 'passenger' ? 'passenger' : 'driver'}.
            </p>
            {activeTab === 'passenger' ? (
              <Link
                to="/ride/search"
                className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                {Icon.search('w-4 h-4')}
                Search for rides
              </Link>
            ) : (
              <Link
                to="/ride/post"
                className="inline-flex items-center gap-1.5 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
              >
                {Icon.plus('w-4 h-4')}
                Post a ride
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            {currentRides.map((booking) => {
              const dayLabel = getDayLabel(booking.ride.date);
              const isPassenger = activeTab === 'passenger';

              const phoneNumber = isPassenger
                ? (booking.ride?.phoneNumber || booking.driver?.phone || booking.ride?.driverId?.phone)
                : (booking.passenger?.phone);

              const isDownloading = downloadingReceipt === booking._id;

              const paymentDetails = isPassenger
                ? calculatePassengerPayment(booking)
                : calculateDriverEarnings(booking);

              const isSegmentBooking = booking.matchType === 'on_route' && booking.userSearchDistance;

              return (
                <div
                  key={booking._id}
                  className={`group bg-white rounded-2xl border overflow-hidden transition-all duration-200 ${isPassenger
                    ? 'border-gray-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50/60'
                    : 'border-gray-100 hover:border-green-200 hover:shadow-lg hover:shadow-green-50/60'
                    }`}
                >
                  <div className="p-4 sm:p-5">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ${dayLabel.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dayLabel.dot} ${dayLabel.label === 'TODAY' ? 'animate-pulse' : ''}`} />
                        <span className={`text-xs font-bold tracking-wide ${dayLabel.text}`}>{dayLabel.label}</span>
                        <span className={`text-xs ${dayLabel.text} opacity-70`}>· {booking.ride.time}</span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${isPassenger ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                          }`}>
                          {isPassenger ? Icon.passenger('w-3.5 h-3.5') : Icon.driver('w-3.5 h-3.5')}
                          {isPassenger ? 'Passenger' : 'Driver'}
                        </span>
                        {isSegmentBooking && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700">
                            {Icon.route('w-3.5 h-3.5')}
                            Segment · {booking.userSearchDistance?.toFixed(1)} km
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Route */}
                    <div className={`rounded-xl p-4 mb-4 bg-gradient-to-r ${isPassenger ? 'from-blue-50 to-indigo-50' : 'from-green-50 to-emerald-50'}`}>
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                        <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{booking.pickupLocation}</p>
                      </div>
                      <div className="ml-[3px] border-l-2 border-dashed border-gray-300 h-3 my-0.5 flex items-center">
                        {isSegmentBooking && (
                          <span className="ml-4 text-[11px] text-purple-600 font-medium">
                            your segment · {booking.userSearchDistance?.toFixed(1)} km
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                        <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{booking.dropLocation}</p>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-1.5 text-sm">
                        {isPassenger ? Icon.driver('w-4 h-4 text-gray-500') : Icon.passenger('w-4 h-4 text-gray-500')}
                        {isPassenger ? 'Driver information' : 'Passenger information'}
                      </h4>
                      {contactAllowed(booking) ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white p-3 rounded-lg">
                            <p className="text-[11px] text-gray-400 mb-0.5">Name</p>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {isPassenger
                                ? (booking.ride?.driverId?.name || booking.driver?.name || 'N/A')
                                : (booking.passenger?.name || 'N/A')}
                            </p>
                          </div>
                          <div className="bg-white p-3 rounded-lg">
                            <p className="text-[11px] text-gray-400 mb-0.5">Phone</p>
                            <p className="text-sm font-medium text-gray-900 truncate">{phoneNumber || 'Not provided'}</p>
                          </div>
                          {isPassenger ? (
                            <>
                              <div className="bg-white p-3 rounded-lg">
                                <p className="text-[11px] text-gray-400 mb-0.5">Vehicle</p>
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {booking.ride?.vehicleNumber || booking.ride?.vehicle || 'N/A'}
                                </p>
                              </div>
                              <div className="bg-white p-3 rounded-lg">
                                <p className="text-[11px] text-gray-400 mb-0.5">Seats booked</p>
                                <p className="text-sm font-medium text-gray-900">{booking.seatsBooked}</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="bg-white p-3 rounded-lg">
                                <p className="text-[11px] text-gray-400 mb-0.5">Email</p>
                                <p className="text-sm font-medium text-gray-900 truncate">{booking.passenger?.email || 'N/A'}</p>
                              </div>
                              <div className="bg-white p-3 rounded-lg">
                                <p className="text-[11px] text-gray-400 mb-0.5">Seats booked</p>
                                <p className="text-sm font-medium text-gray-900">{booking.seatsBooked}</p>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-600 bg-white">
                          Contact information is shared only after payment is complete and the ride is confirmed.
                        </div>
                      )}
                    </div>

                    {/* Payment */}
                    <div className={`rounded-xl p-4 mb-4 bg-gradient-to-br ${isPassenger ? 'from-blue-50 to-indigo-50' : 'from-green-50 to-emerald-50'}`}>
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <h4 className="font-semibold text-gray-800 flex items-center gap-1.5 text-sm">
                          {Icon.wallet('w-4 h-4 text-gray-500')}
                          Payment details
                        </h4>
                        {isSegmentBooking && isPassenger && booking.perKmRate && (
                          <span className="text-[11px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                            ₹{booking.perKmRate?.toFixed(2)}/km
                          </span>
                        )}
                      </div>

                      <div className="bg-white p-3.5 rounded-lg space-y-2 text-sm">
                        {isPassenger ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-500">
                                Base fare ({booking.seatsBooked} {booking.seatsBooked === 1 ? 'seat' : 'seats'})
                              </span>
                              <span className="font-medium text-gray-900">₹{paymentDetails.baseFare.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Service fee</span>
                              <span className="font-medium text-gray-900">₹{paymentDetails.serviceFee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">GST ({(GST_RATE * 100).toFixed(0)}% on fare + fee)</span>
                              <span className="font-medium text-gray-900">₹{paymentDetails.gst.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between pt-2.5 border-t border-gray-100">
                              <span className="font-bold text-gray-900">Total paid</span>
                              <span className="font-bold text-blue-600">₹{paymentDetails.totalPaid.toFixed(2)}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-500">
                                Fare set ({booking.seatsBooked} {booking.seatsBooked === 1 ? 'seat' : 'seats'})
                              </span>
                              <span className="font-medium text-gray-900">₹{paymentDetails.baseFare.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between pt-2.5 border-t border-gray-100">
                              <span className="font-bold text-gray-900">You'll receive</span>
                              <span className="font-bold text-green-600">₹{paymentDetails.netEarnings.toFixed(2)}</span>
                            </div>
                            <p className="flex items-start gap-1.5 text-[11px] text-gray-400 pt-1">
                              {Icon.info('w-3.5 h-3.5 flex-shrink-0 mt-0.5')}
                              You get your full fare — the platform's service fee is charged to the passenger, not deducted from you.
                            </p>
                          </>
                        )}
                      </div>

                      <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        {Icon.check('w-3.5 h-3.5')}
                        Payment completed
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-100 flex-wrap">
                      <button
                        onClick={() => handleCallAction(
                          booking,
                          phoneNumber,
                          isPassenger ? 'Driver' : 'Passenger',
                          isPassenger
                            ? (booking.ride?.driverId?.name || booking.driver?.name || 'N/A')
                            : (booking.passenger?.name || 'N/A')
                        )}
                        disabled={!contactAllowed(booking) || !phoneNumber}
                        className={`${isPassenger ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm ${(!contactAllowed(booking) || !phoneNumber) ? 'opacity-50 cursor-not-allowed hover:bg-none' : ''}`}
                      >
                        {Icon.phone('w-4 h-4')}
                        {contactAllowed(booking) && phoneNumber ? `Call ${isPassenger ? 'driver' : 'passenger'}` : 'Contact after confirmation'}
                      </button>

                      <button
                        onClick={() => handleDownloadReceipt(booking._id)}
                        disabled={isDownloading}
                        className="bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        {isDownloading ? (
                          <>{Icon.spinner('h-4 w-4')} Generating…</>
                        ) : (
                          <>{Icon.download('w-4 h-4')} Receipt</>
                        )}
                      </button>

                      <Link
                        to="/bookings/my-bookings"
                        className="border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:text-gray-800 transition-colors inline-flex items-center gap-1.5"
                      >
                        {Icon.ticket('w-4 h-4')}
                        All bookings
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CALL CONFIRMATION MODAL ── */}
      {showCallModal && callDetails && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 text-white p-6 rounded-t-2xl sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center">
                    {Icon.phone('w-5 h-5')}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold leading-tight">Call {callDetails.role}</h3>
                    <p className="text-blue-100 text-xs mt-0.5">Confirm phone call</p>
                  </div>
                </div>
                <button onClick={handleCancelCall} className="text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors">
                  {Icon.close('w-5 h-5')}
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {callDetails.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{callDetails.role}</p>
                    <p className="text-base font-bold text-gray-900 truncate">{callDetails.name}</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3.5 border border-blue-200">
                  <p className="text-[11px] font-semibold text-gray-400 mb-1.5">Phone number</p>
                  <p className="text-lg font-bold text-blue-600 tracking-wide flex items-center gap-2">
                    {Icon.phone('w-5 h-5')}
                    {callDetails.phoneNumber}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCancelCall}
                  className="flex-1 bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  {Icon.close('w-4 h-4')}
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCall}
                  className="flex-1 bg-green-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {Icon.phone('w-4 h-4')}
                  Call now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      `}</style>
    </div>
  );
};

export default UpcomingRides;