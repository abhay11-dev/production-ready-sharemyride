import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyBookings, cancelBooking } from '../../services/bookingService';
import { createPaymentOrder, verifyPayment } from '../../services/paymentService';
import { useAuth } from '../../hooks/useAuth';
import toastService from '../../services/toastService';

const formatRazorpayFailure = (response) => {
  const error = response?.error;
  if (!error) {
    return 'Payment failed. Please try again.';
  }

  const baseMessage = error.description || error.reason || error.code || 'Payment failed.';
  const details = [];
  if (error.reason) details.push(`Reason: ${error.reason}`);
  if (error.step) details.push(`Step: ${error.step}`);
  if (error.source) details.push(`Source: ${error.source}`);

  return details.length ? `${baseMessage} (${details.join(', ')})` : baseMessage;
};

const getBookingPaymentTotal = (booking) => {
  const finalAmount = Number(booking?.finalAmount ?? booking?.totalFare ?? 0);
  if (finalAmount > 0) return finalAmount;

  const baseFare = Number(booking?.baseFare ?? 0);
  const serviceFee = Number(booking?.passengerServiceFee ?? booking?.platformFee ?? (baseFare * 0.03));
  const gst = Number(booking?.passengerServiceFeeGST ?? booking?.gst ?? ((baseFare + serviceFee) * 0.05));
  return Number((baseFare + serviceFee + gst).toFixed(2));
};

const isPaymentAmountValid = (booking) => getBookingPaymentTotal(booking) > 0;

// ─── Icons (heroicons-outline, stroke-2 — same set as Home.jsx / UpcomingRides.jsx) ──
const Icon = {
  ticket: (cls) => (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  clock: (cls) => (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  check: (cls) => (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  x: (cls) => (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  cancelled: (cls) => (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
  wallet: (cls) => (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
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
  calendar: (cls) => (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  chevronDown: (cls) => (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  spinner: (cls) => (
    <svg className={`animate-spin ${cls}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  ),
  card: (cls) => (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  alert: (cls) => (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  empty: (cls) => (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
};

const STATUS_STYLE = {
  pending: { badge: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-400', icon: Icon.clock, label: 'Pending' },
  accepted: { badge: 'bg-green-50 text-green-700 border border-green-200', dot: 'bg-green-500', icon: Icon.check, label: 'Accepted' },
  rejected: { badge: 'bg-red-50 text-red-700 border border-red-200', dot: 'bg-red-500', icon: Icon.x, label: 'Rejected' },
  cancelled: { badge: 'bg-gray-100 text-gray-600 border border-gray-200', dot: 'bg-gray-400', icon: Icon.cancelled, label: 'Cancelled' },
  paid: { badge: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-500', icon: Icon.check, label: 'Paid' },
};

const MyBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(null);
  const [filter, setFilter] = useState('all');
  const [expandedBooking, setExpandedBooking] = useState(null);

  useEffect(() => {
    fetchBookings();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchBookings, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await getMyBookings();

      // ✅ Handle multiple response formats
      let bookingsArray = [];
      if (Array.isArray(response)) {
        bookingsArray = response;
      } else if (response.data && Array.isArray(response.data)) {
        bookingsArray = response.data;
      } else if (response.bookings && Array.isArray(response.bookings)) {
        bookingsArray = response.bookings;
      }

      setBookings(bookingsArray);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]);
      toastService.error('Failed to load bookings', 'Unable to fetch your bookings. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMakePayment = async (booking) => {
    if (!window.Razorpay) {
      toastService.error('Payment service unavailable', 'Please refresh the page and try again.');
      return;
    }

    setProcessingPayment(booking._id);

    try {
      const bookingPaymentTotal = getBookingPaymentTotal(booking);
      if (bookingPaymentTotal <= 0) {
        toastService.error('Unable to start payment', 'This booking has an invalid payable amount. Please refresh or contact support.');
        setProcessingPayment(null);
        return;
      }

      const rideId = booking.ride?._id || booking.rideId?._id || booking.rideId;

      if (!rideId) {
        toastService.error('Ride information missing', 'We could not resolve the ride details for this booking.');
        setProcessingPayment(null);
        return;
      }

      const response = await createPaymentOrder(booking._id, rideId);

      if (!response.success) {
        toastService.error('Unable to create payment', response.message || 'Please try again.');
        setProcessingPayment(null);
        return;
      }

      const {
        orderId,
        order_id,
        amount,
        currency,
        razorpayKeyId,
        key_id
      } = response.data;
      const razorpayOrderId = orderId || order_id;
      const razorpayKey = razorpayKeyId || key_id;
      const orderAmount = Number(amount ?? 0);

      if (!orderAmount || orderAmount <= 0) {
        toastService.error('Invalid payment order', 'The Razorpay order returned a zero amount. Please refresh and try again.');
        setProcessingPayment(null);
        return;
      }

      const orderData = response.data;

      const options = {
        key: razorpayKey,
        amount: amount,
        currency: currency,
        name: 'ShareMyRide',
        description: `${booking.pickupLocation} → ${booking.dropLocation}`,
        order_id: razorpayOrderId,

        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '9999999999'
        },

        theme: { color: '#2563eb' },
        notes: {
          booking_id: booking._id,
          passenger_id: user?.id || user?._id,
          pickup: booking.pickupLocation,
          drop: booking.dropLocation,
          seats: booking.seatsBooked
        },

        handler: async function (razorpayResponse) {
          try {
            const verifyingToast = toastService.loading('Verifying payment…');

            const verifyData = await verifyPayment({
              razorpay_order_id: razorpayResponse.razorpay_order_id,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature,
              bookingId: booking._id,
            });

            toastService.dismiss(verifyingToast);

            if (verifyData.success) {
              toastService.success('Payment successful', 'Your ride payment has been verified.');
              await fetchBookings();
            } else {
              toastService.error('Payment verification failed', 'Your transaction was successful but verification failed. Please contact support.');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
              toastService.success('Payment successful', 'Verification is still in progress. We will update your booking shortly.');
              setTimeout(() => fetchBookings(), 3000);
            } else {
              toastService.error('Payment verification failed', 'Your payment completed, but verification failed. Please contact support.');
            }
          } finally {
            setProcessingPayment(null);
          }
        },

        modal: {
          ondismiss: function () {
            toastService.warning('Payment cancelled', 'The payment modal was closed before completion. You can try again when ready.');
            setProcessingPayment(null);
          },
        },
      };

      console.log('Opening Razorpay Checkout with:', {
        key: razorpayKey,
        order_id: razorpayOrderId,
        amount,
        currency,
        name: 'ShareMyRide'
      });

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', function (response) {
        console.error('Payment failed object:', response);
        console.error('Payment failed details:', {
          code: response.error?.code,
          description: response.error?.description,
          reason: response.error?.reason,
          source: response.error?.source,
          step: response.error?.step,
          metadata: response.error?.metadata
        });

        const failureMessage = formatRazorpayFailure(response);
        toastService.error('Payment failed', failureMessage);
        setProcessingPayment(null);
      });

      rzp.open();
    } catch (error) {
      console.error('Payment error:', error);
      toastService.error('Failed to initiate payment', error.response?.data?.message || error.message || 'Please try again.');
      setProcessingPayment(null);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    toastService.confirm({
      title: 'Cancel booking?',
      message: 'This action cannot be undone.',
      confirmLabel: 'Yes, cancel',
      cancelLabel: 'Keep booking',
      danger: true,
      onConfirm: async () => {
        try {
          await cancelBooking(bookingId);
          toastService.success('Booking cancelled', 'Your booking was cancelled successfully.');
          await fetchBookings();
        } catch (error) {
          toastService.error('Failed to cancel booking', error.message || 'Please try again.');
        }
      },
      onCancel: () => {
        toastService.info('Cancellation aborted', 'Your booking is still active.');
      },
    });
  };

  const getDisplayStatus = (booking) => {
    if (booking.paymentStatus === 'completed' || booking.status === 'completed') return 'paid';
    return booking.status;
  };

  const canShowContact = (booking) => {
    const status = booking.status;
    const paymentCompleted = booking.paymentStatus === 'completed';
    return paymentCompleted && (status === 'accepted' || status === 'completed');
  };

  const safeBookings = Array.isArray(bookings) ? bookings : [];

  const filteredBookings = safeBookings.filter(booking => {
    if (filter === 'all') return true;
    if (filter === 'paid') return booking.paymentStatus === 'completed' || booking.status === 'completed';
    return booking.status === filter;
  });

  const stats = {
    total: safeBookings.length,
    pending: safeBookings.filter(b => b.status === 'pending').length,
    accepted: safeBookings.filter(b => b.status === 'accepted' && b.paymentStatus !== 'completed').length,
    paid: safeBookings.filter(b => b.status === 'completed' || b.paymentStatus === 'completed').length,
    rejected: safeBookings.filter(b => b.status === 'rejected').length,
    cancelled: safeBookings.filter(b => b.status === 'cancelled').length,
  };

  const FILTERS = [
    { id: 'all', label: 'All', count: stats.total },
    { id: 'pending', label: 'Pending', count: stats.pending },
    { id: 'accepted', label: 'Accepted', count: stats.accepted },
    { id: 'paid', label: 'Paid', count: stats.paid },
    { id: 'rejected', label: 'Rejected', count: stats.rejected },
    { id: 'cancelled', label: 'Cancelled', count: stats.cancelled },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading your bookings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── HEADER (gradient banner — matches Home / UpcomingRides) ── */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 pt-6 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              {Icon.ticket('w-5 h-5 text-white')}
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-white leading-tight">My Ride Bookings</h1>
          </div>
          <p className="text-blue-100 text-xs sm:text-sm ml-0.5">Track your ride requests and payment status</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16">

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900' },
            { label: 'Pending', value: stats.pending, color: 'text-amber-600' },
            { label: 'Accepted', value: stats.accepted, color: 'text-green-600' },
            { label: 'Paid', value: stats.paid, color: 'text-blue-600' },
            { label: 'Rejected', value: stats.rejected, color: 'text-red-600' },
            { label: 'Cancelled', value: stats.cancelled, color: 'text-gray-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 text-center">
              <p className={`text-lg sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 bg-white rounded-3xl border border-gray-100 p-4 shadow-sm">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`w-full rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center ${filter === f.id ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-gray-600 bg-gray-50 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Empty state ── */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 sm:p-12 text-center">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              {Icon.empty('w-7 h-7 text-gray-400')}
            </div>
            <p className="font-semibold text-gray-900 mb-1">No {filter !== 'all' ? filter : ''} bookings found</p>
            <p className="text-sm text-gray-500 mb-6">Your ride bookings will appear here</p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  {Icon.ticket('w-4 h-4')}
                  View all bookings
                </button>
              )}
              <Link
                to="/ride/search"
                className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                {Icon.pin('w-4 h-4')}
                Search rides
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            {filteredBookings.map((booking) => {
              const displayStatus = getDisplayStatus(booking);
              const statusStyle = STATUS_STYLE[displayStatus] || STATUS_STYLE.pending;
              const isPaid = displayStatus === 'paid';
              const isExpanded = expandedBooking === booking._id;

              const driver = booking.driver || booking.driverId || {};
              const ride = booking.ride || booking.rideId || {};

              // Booking amount is computed with a safe helper so zero values are handled consistently.
              const totalPassengerPays = getBookingPaymentTotal(booking);
              const isPaymentValid = totalPassengerPays > 0;
              const baseFare = Number(booking?.baseFare ?? 0);
              const platformDeduction = Number(booking?.passengerServiceFee ?? booking?.platformFee ?? (baseFare * 0.03));
              const gstOnPlatformFee = Number(booking?.passengerServiceFeeGST ?? booking?.gst ?? ((baseFare + platformDeduction) * 0.05));

              return (
                <div key={booking._id} className="bg-white rounded-2xl border border-gray-100 hover:shadow-lg hover:shadow-blue-50/60 transition-all duration-200 overflow-hidden">
                  <div className="p-4 sm:p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {(driver.name || 'D').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{driver.name || 'Unknown Driver'}</p>
                          <p className="text-xs text-gray-400">
                            {canShowContact(booking)
                              ? (driver.email || 'No email')
                              : 'Contact details will appear after payment and ride confirmation.'}
                          </p>
                          <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                            {Icon.calendar('w-3 h-3')}
                            {new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${statusStyle.badge}`}>
                        {statusStyle.icon('w-3.5 h-3.5')}
                        {isPaid ? 'Paid' : statusStyle.label}
                      </span>
                    </div>

                    {/* Route */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                        <p className="font-semibold text-gray-900 text-sm truncate">{booking.pickupLocation || 'Not specified'}</p>
                      </div>
                      <div className="ml-[3px] border-l-2 border-dashed border-gray-300 h-3 my-0.5" />
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                        <p className="font-semibold text-gray-900 text-sm truncate">{booking.dropLocation || 'Not specified'}</p>
                      </div>
                      {ride.date && (
                        <div className="mt-3 pt-3 border-t border-blue-100 flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">{Icon.calendar('w-3.5 h-3.5')}{new Date(ride.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          {ride.time && <span className="flex items-center gap-1">{Icon.clock('w-3.5 h-3.5')}{ride.time}</span>}
                        </div>
                      )}
                    </div>

                    {/* Quick stats row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-[11px] text-gray-400 mb-0.5">Seats</p>
                        <p className="font-bold text-gray-900">{booking.seatsBooked || 1}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-[11px] text-gray-400 mb-0.5">Base fare</p>
                        <p className="font-bold text-gray-900">₹{baseFare.toFixed(2)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-[11px] text-gray-400 mb-0.5">Fee + GST</p>
                        <p className="font-bold text-gray-900">₹{(platformDeduction + gstOnPlatformFee).toFixed(2)}</p>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-3 text-center">
                        <p className="text-[11px] text-blue-500 mb-0.5">You pay</p>
                        <p className="font-bold text-blue-700">₹{totalPassengerPays.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Paid detail expander */}
                    {isPaid && (
                      <div className="bg-blue-50 rounded-xl p-4 mb-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
                            {Icon.check('w-4 h-4')}
                            Payment successful
                          </p>
                          <button
                            onClick={() => setExpandedBooking(isExpanded ? null : booking._id)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-semibold flex items-center gap-1"
                          >
                            {isExpanded ? 'Hide' : 'Details'}
                            <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>{Icon.chevronDown('w-3.5 h-3.5')}</span>
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="space-y-2.5 pt-3 mt-3 border-t border-blue-100">
                            {booking.razorpayPaymentId && (
                              <div className="bg-white rounded-lg p-3">
                                <p className="text-[11px] text-gray-400 mb-0.5">Payment ID</p>
                                <p className="text-xs font-mono font-semibold text-gray-900">{booking.razorpayPaymentId}</p>
                              </div>
                            )}
                            <div className="bg-white rounded-lg p-3">
                              <p className="text-[11px] text-gray-400 mb-0.5">Booking ID</p>
                              <p className="text-xs font-mono font-semibold text-gray-900">{booking._id}</p>
                            </div>
                            {booking.paymentCompletedAt && (
                              <div className="bg-white rounded-lg p-3">
                                <p className="text-[11px] text-gray-400 mb-0.5">Payment date</p>
                                <p className="text-xs font-semibold text-gray-900">
                                  {new Date(booking.paymentCompletedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            )}
                            <div className="bg-white rounded-lg p-3.5 space-y-1.5 text-xs">
                              <div className="flex justify-between"><span className="text-gray-500">Base fare</span><span className="font-semibold text-gray-900">₹{baseFare.toFixed(2)}</span></div>
                              <div className="flex justify-between text-gray-400"><span className="pl-3">+ Platform fee (3%)</span><span>₹{platformDeduction.toFixed(2)}</span></div>
                              <div className="flex justify-between text-gray-400"><span className="pl-3">+ GST (5% on fare + fee)</span><span>₹{gstOnPlatformFee.toFixed(2)}</span></div>
                              <div className="flex justify-between pt-2 border-t border-gray-100">
                                <span className="font-bold text-gray-900">You paid</span>
                                <span className="font-bold text-blue-600">₹{totalPassengerPays.toFixed(2)}</span>
                              </div>
                            </div>
                            <p className="text-xs text-blue-700 flex items-center gap-1.5">
                              {Icon.check('w-3.5 h-3.5')}
                              Ride confirmed with {driver.name} ({driver.email})
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status messages for non-paid */}
                    {booking.status === 'accepted' && !isPaid && (
                      <div className="bg-green-50 rounded-xl p-4 mb-4">
                        <p className="text-sm font-semibold text-green-800 flex items-center gap-1.5">{Icon.check('w-4 h-4')} Booking confirmed!</p>
                        <p className="text-xs text-green-700 mt-1">Driver details are shared after payment is complete.</p>
                        {booking.confirmedAt && (
                          <p className="text-[11px] text-green-600 mt-1">
                            Confirmed {new Date(booking.confirmedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    )}

                    {booking.status === 'rejected' && (
                      <div className="bg-red-50 rounded-xl p-4 mb-4">
                        <p className="text-sm font-semibold text-red-800 flex items-center gap-1.5">{Icon.x('w-4 h-4')} Request rejected</p>
                        <p className="text-xs text-red-700 mt-1">Driver was unable to accept your booking</p>
                        {booking.rejectionReason && <p className="text-xs text-red-600 mt-1">Reason: {booking.rejectionReason}</p>}
                      </div>
                    )}

                    {booking.status === 'pending' && (
                      <div className="bg-amber-50 rounded-xl p-4 mb-4">
                        <p className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">{Icon.clock('w-4 h-4')} Awaiting confirmation</p>
                        <p className="text-xs text-amber-700 mt-1">Driver hasn't responded yet. Please wait…</p>
                      </div>
                    )}

                    {booking.status === 'cancelled' && (
                      <div className="bg-gray-50 rounded-xl p-4 mb-4">
                        <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">{Icon.cancelled('w-4 h-4')} Booking cancelled</p>
                        {booking.cancellationReason && <p className="text-xs text-gray-500 mt-1">Reason: {booking.cancellationReason}</p>}
                        {booking.cancelledAt && (
                          <p className="text-[11px] text-gray-400 mt-1">
                            Cancelled {new Date(booking.cancelledAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2.5 flex-wrap">
                      {booking.status === 'accepted' && !isPaid && (
                        <button
                          onClick={() => handleMakePayment(booking)}
                          disabled={processingPayment === booking._id || !isPaymentValid}
                          className="flex-1 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                        >
                          {processingPayment === booking._id ? (
                            <>{Icon.spinner('h-4 w-4')} Processing…</>
                          ) : isPaymentValid ? (
                            <>{Icon.card('w-4 h-4')} Pay ₹{totalPassengerPays.toFixed(2)}</>
                          ) : (
                            <>Invalid amount</>
                          )}
                        </button>
                      )}

                      {(booking.status === 'pending' || (booking.status === 'accepted' && !isPaid)) && (
                        <button
                          onClick={() => handleCancelBooking(booking._id)}
                          className="px-5 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors inline-flex items-center gap-1.5"
                        >
                          {Icon.x('w-4 h-4')}
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;