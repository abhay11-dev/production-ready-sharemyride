import React, { useState, useEffect } from 'react';
import { getMyBookings, cancelBooking } from '../../services/bookingService';
import { createPaymentOrder, verifyPayment } from '../../services/paymentService';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

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
      
      console.log('📋 My bookings loaded:', bookingsArray.length);
      setBookings(bookingsArray);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]); // ✅ Set empty array on error
      toast.error('Failed to load bookings', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  // In MyBookings.jsx, update the handleMakePayment function:

const handleMakePayment = async (booking) => {
  if (!window.Razorpay) {
    toast.error('Payment service is not available. Please refresh the page.', {
      duration: 4000,
      position: 'top-center',
    });
    return;
  }

  setProcessingPayment(booking._id);

  try {
    console.log('Creating payment order for booking:', booking._id);

    // ✅ Extract rideId from booking
    const rideId = booking.ride?._id || booking.rideId?._id || booking.rideId;
    
    if (!rideId) {
      toast.error('Ride information is missing. Please try again.');
      setProcessingPayment(null);
      return;
    }

    // ✅ Pass both bookingId and rideId
    const response = await createPaymentOrder(booking._id, rideId);

    if (!response.success) {
      toast.error('Failed to create payment order: ' + response.message);
      setProcessingPayment(null);
      return;
    }

      const orderData = response.data;

      const options = {
        key: orderData.razorpayKeyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'ShareMyRide',
        description: `${booking.pickupLocation} → ${booking.dropLocation}`,
        order_id: orderData.orderId,
        handler: async function(razorpayResponse) {
          console.log('Payment successful:', razorpayResponse.razorpay_payment_id);

          try {
            const verifyingToast = toast.loading('Verifying payment...', {
              position: 'top-center',
            });

            const verifyData = await verifyPayment({
              razorpay_order_id: razorpayResponse.razorpay_order_id,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature,
              bookingId: booking._id
            });

            toast.dismiss(verifyingToast);

            if (verifyData.success) {
              toast.success('Payment Successful! ', {
                duration: 5000,
                position: 'top-center',
                style: {
                  background: '#10B981',
                  color: '#fff',
                  fontWeight: '600',
                  padding: '16px',
                  borderRadius: '12px',
                },
              });
              
              await fetchBookings();
            } else {
              toast.error('Payment verification failed. Please contact support.');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
              toast.success('Payment successful! Verification in progress.', {
                duration: 6000,
              });
              setTimeout(() => fetchBookings(), 3000);
            } else {
              toast.error('Payment completed but verification failed. Your booking will be updated shortly.');
            }
          } finally {
            setProcessingPayment(null);
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '9999999999'
        },
        theme: {
          color: '#3B82F6'
        },
        modal: {
          ondismiss: function() {
            toast('Payment Cancelled', {
              icon: '⚠️',
              duration: 4000,
              position: 'top-center',
            });
            setProcessingPayment(null);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);
        toast.error(`Payment failed: ${response.error.description || 'Please try again'}`);
        setProcessingPayment(null);
      });
      
      rzp.open();

    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment: ' + (error.response?.data?.message || error.message));
      setProcessingPayment(null);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Cancel Booking</p>
            <p className="text-sm text-gray-600 mt-0.5">Are you sure? This action cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            Keep Booking
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await cancelBooking(bookingId);
                toast.success('Booking cancelled successfully', {
                  duration: 3000,
                  style: {
                    background: '#10B981',
                    color: '#fff',
                    fontWeight: '600',
                    padding: '16px',
                    borderRadius: '12px',
                  },
                });
                await fetchBookings();
              } catch (error) {
                toast.error('Failed to cancel booking: ' + error.message);
              }
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors duration-200"
          >
            Yes, Cancel
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      position: 'top-center',
      style: {
        background: '#fff',
        padding: '20px',
        borderRadius: '12px',
        border: '2px solid #EF4444',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        maxWidth: '500px',
      },
    });
  };

  const getStatusBadge = (booking) => {
    const isPaid = booking.paymentStatus === 'completed' || booking.status === 'completed';
    
    if (isPaid) return 'bg-blue-100 text-blue-800 border-2 border-blue-300';
    
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300',
      accepted: 'bg-green-100 text-green-800 border-2 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-2 border-red-300',
      cancelled: 'bg-gray-100 text-gray-800 border-2 border-gray-300'
    };
    return badges[booking.status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (booking) => {
    const isPaid = booking.paymentStatus === 'completed' || booking.status === 'completed';
    
    if (isPaid) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    
    const icons = {
      pending: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      accepted: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      rejected: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      cancelled: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      )
    };
    return icons[booking.status] || null;
  };

  const getDisplayStatus = (booking) => {
    if (booking.paymentStatus === 'completed' || booking.status === 'completed') {
      return 'Paid';
    }
    return booking.status.charAt(0).toUpperCase() + booking.status.slice(1);
  };

  // ✅ Safe array handling
  const safeBookings = Array.isArray(bookings) ? bookings : [];

  const filteredBookings = safeBookings.filter(booking => {
    if (filter === 'all') return true;
    if (filter === 'paid') {
      return booking.paymentStatus === 'completed' || booking.status === 'completed';
    }
    return booking.status === filter;
  });

  const stats = {
    total: safeBookings.length,
    pending: safeBookings.filter(b => b.status === 'pending').length,
    accepted: safeBookings.filter(b => b.status === 'accepted' && b.paymentStatus !== 'completed').length,
    rejected: safeBookings.filter(b => b.status === 'rejected').length,
    cancelled: safeBookings.filter(b => b.status === 'cancelled').length,
    paid: safeBookings.filter(b => b.status === 'completed' || b.paymentStatus === 'completed').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">My Ride Bookings</h1>
          </div>
          <p className="text-gray-600 text-sm sm:text-base">Track your ride requests and payment status</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow border-2 border-gray-200">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-1 text-center">Total</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow border-2 border-yellow-200">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-1 text-center">Pending</p>
            <p className="text-2xl sm:text-3xl font-bold text-yellow-600 text-center">{stats.pending}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow border-2 border-green-200">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-1 text-center">Accepted</p>
            <p className="text-2xl sm:text-3xl font-bold text-green-600 text-center">{stats.accepted}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow border-2 border-blue-200">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-1 text-center">Paid</p>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600 text-center">{stats.paid}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow border-2 border-red-200">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-1 text-center">Rejected</p>
            <p className="text-2xl sm:text-3xl font-bold text-red-600 text-center">{stats.rejected}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow border-2 border-gray-200">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-1 text-center">Cancelled</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-600 text-center">{stats.cancelled}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {['all', 'pending', 'accepted', 'paid', 'rejected', 'cancelled'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                filter === f
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 shadow-md'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center border-2 border-gray-200">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg font-semibold">No {filter !== 'all' ? filter : ''} bookings found</p>
            <p className="text-gray-400 text-sm mt-2">Your ride bookings will appear here</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {filteredBookings.map((booking) => {
              const isPaid = booking.paymentStatus === 'completed' || booking.status === 'completed';
              const isExpanded = expandedBooking === booking._id;
              
              // ✅ NEW SCHEMA: Safe access to nested data
              const driver = booking.driver || booking.driverId || {};
              const ride = booking.ride || booking.rideId || {};
              
              // ✅ NEW PAYMENT SYSTEM: Platform takes 8% from base fare + 18% GST on that 8%
              const baseFare = booking.baseFare || 0;
              const platformDeduction = baseFare * 0.08; // 8% of base fare
              const gstOnPlatformFee = platformDeduction * 0.18; // 18% GST on the 8%
              const driverReceives = baseFare - platformDeduction - gstOnPlatformFee;
              
              // Passenger pays the full base fare (platform fee is deducted from driver's earnings)
              const totalPassengerPays = baseFare;

              return (
                <div key={booking._id} className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border-2 border-gray-200 hover:shadow-2xl transition-all">
                  <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        {(driver.name || 'D').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-base sm:text-lg">
                          {driver.name || 'Unknown Driver'}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {driver.email || 'No email'}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusBadge(booking)} shadow-md inline-flex items-center gap-2`}>
                      {getStatusIcon(booking)} {getDisplayStatus(booking)}
                    </span>
                  </div>

                  {/* Route */}
                  <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 rounded-xl p-4 mb-4 border-2 border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="font-bold text-gray-900">{booking.pickupLocation || 'Not specified'}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-7 my-1">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      <span className="text-xs text-gray-500 font-medium">Traveling...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="font-bold text-gray-900">{booking.dropLocation || 'Not specified'}</p>
                    </div>
                    {ride.date && (
                      <div className="mt-3 pt-3 border-t border-blue-200 flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(ride.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        {ride.time && (
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                             {ride.time}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Booking Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 text-center border border-blue-200">
                      <div className="flex items-center justify-center mb-1">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">Seats</p>
                      <p className="font-bold text-gray-900 text-lg">{booking.seatsBooked || 1}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 text-center border border-purple-200">
                      <div className="flex items-center justify-center mb-1">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">Base Fare</p>
                      <p className="font-bold text-purple-900 text-lg">₹{baseFare.toFixed(2)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3 text-center border border-orange-200">
                      <div className="flex items-center justify-center mb-1">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                        </svg>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">Platform Fee + GST</p>
                      <p className="font-bold text-yellow-600 text-lg">₹{(platformDeduction + gstOnPlatformFee).toFixed(2)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 text-center border border-green-200">
                      <div className="flex items-center justify-center mb-1">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">You Pay</p>
                      <p className="font-bold text-green-600 text-lg">₹{(baseFare + (platformDeduction + gstOnPlatformFee)).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Payment Details for Paid Bookings */}
                  {isPaid && (
                    <div className="bg-gradient-to-r from-blue-50 via-green-50 to-purple-50 border-2 border-blue-300 rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-blue-800 font-bold text-base sm:text-lg">Payment Successful! 🎉</p>
                        </div>
                        <button
                          onClick={() => setExpandedBooking(isExpanded ? null : booking._id)}
                          className="text-blue-600 cursor-pointer hover:text-blue-800 font-semibold text-sm flex items-center gap-1 transition-colors duration-200"
                        >
                          {isExpanded ? 'Hide' : 'Details'}
                          <svg 
                            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="space-y-3 pt-3 border-t-2 border-blue-200">
                          {booking.razorpayPaymentId && (
                            <div className="bg-white rounded-lg p-3 shadow-sm">
                              <div className="flex items-center gap-2 mb-1">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                </svg>
                                <p className="text-xs text-gray-500">Payment ID</p>
                              </div>
                              <p className="text-sm font-mono font-bold text-gray-900">{booking.razorpayPaymentId}</p>
                            </div>
                          )}
                          
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              <p className="text-xs text-gray-500">Booking ID</p>
                            </div>
                            <p className="text-sm font-mono font-bold text-gray-900">{booking._id}</p>
                          </div>
                          
                          {booking.paymentCompletedAt && (
                            <div className="bg-white rounded-lg p-3 shadow-sm">
                              <div className="flex items-center gap-2 mb-1">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-xs text-gray-500">Payment Date</p>
                              </div>
                              <p className="text-sm font-bold text-gray-900">
                                {new Date(booking.paymentCompletedAt).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          )}
                          
                          <div className="bg-white rounded-lg p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <p className="text-sm font-bold text-gray-700">Fare Breakdown:</p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Base Fare (Trip Cost):</span>
                                <span className="font-semibold">₹{baseFare.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-sm text-gray-500">
                                <span className="pl-4">+ Platform Fee (8%):</span>
                                <span>₹{platformDeduction.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-sm text-gray-500">
                                <span className="pl-4">+ GST on Platform Fee (18%):</span>
                                <span>₹{gstOnPlatformFee.toFixed(2)}</span>
                              </div>
                             
                              <div className="border-t-2 border-gray-300 pt-2 mt-2 flex justify-between">
                                <span className="font-bold text-gray-800">You Paid:</span>
                                <span className="font-bold text-green-600 text-lg">
                                  ₹{(baseFare + platformDeduction + gstOnPlatformFee).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="text-green-800 text-sm font-semibold">Your ride is confirmed!</p>
                            </div>
                            <p className="text-green-700 text-xs mt-1 ml-7">Driver: {driver.name} ({driver.email})</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status Messages & Actions for Non-Paid */}
                  {booking.status === 'accepted' && !isPaid && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-green-800 font-bold">Booking Confirmed!</p>
                      </div>
                      <p className="text-green-700 text-sm mb-2">
                        Driver: {driver.name} ({driver.email})
                      </p>
                      {booking.confirmedAt && (
                        <p className="text-green-600 text-xs mb-2">
                          Confirmed {new Date(booking.confirmedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      {/* <div className="bg-white rounded-lg p-3 mt-2">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-xs text-gray-600 font-semibold">Payment Due:</p>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Trip Fare:</span>
                            <span>₹{baseFare.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 pl-4">
                            <span>Platform deducts from driver (8%):</span>
                            <span>-₹{platformDeduction.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 pl-4">
                            <span>GST on platform fee (18%):</span>
                            <span>-₹{gstOnPlatformFee.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-blue-600 pl-4 pt-1">
                            <span>Driver receives:</span>
                            <span>₹{driverReceives.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t pt-1 font-bold text-green-600">
                            <span>You Pay (Total Trip Cost):</span>
                            <span>₹{totalPassengerPays.toFixed(2)}</span>
                          </div>
                        </div>
                      </div> */}
                    </div>
                  )}

                  {booking.status === 'rejected' && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-red-800 font-bold">Request Rejected</p>
                      </div>
                      <p className="text-red-700 text-sm mt-1 ml-8">Driver was unable to accept your booking</p>
                      {booking.rejectionReason && (
                        <p className="text-red-600 text-xs mt-2 ml-8">Reason: {booking.rejectionReason}</p>
                      )}
                    </div>
                  )}

                  {booking.status === 'pending' && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-yellow-800 font-bold">Awaiting Confirmation</p>
                      </div>
                      <p className="text-yellow-700 text-sm mt-1 ml-8">Driver hasn't responded yet. Please wait...</p>
                    </div>
                  )}

                  {booking.status === 'cancelled' && (
                    <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        <p className="text-gray-800 font-bold">Booking Cancelled</p>
                      </div>
                      <p className="text-gray-700 text-sm mt-1 ml-8">This booking was cancelled</p>
                      {booking.cancellationReason && (
                        <p className="text-gray-600 text-xs mt-2 ml-8">Reason: {booking.cancellationReason}</p>
                      )}
                      {booking.cancelledAt && (
                        <p className="text-gray-500 text-xs mt-1 ml-8">
                          Cancelled {new Date(booking.cancelledAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {booking.status === 'accepted' && !isPaid && (
                      <button
                        onClick={() => handleMakePayment(booking)}
                        disabled={processingPayment === booking._id}
                        className="flex-1 bg-blue-600 cursor-pointer text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                      >
                        {processingPayment === booking._id ? (
                          <>
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            Pay ₹{(baseFare + (platformDeduction + gstOnPlatformFee)).toFixed(2)}
                          </>
                        )}
                      </button>
                    )}

                    {(booking.status === 'pending' || (booking.status === 'accepted' && !isPaid)) && (
                      <button
                        onClick={() => handleCancelBooking(booking._id)}
                        className="px-6 py-3 border-2 cursor-pointer border-red-500 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-all duration-200 shadow-sm hover:shadow-md inline-flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel
                      </button>
                    )}
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