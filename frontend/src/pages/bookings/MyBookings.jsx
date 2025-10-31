import React, { useState, useEffect } from 'react';
import { getMyBookings, cancelBooking } from '../../services/bookingService';
import { createPaymentOrder, verifyPayment } from '../../services/paymentService';
import { useAuth } from '../../hooks/useAuth';

const MyBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(null);
  const [filter, setFilter] = useState('all');
  const [expandedBooking, setExpandedBooking] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await getMyBookings();
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMakePayment = async (booking) => {
    if (!window.Razorpay) {
      alert('Payment service is not available. Please refresh the page.');
      return;
    }

    setProcessingPayment(booking._id);

    try {
      console.log('Creating payment order for booking:', booking._id);

      const orderData = await createPaymentOrder(booking._id);

      if (!orderData.success) {
        alert('Failed to create payment order: ' + orderData.message);
        setProcessingPayment(null);
        return;
      }

      console.log('Payment order created:', orderData.data.orderId);

      const options = {
        key: orderData.data.razorpayKeyId,
        amount: orderData.data.amount,
        currency: orderData.data.currency,
        name: 'RideShare',
        description: `${orderData.data.booking.pickupLocation} → ${orderData.data.booking.dropLocation}`,
        order_id: orderData.data.orderId,
        handler: async function(response) {
          console.log('Payment successful:', response.razorpay_payment_id);

          try {
            const verifyData = await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              transactionId: orderData.data.transactionId
            });

            if (verifyData.success) {
              console.log('Payment verified successfully');
              alert(`✅ Payment Successful!\n\nAmount: ₹${verifyData.data.amount}\nDriver: ${verifyData.data.driver.name}`);
              await fetchBookings();
            } else {
              alert('Payment verification failed. Please contact support.');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            alert('Payment completed but verification failed. Please contact support with Payment ID: ' + response.razorpay_payment_id);
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
            console.log('Payment cancelled by user');
            setProcessingPayment(null);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Payment error:', error);
      alert('Failed to initiate payment: ' + (error.response?.data?.message || error.message));
      setProcessingPayment(null);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      await cancelBooking(bookingId);
      alert('Booking cancelled successfully');
      await fetchBookings();
    } catch (error) {
      alert('Failed to cancel booking: ' + error.message);
    }
  };

  const getStatusBadge = (booking) => {
    const isPaid = booking.paymentStatus === 'completed' || booking.status === 'paid';
    
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
    const isPaid = booking.paymentStatus === 'completed' || booking.status === 'paid';
    
    if (isPaid) return '💳';
    
    const icons = {
      pending: '⏳',
      accepted: '✅',
      rejected: '❌',
      cancelled: '🚫'
    };
    return icons[booking.status] || '•';
  };

  const getDisplayStatus = (booking) => {
    if (booking.paymentStatus === 'completed' || booking.status === 'paid') {
      return 'Paid';
    }
    return booking.status.charAt(0).toUpperCase() + booking.status.slice(1);
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    if (filter === 'paid') {
      return booking.paymentStatus === 'completed' || booking.status === 'paid';
    }
    return booking.status === filter;
  });

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    accepted: bookings.filter(b => b.status === 'accepted' && b.paymentStatus !== 'completed').length,
    rejected: bookings.filter(b => b.status === 'rejected').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    paid: bookings.filter(b => b.status === 'paid' || b.paymentStatus === 'completed').length
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
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">My Ride Bookings 🚗</h1>
          <p className="text-gray-600 text-sm sm:text-base">Track your ride requests and payment status</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow border-2 border-gray-200">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Total</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow border-2 border-yellow-200">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Pending</p>
            <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow border-2 border-green-200">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Accepted</p>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.accepted}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow border-2 border-blue-200">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Paid 💰</p>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.paid}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow border-2 border-red-200">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Rejected</p>
            <p className="text-2xl sm:text-3xl font-bold text-red-600">{stats.rejected}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow border-2 border-gray-200">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Cancelled</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-600">{stats.cancelled}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {['all', 'pending', 'accepted', 'paid', 'rejected', 'cancelled'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                filter === f
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 shadow-md'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({
                f === 'all' ? stats.total : 
                f === 'paid' ? stats.paid :
                stats[f]
              })
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
              const isPaid = booking.paymentStatus === 'completed' || booking.status === 'paid';
              const isExpanded = expandedBooking === booking._id;

              return (
                <div key={booking._id} className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border-2 border-gray-200 hover:shadow-2xl transition-all">
                  <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-3">
                    {/* Driver Info */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        {booking.rideId?.driverId?.name?.charAt(0).toUpperCase() || 'D'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-base sm:text-lg">
                          {booking.rideId?.driverId?.name || 'Unknown Driver'}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {booking.rideId?.driverId?.email}
                        </p>
                        <p className="text-xs text-gray-500">
                          Booked: {new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusBadge(booking)} shadow-md`}>
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
                      <p className="font-bold text-gray-900">{booking.pickupLocation}</p>
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
                      <p className="font-bold text-gray-900">{booking.dropLocation}</p>
                    </div>
                  </div>

                  {/* Booking Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 text-center border border-blue-200">
                      <p className="text-xs text-gray-600 mb-1">Seats</p>
                      <p className="font-bold text-gray-900 text-lg">{booking.seatsBooked}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 text-center border border-purple-200">
                      <p className="text-xs text-gray-600 mb-1">Date</p>
                      <p className="font-bold text-gray-900 text-xs sm:text-sm">
                        {new Date(booking.rideId?.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3 text-center border border-orange-200">
                      <p className="text-xs text-gray-600 mb-1">Time</p>
                      <p className="font-bold text-gray-900">{booking.rideId?.time}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 text-center border border-green-200">
                      <p className="text-xs text-gray-600 mb-1">Total Fare</p>
                      <p className="font-bold text-green-600 text-lg">₹{booking.totalFare?.toFixed(2)}</p>
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
                          <p className="text-blue-800 font-bold text-base sm:text-lg">Payment Successful! 💳</p>
                        </div>
                        <button
                          onClick={() => setExpandedBooking(isExpanded ? null : booking._id)}
                          className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                        >
                          {isExpanded ? 'Hide Details' : 'View Details'}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="space-y-3 pt-3 border-t-2 border-blue-200">
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <p className="text-xs text-gray-500 mb-1">Payment ID</p>
                            <p className="text-sm font-mono font-bold text-gray-900">{booking.razorpayPaymentId || 'N/A'}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <p className="text-xs text-gray-500 mb-1">Transaction ID</p>
                            <p className="text-sm font-mono font-bold text-gray-900">{booking._id}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <p className="text-xs text-gray-500 mb-1">Payment Date</p>
                            <p className="text-sm font-bold text-gray-900">
                              {booking.paymentDate ? new Date(booking.paymentDate).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'N/A'}
                            </p>
                          </div>
                          
                          {/* Fare Breakdown */}
                          <div className="bg-white rounded-lg p-4 shadow-sm">
                            <p className="text-sm font-bold text-gray-700 mb-3">Fare Breakdown:</p>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Base Fare:</span>
                                <span className="font-semibold">₹{booking.baseFare?.toFixed(2) || '0.00'}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Platform Fee:</span>
                                <span className="font-semibold">₹{booking.platformFee?.toFixed(2) || '0.00'}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">GST (18%):</span>
                                <span className="font-semibold">₹{booking.gst?.toFixed(2) || '0.00'}</span>
                              </div>
                              <div className="border-t-2 border-gray-200 pt-2 mt-2 flex justify-between">
                                <span className="font-bold text-gray-800">Total Paid:</span>
                                <span className="font-bold text-green-600 text-lg">₹{booking.totalFare?.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                            <p className="text-green-800 text-sm font-semibold">✓ Your ride is confirmed!</p>
                            <p className="text-green-700 text-xs mt-1">Driver will contact you at: {booking.rideId?.driverId?.email}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status Messages & Actions for Non-Paid */}
                  {booking.status === 'accepted' && !isPaid && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4">
                      <p className="text-green-800 font-bold mb-2">🎉 Booking Confirmed!</p>
                      <p className="text-green-700 text-sm">
                        Driver: {booking.rideId?.driverId?.name} ({booking.rideId?.driverId?.email})
                      </p>
                      <p className="text-green-600 text-xs mt-2">⚠️ Please complete payment to confirm your ride</p>
                    </div>
                  )}

                  {booking.status === 'rejected' && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
                      <p className="text-red-800 font-bold">❌ Request Rejected</p>
                      <p className="text-red-700 text-sm mt-1">Driver was unable to accept your booking</p>
                    </div>
                  )}

                  {booking.status === 'pending' && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-4">
                      <p className="text-yellow-800 font-bold">⏳ Awaiting Confirmation</p>
                      <p className="text-yellow-700 text-sm mt-1">Driver hasn't responded yet. Please wait...</p>
                    </div>
                  )}

                  {booking.status === 'cancelled' && (
                    <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 mb-4">
                      <p className="text-gray-800 font-bold">🚫 Booking Cancelled</p>
                      <p className="text-gray-700 text-sm mt-1">This booking was cancelled</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {booking.status === 'accepted' && !isPaid && (
                      <button
                        onClick={() => handleMakePayment(booking)}
                        disabled={processingPayment === booking._id}
                        className="flex-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
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
                            Make Payment ₹{booking.totalFare?.toFixed(2)}
                          </>
                        )}
                      </button>
                    )}

                    {(booking.status === 'pending' || (booking.status === 'accepted' && !isPaid)) && (
                      <button
                        onClick={() => handleCancelBooking(booking._id)}
                        className="px-6 py-3 border-2 border-red-500 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-all shadow-md hover:shadow-lg"
                      >
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