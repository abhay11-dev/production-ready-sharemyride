import React, { useState, useEffect } from 'react';
import { getDriverBookings, updateBookingStatus } from '../services/bookingService';
import { useAuth } from '../hooks/useAuth';

function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getDriverBookings();
      console.log('📬 Bookings response:', response);
      
      let bookingsArray = [];
      
      if (Array.isArray(response)) {
        bookingsArray = response;
      } else if (response.data && Array.isArray(response.data)) {
        bookingsArray = response.data;
      } else if (response.bookings && Array.isArray(response.bookings)) {
        bookingsArray = response.bookings;
      } else {
        console.warn('⚠️ Unexpected response format:', response);
        bookingsArray = [];
      }
      
      console.log('📋 Bookings array:', bookingsArray);
      console.log('🔔 Pending notifications:', bookingsArray.filter(b => b.status === 'pending').length);
      
      setNotifications(bookingsArray);
    } catch (err) {
      setError('Failed to load notifications');
      console.error('❌ Fetch notifications error:', err);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (bookingId) => {
    setProcessingId(bookingId);
    try {
      await updateBookingStatus(bookingId, 'accepted');
      
      setNotifications(notifications.map(n => 
        n._id === bookingId ? { ...n, status: 'accepted', confirmedAt: new Date() } : n
      ));
      
      alert('✅ Booking accepted successfully!');
      
    } catch (error) {
      console.error('Error accepting booking:', error);
      alert('Failed to accept booking: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (bookingId) => {
    const reason = prompt('Please provide a reason for rejection (optional):');
    if (reason === null) return;
    
    setProcessingId(bookingId);
    try {
      await updateBookingStatus(bookingId, 'rejected', reason);
      
      setNotifications(notifications.map(n => 
        n._id === bookingId ? { ...n, status: 'rejected', rejectedAt: new Date(), rejectionReason: reason } : n
      ));
      
      alert('❌ Booking rejected');
      
    } catch (error) {
      console.error('Error rejecting booking:', error);
      alert('Failed to reject booking: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcessingId(null);
    }
  };

  // ✅ FIXED PAYMENT CALCULATION - Matches RideCard Logic Exactly
 // ✅ ENHANCED PAYMENT CALCULATION - Fixed to Handle Backend Data Issues
const calculatePaymentDetails = (notification) => {
  const ride = notification.ride || notification.rideId || {};
  const seatsBooked = notification.seatsBooked || 1;
  const fareMode = ride.fareMode || notification.fareMode || 'fixed';
  const perKmRate = ride.perKmRate || notification.perKmRate || 0;
  const matchType = ride.matchType || notification.matchType;
  const segmentFare = ride.segmentFare || notification.segmentFare;
  const userSearchDistance = ride.userSearchDistance || notification.userSearchDistance;
  const totalDistance = ride.totalDistance || notification.totalDistance || 0;
  
  // 🔍 DEBUG: Log all available data
  console.log('🔍 Payment Calculation Debug:', {
    matchType,
    userSearchDistance,
    perKmRate,
    segmentFare,
    fareMode,
    'notification.baseFare': notification.baseFare,
    'ride.fare': ride.fare,
    totalDistance,
    seatsBooked
  });
  
  let baseFare = 0;
  let platformFee = 0;
  let gst = 0;
  let totalPassengerPays = 0;
  let driverReceives = 0;
  let fareType = 'Fixed';

  // 🎯 PRIORITY 1: SEGMENT FARE (Route-Matched Ride)
  // Check for segment booking indicators
  if (matchType === 'on_route' || userSearchDistance) {
    // We have a segment booking - need to calculate from per km rate
    if (perKmRate && userSearchDistance) {
      fareType = 'Segment';
      
      // ✅ CORRECT: Calculate base fare from per km rate × user's segment distance
     baseFare = perKmRate * userSearchDistance * seatsBooked;
      platformFee = baseFare * 0.08;
      gst = platformFee * 0.18;
      
      // Total passenger pays = base + platform fee + GST
      totalPassengerPays = baseFare + platformFee + gst;
      
      // Driver receives the full base fare for their segment service
      driverReceives = baseFare;
      
      console.log('✅ Segment Pricing Calculated:', {
        perKmRate,
        userSearchDistance,
        seatsBooked,
        baseFare,
        platformFee,
        gst,
        totalPassengerPays,
        driverReceives
      });
      
      return {
        fareType,
        baseFare,
        platformFee,
        gst,
        totalPassengerPays,
        driverReceives,
        perKmRate,
        distance: userSearchDistance,
        seatsBooked,
        isSegment: true
      };
    } else {
      // Segment booking but missing data - try to extract from segmentFare
      console.warn('⚠️ Segment booking detected but missing perKmRate or userSearchDistance');
      
      if (segmentFare) {
        // Reverse calculate from segmentFare (which includes all fees)
        // segmentFare = base + (base * 0.08) + (base * 0.08 * 0.18)
        // segmentFare = base * (1 + 0.08 + 0.0144) = base * 1.0944
        baseFare = segmentFare / 1.0944 * seatsBooked;
        platformFee = baseFare * 0.08;
        gst = platformFee * 0.18;
        totalPassengerPays = segmentFare * seatsBooked;
        driverReceives = baseFare;
        
        return {
          fareType: 'Segment',
          baseFare,
          platformFee,
          gst,
          totalPassengerPays,
          driverReceives,
          perKmRate: perKmRate || 0,
          distance: userSearchDistance || 0,
          seatsBooked,
          isSegment: true
        };
      }
    }
  }
  
  // 📏 PRIORITY 2: PER KM PRICING (Full Route)
  if (fareMode === 'per_km' && perKmRate > 0 && totalDistance > 0) {
    fareType = 'Per KM';
    
    baseFare = perKmRate * totalDistance * seatsBooked;
    platformFee = baseFare * 0.08;
    gst = platformFee * 0.18;
    totalPassengerPays = baseFare + platformFee + gst;
    driverReceives = baseFare;
    
    return {
      fareType,
      baseFare,
      platformFee,
      gst,
      totalPassengerPays,
      driverReceives,
      perKmRate,
      distance: totalDistance,
      seatsBooked,
      isSegment: false
    };
  }
  
  // 💵 PRIORITY 3: FIXED FARE (Fallback)
  // Only use this if we're sure it's NOT a segment booking
  if (!matchType || matchType !== 'on_route') {
    const fixedFarePerSeat = notification.baseFare 
      ? notification.baseFare / (notification.seatsBooked || 1) 
      : (ride.fare || 0);
      
    baseFare = fixedFarePerSeat * seatsBooked;
    platformFee = baseFare * 0.08;
    gst = platformFee * 0.18;
    totalPassengerPays = baseFare + platformFee + gst;
    driverReceives = baseFare;
    
    return {
      fareType: 'Fixed',
      baseFare,
      platformFee,
      gst,
      totalPassengerPays,
      driverReceives,
      perKmRate: 0,
      distance: totalDistance,
      seatsBooked,
      isSegment: false
    };
  }
  
  // 🚨 FALLBACK: If we get here, something is wrong - return safe defaults
  console.error('❌ Could not determine payment calculation method', {
    notification,
    ride
  });
  
  return {
    fareType: 'Unknown',
    baseFare: 0,
    platformFee: 0,
    gst: 0,
    totalPassengerPays: 0,
    driverReceives: 0,
    perKmRate: 0,
    distance: 0,
    seatsBooked,
    isSegment: false
  };
};

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getTimeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    
    return 'Just now';
  };

  const getStatusBadge = (notification) => {
    const isCompleted = notification.paymentStatus === 'completed' || notification.status === 'completed';
    
    if (isCompleted) return 'bg-blue-100 text-blue-700 border-blue-300';
    
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      accepted: 'bg-green-100 text-green-700 border-green-300',
      rejected: 'bg-red-100 text-red-700 border-red-300',
      cancelled: 'bg-gray-100 text-gray-700 border-gray-300'
    };
    return badges[notification.status] || badges.pending;
  };

  const getDisplayStatus = (notification) => {
    if (notification.paymentStatus === 'completed' || notification.status === 'completed') {
      return 'completed';
    }
    return notification.status;
  };

  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  const filteredNotifications = filter === 'all' 
    ? safeNotifications 
    : filter === 'completed'
    ? safeNotifications.filter(n => n.paymentStatus === 'completed' || n.status === 'completed')
    : safeNotifications.filter(n => n.status === filter && n.paymentStatus !== 'completed');

  const pendingCount = safeNotifications.filter(n => n.status === 'pending').length;
  const acceptedCount = safeNotifications.filter(n => n.status === 'accepted' && n.paymentStatus !== 'completed').length;
  const rejectedCount = safeNotifications.filter(n => n.status === 'rejected').length;
  const completedCount = safeNotifications.filter(n => n.paymentStatus === 'completed' || n.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
            Ride Request Notifications 
          </h1>
          <p className="text-gray-600 text-base md:text-lg">
            Manage booking requests for your posted rides
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow border-2 border-gray-200">
            <div className="flex flex-col items-center text-center">
              <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-3 rounded-full mb-3">
                <svg className="w-6 h-6 md:w-8 md:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <p className="text-xs md:text-sm text-gray-600 mb-1 font-medium">Total Requests</p>
              <p className="text-2xl md:text-3xl font-bold text-blue-600">{safeNotifications.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow border-2 border-yellow-200">
            <div className="flex flex-col items-center text-center">
              <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 p-3 rounded-full mb-3">
                <svg className="w-6 h-6 md:w-8 md:h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs md:text-sm text-gray-600 mb-1 font-medium">Pending</p>
              <p className="text-2xl md:text-3xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow border-2 border-green-200">
            <div className="flex flex-col items-center text-center">
              <div className="bg-gradient-to-br from-green-100 to-green-200 p-3 rounded-full mb-3">
                <svg className="w-6 h-6 md:w-8 md:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs md:text-sm text-gray-600 mb-1 font-medium">Accepted</p>
              <p className="text-2xl md:text-3xl font-bold text-green-600">{acceptedCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow border-2 border-blue-300">
            <div className="flex flex-col items-center text-center">
              <div className="bg-gradient-to-br from-blue-100 to-purple-200 p-3 rounded-full mb-3">
                <svg className="w-6 h-6 md:w-8 md:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs md:text-sm text-gray-600 mb-1 font-medium">Completed</p>
              <p className="text-2xl md:text-3xl font-bold text-blue-600">{completedCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow border-2 border-red-200">
            <div className="flex flex-col items-center text-center">
              <div className="bg-gradient-to-br from-red-100 to-red-200 p-3 rounded-full mb-3">
                <svg className="w-6 h-6 md:w-8 md:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs md:text-sm text-gray-600 mb-1 font-medium">Rejected</p>
              <p className="text-2xl md:text-3xl font-bold text-red-600">{rejectedCount}</p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-lg p-2 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {[
              { value: 'pending', label: 'Pending', color: 'yellow' },
              { value: 'accepted', label: 'Accepted', color: 'green' },
              { value: 'completed', label: 'Completed', color: 'blue' },
              { value: 'rejected', label: 'Rejected', color: 'red' },
              { value: 'all', label: 'All', color: 'gray' }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-3 py-2.5 md:px-4 md:py-3 rounded-lg font-semibold transition-all text-sm md:text-base ${
                  filter === tab.value
                    ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                }`}
              >
                {tab.label}
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
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-semibold">Loading notifications...</p>
            </div>
          </div>
        )}

        {/* Notifications List */}
        {!isLoading && filteredNotifications.length > 0 && (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => {
              const displayStatus = getDisplayStatus(notification);
              const isCompleted = displayStatus === 'completed';
              
              const passenger = notification.passenger || notification.passengerId || {};
              const driver = notification.driver || notification.driverId || {};
              const ride = notification.ride || notification.rideId || {};
              
              // ✅ CALCULATE PAYMENT DETAILS WITH FIXED LOGIC
              const payment = calculatePaymentDetails(notification);

              return (
                <div
                  key={notification._id}
                  className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300"
                >
                  <div className="p-4 md:p-6">
                    {/* Header with Status */}
                    <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-3">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl md:text-2xl shadow-lg flex-shrink-0">
                          {passenger.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <h3 className="text-lg md:text-xl font-bold text-gray-900">
                            {passenger.name || 'Unknown User'}
                          </h3>
                          <p className="text-xs md:text-sm text-gray-500">
                            {passenger.email || 'No email'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Requested {getTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className={`px-3 md:px-4 py-2 rounded-full border-2 flex items-center gap-2 ${getStatusBadge(notification)} shadow-md`}>
                        <span className="font-bold text-xs md:text-sm capitalize">
                          {isCompleted ? '💰 Completed' : displayStatus}
                        </span>
                      </div>
                    </div>

                    {/* Completed Payment Badge */}
                    {isCompleted && (
                      <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 border-2 border-blue-300 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-3">
                          <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
<p className="text-blue-800 font-bold text-base">Payment Completed Successfully! 🎉</p>
                            <p className="text-blue-600 text-sm mt-1">
                              You Received: ₹{payment.driverReceives.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Segment Booking Badge */}
                    {payment.isSegment && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 mb-4 border-2 border-green-300">
                        <div className="flex items-center justify-center gap-2 text-sm font-bold text-green-800">
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Segment Booking - Passenger traveled {payment.distance} km of your route</span>
                        </div>
                      </div>
                    )}

                    {/* Ride Route */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-4 border-2 border-blue-200">
                      <div className="flex items-center gap-3 mb-2">
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="font-bold text-gray-900 text-base md:text-lg">
                          {ride.start || 'Not specified'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 pl-8 my-1">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <p className="text-xs md:text-sm text-gray-500">Journey to</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="font-bold text-gray-900 text-base md:text-lg">
                          {ride.end || 'Not specified'}
                        </p>
                      </div>
                      {ride.date && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                           <div className="flex items-center gap-2">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm text-gray-600">
                            {formatDate(ride.date)} {ride.time && `at ${formatTime(ride.time)}`}
                          </p>
                        </div>
                      </div>
                      )}
                    </div>

                    {/* ✅ ENHANCED BOOKING DETAILS - PAYMENT BREAKDOWN */}
                    <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-5 mb-4 border-2 border-green-200">
                      <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                       
                        💰 Payment Breakdown ({payment.fareType})
                      </h4>

                      {/* Fare Type Badge */}
                      <div className="mb-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
                          payment.isSegment 
                            ? 'bg-green-100 text-green-700 border-2 border-green-300'
                            : payment.fareType === 'Per KM'
                            ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                            : 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                        }`}>
                          {payment.isSegment ? ' Segment Pricing' : payment.fareType === 'Per KM' ? '📏 Per KM Pricing' : '💵 Fixed Fare'}
                        </span>
                      </div>

                      {/* Pricing Details */}
                      {payment.isSegment && (
                        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 mb-3 border-2 border-indigo-200">
                          <div className="text-xs font-semibold text-indigo-800 mb-3 uppercase tracking-wide">
                            Segment Details
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-700">Your Per KM Rate:</span>
                              <span className="font-bold text-indigo-700">₹{payment.perKmRate}/km</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-700">Passenger's Distance:</span>
                              <span className="font-bold text-indigo-700">{payment.distance} km</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-700">Seats Booked:</span>
                              <span className="font-bold text-indigo-700">{payment.seatsBooked}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-indigo-200">
                              <span className="text-gray-700">Calculation:</span>
                              <span className="font-bold text-indigo-900">
                                ₹{payment.perKmRate} × {payment.distance} km × {payment.seatsBooked} seat{payment.seatsBooked > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {payment.fareType === 'Per KM' && !payment.isSegment && (
                        <div className="bg-blue-50 rounded-lg p-3 mb-3 border border-blue-200">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-700">Your Rate:</span>
                              <span className="font-bold text-blue-700">₹{payment.perKmRate}/km</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-700">Distance:</span>
                              <span className="font-bold text-blue-700">{payment.distance} km</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-700">Seats:</span>
                              <span className="font-bold text-blue-700">{payment.seatsBooked}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Financial Breakdown */}
                      <div className="bg-white rounded-lg p-4 border-2 border-gray-200 space-y-3">
                        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                          Financial Summary
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Base Fare:</span>
                            <span className="font-semibold text-gray-900">₹{payment.baseFare.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center text-red-600">
                            <span>Platform Fee (8%):</span>
                            <span className="font-semibold">-₹{payment.platformFee.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center text-red-600">
                            <span>GST (18% on fee):</span>
                            <span className="font-semibold">-₹{payment.gst.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t-2 border-gray-300">
                            <span className="text-gray-600">Driver Receives:</span>
<span className="font-bold text-blue-600">
  ₹{(payment.baseFare - payment.platformFee - payment.gst).toFixed(2)}
</span>
                          </div>
                        </div>
                      </div>

                      {/* Driver Receives */}
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg p-4 shadow-lg mt-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-xs opacity-90 mb-1">💰 You Receive</div>
                            <div className="text-2xl font-bold"> ₹{(payment.baseFare - payment.platformFee - payment.gst).toFixed(2)}</div>
                            <div className="text-xs opacity-80 mt-1">
                              {payment.isSegment 
                                ? `(Fare for ${payment.distance} km segment)` 
                                : '(Fare for your service)'}
                            </div>
                          </div>
                          <svg className="w-12 h-12 opacity-20" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>

                      {/* Info Box */}
                      <div className="bg-blue-50 rounded-lg p-3 mt-3 border border-blue-200">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <div className="text-xs text-blue-800">
                            <strong>Note:</strong> Platform fee & GST are deducted from total payment. You receive the full base fare for your service.
                            {payment.isSegment && (
                              <span className="block mt-1">
                                <strong>Segment Booking:</strong> Payment calculated for passenger's {payment.distance} km journey only.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pickup/Drop Locations */}
                    {(notification.pickupLocation || notification.dropLocation) && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                        {notification.pickupLocation && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 mb-1">📍 Pickup Location</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {typeof notification.pickupLocation === 'object' 
                                ? notification.pickupLocation.address 
                                : notification.pickupLocation}
                            </p>
                          </div>
                        )}
                        {notification.dropLocation && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1"> 🎯 Drop Location</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {typeof notification.dropLocation === 'object' 
                                ? notification.dropLocation.address 
                                : notification.dropLocation}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Passenger Notes */}
                    {notification.passengerNotes && (
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          <div>
                            <p className="font-semibold text-yellow-800 text-sm mb-1">💬 Passenger Notes:</p>
                            <p className="text-sm text-yellow-700">{notification.passengerNotes}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {notification.status === 'pending' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleAccept(notification._id)}
                          disabled={processingId === notification._id}
                          className="flex-1 bg-gradient-to-r from-green-600 to-green-500 text-white px-4 md:px-6 py-3 rounded-xl font-bold hover:from-green-700 hover:to-green-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          {processingId === notification._id ? (
                            <>
                              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span className="hidden sm:inline">Processing...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Accept (₹{payment.driverReceives.toFixed(2)})</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleReject(notification._id)}
                          disabled={processingId === notification._id}
                          className="flex-1 bg-gradient-to-r from-red-600 to-red-500 text-white px-4 md:px-6 py-3 rounded-xl font-bold hover:from-red-700 hover:to-red-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          {processingId === notification._id ? (
                            <span className="hidden sm:inline">Processing...</span>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span>Reject</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {notification.status === 'accepted' && !isCompleted && (
                      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
                        <p className="text-green-700 font-bold flex items-center justify-center gap-2">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                           Booking Accepted - Awaiting Payment
                        </p>
                        <p className="text-green-600 text-sm mt-2">
                          You'll receive your earning once passenger completes payment
                        </p>
                        {notification.confirmedAt && (
                          <p className="text-green-600 text-xs mt-1">
                            Confirmed {getTimeAgo(notification.confirmedAt)}
                          </p>
                        )}
                      </div>
                    )}

                    {notification.status === 'rejected' && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-center">
                        <p className="text-red-700 font-bold flex items-center justify-center gap-2">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          ❌ You Rejected This Request
                        </p>
                        {notification.rejectionReason && (
                          <p className="text-red-600 text-sm mt-2">
                            Reason: {notification.rejectionReason}
                          </p>
                        )}
                        {notification.rejectedAt && (
                          <p className="text-red-500 text-xs mt-1">
                            Rejected {getTimeAgo(notification.rejectedAt)}
                          </p>
                        )}
                      </div>
                    )}

                    {notification.status === 'cancelled' && (
                      <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-center">
                        <p className="text-gray-700 font-bold flex items-center justify-center gap-2">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          ⊘ Booking Cancelled
                        </p>
                        {notification.cancellationReason && (
                          <p className="text-gray-600 text-sm mt-2">
                            Reason: {notification.cancellationReason}
                          </p>
                        )}
                        {notification.cancelledAt && (
                          <p className="text-gray-500 text-xs mt-1">
                            Cancelled {getTimeAgo(notification.cancelledAt)} by {notification.cancelledBy || 'user'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredNotifications.length === 0 && (
          <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-8 md:p-12 text-center">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 md:w-12 md:h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-3">
              No {filter !== 'all' ? filter : ''} notifications
            </h3>
            <p className="text-gray-600 text-sm md:text-lg">
              {filter === 'pending' 
                ? "You don't have any pending ride requests at the moment"
                : filter === 'completed'
                ? "No completed bookings yet. Accepted bookings will appear here once payment is received."
                : filter === 'accepted'
                ? "No accepted bookings awaiting payment"
                : `No ${filter} notifications to display`}
            </p>
            {filter === 'pending' && (
              <div className="mt-6 inline-flex items-center gap-2 text-blue-600 font-semibold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>New requests will appear here</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;