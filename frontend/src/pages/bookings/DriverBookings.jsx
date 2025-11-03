import React, { useState, useEffect } from 'react';
import { getDriverBookings, updateBookingStatus } from '../../services/bookingService';
import { useAuth } from '../../hooks/useAuth';
import { PaymentCalculator } from '../../utils/paymentCalculator';

function DriverBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingBookingId, setProcessingBookingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDriverBookings();
      setBookings(data);
    } catch (err) {
      setError('Failed to load booking requests');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId, status) => {
    setProcessingBookingId(bookingId);
    try {
      await updateBookingStatus(bookingId, status);
      // Update local state
      setBookings(bookings.map(booking => 
        booking._id === bookingId 
          ? { ...booking, status } 
          : booking
      ));
    } catch (err) {
      alert('Failed to update booking status');
      console.error(err);
    } finally {
      setProcessingBookingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      accepted: 'bg-green-100 text-green-700 border-green-300',
      rejected: 'bg-red-100 text-red-700 border-red-300',
      cancelled: 'bg-gray-100 text-gray-700 border-gray-300'
    };
    return badges[status] || badges.pending;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'rejected':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'pending':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const filteredBookings = filterStatus === 'all' 
    ? bookings 
    : bookings.filter(b => b.status === filterStatus);

  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const acceptedCount = bookings.filter(b => b.status === 'accepted').length;

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              Booking Requests
            </h1>
            <p className="text-base sm:text-lg text-gray-600">
              Manage ride requests from passengers
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Accepted</p>
                  <p className="text-3xl font-bold text-green-600">{acceptedCount}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total</p>
                  <p className="text-3xl font-bold text-blue-600">{bookings.length}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="bg-white rounded-xl shadow-lg p-2 mb-6">
            <div className="flex flex-wrap gap-2">
              {['all', 'pending', 'accepted', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg font-semibold transition-all ${
                    filterStatus === status
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6">
              <p className="font-semibold">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Bookings List */}
          {!isLoading && filteredBookings.length > 0 && (
            <div className="space-y-6">
              {filteredBookings.map((booking) => (
                <div
                  key={booking._id}
                  className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300"
                >
                  {/* Booking Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 sm:p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          <span className="font-semibold">{booking.rideId?.start}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-7">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                          <span className="text-sm opacity-90">To</span>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                          <span className="font-semibold">{booking.rideId?.end}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{formatDate(booking.rideId?.date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{formatTime(booking.rideId?.time)}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full border-2 flex items-center gap-2 ${getStatusBadge(booking.status)}`}>
                        {getStatusIcon(booking.status)}
                        <span className="font-semibold text-sm capitalize">{booking.status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Booking Details */}
                  <div className="p-4 sm:p-6">
                    {/* Passenger Info */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Passenger Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Name</p>
                          <p className="font-semibold text-gray-900">{booking.passengerId?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Email</p>
                          <p className="font-semibold text-gray-900 text-sm">{booking.passengerId?.email || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                   {/* Booking Details Grid */}
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
  <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
    <p className="text-xs text-gray-500 mb-1">Seats</p>
    <p className="text-lg font-bold text-blue-600">{booking.seatsBooked}</p>
  </div>
  <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
    <p className="text-xs text-gray-500 mb-1">Base Fare</p>
    <p className="text-lg font-bold text-green-600">₹{booking.baseFare?.toFixed(2)}</p>
  </div>
  <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
    <p className="text-xs text-gray-500 mb-1">Your Deduction</p>
    <p className="text-sm font-bold text-red-600">
      ₹{((booking.baseFare * 0.08) + (booking.baseFare * 0.08 * 0.18)).toFixed(2)}
    </p>
  </div>
  <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
    <p className="text-xs text-gray-500 mb-1">You Receive</p>
    <p className="text-lg font-bold text-yellow-600">
      ₹{(booking.baseFare - (booking.baseFare * 0.08) - (booking.baseFare * 0.08 * 0.18)).toFixed(2)}
    </p>
  </div>
</div>

                    {/* Pickup & Drop Locations */}
                    {(booking.pickupLocation || booking.dropLocation) && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Trip Details</h4>
                        {booking.pickupLocation && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 mb-1">Pickup Location</p>
                            <p className="text-sm font-semibold text-gray-900">{booking.pickupLocation}</p>
                          </div>
                        )}
                        {booking.dropLocation && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Drop Location</p>
                            <p className="text-sm font-semibold text-gray-900">{booking.dropLocation}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Passenger Notes */}
                    {booking.passengerNotes && (
                      <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          Passenger Notes
                        </h4>
                        <p className="text-sm text-gray-700">{booking.passengerNotes}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {booking.status === 'pending' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleStatusUpdate(booking._id, 'accepted')}
                          disabled={processingBookingId === booking._id}
                          className="flex-1 bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {processingBookingId === booking._id ? (
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Accept Booking
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(booking._id, 'rejected')}
                          disabled={processingBookingId === booking._id}
                          className="flex-1 bg-gradient-to-r from-red-600 to-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-red-700 hover:to-red-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {processingBookingId === booking._id ? (
                            'Processing...'
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Reject Booking
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {booking.status === 'accepted' && (
                      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
                        <p className="text-green-700 font-semibold">✓ You have accepted this booking</p>
                      </div>
                    )}

                    {booking.status === 'rejected' && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center">
                        <p className="text-red-700 font-semibold">✗ You have rejected this booking</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredBookings.length === 0 && (
            <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-12 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">No booking requests found</h3>
              <p className="text-gray-600 text-lg">
                {filterStatus === 'all' 
                  ? "You don't have any booking requests yet"
                  : `No ${filterStatus} bookings found`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DriverBookings;