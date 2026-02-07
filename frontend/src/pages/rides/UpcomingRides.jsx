import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

import ReceiptService from '../../services/receiptService';
import { getMyBookings, getDriverBookings } from '../../services/bookingService';

const UpcomingRides = () => {
  const { user } = useAuth();
  const [passengerRides, setPassengerRides] = useState([]);
  const [driverRides, setDriverRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('passenger');
  const [downloadingReceipt, setDownloadingReceipt] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callDetails, setCallDetails] = useState(null);

  useEffect(() => {
    fetchAllUpcomingRides();
  }, []);

  const fetchAllUpcomingRides = async () => {
    try {
      setLoading(true);

      console.log('🚀 Starting to fetch bookings...');
      
      // Fetch rides where user is passenger
      const passengerResponse = await getMyBookings();
      
      console.log('📦 Raw passenger response:', passengerResponse);
      console.log('📦 Total passenger bookings:', passengerResponse.length);
      
      // Log each booking's details
      passengerResponse.forEach((booking, index) => {
        console.log(`\n📋 Passenger Booking ${index + 1}:`, {
          id: booking._id,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          rideDate: booking.ride?.date,
          pickup: booking.pickupLocation,
          drop: booking.dropLocation,
          hasRide: !!booking.ride,
          baseFare: booking.baseFare,
          serviceFee: booking.passengerServiceFee,
          gst: booking.passengerServiceFeeGST,
          totalFare: booking.totalFare
        });
      });
      
      const upcomingPassenger = passengerResponse.filter(booking => {
        if (!booking.ride) {
          console.log('❌ Booking filtered out: No ride', booking._id);
          return false;
        }
        
        const rideDate = new Date(booking.ride.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // ✅ FIXED: Accept both 'accepted' and 'confirmed' status
        const statusMatch = ['accepted', 'confirmed', 'completed'].includes(booking.status);
        const paymentMatch = booking.paymentStatus === 'completed';
        const dateMatch = rideDate >= today;
        
        console.log(`🔍 Booking ${booking._id} filter check:`, {
          status: booking.status,
          statusMatch,
          paymentStatus: booking.paymentStatus,
          paymentMatch,
          rideDate: rideDate.toDateString(),
          today: today.toDateString(),
          dateMatch
        });
        
        return statusMatch && paymentMatch && dateMatch;
      });
      
      console.log('✅ Filtered upcoming passenger rides:', upcomingPassenger.length);
      
      upcomingPassenger.sort((a, b) => new Date(a.ride.date) - new Date(b.ride.date));
      setPassengerRides(upcomingPassenger);

      // Fetch rides where user is driver
      const driverResponse = await getDriverBookings();
      
      console.log('📦 Total driver bookings:', driverResponse.length);
      
      // Log each driver booking
      driverResponse.forEach((booking, index) => {
        console.log(`\n🚗 Driver Booking ${index + 1}:`, {
          id: booking._id,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          rideDate: booking.ride?.date,
          hasRide: !!booking.ride,
          baseFare: booking.baseFare,
          platformFee: booking.platformFee || booking.passengerServiceFee,
          totalFare: booking.totalFare
        });
      });
      
      const upcomingDriver = driverResponse.filter(booking => {
        if (!booking.ride) {
          console.log('❌ Driver booking filtered out: No ride', booking._id);
          return false;
        }
        
        const rideDate = new Date(booking.ride.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // ✅ FIXED: Accept both 'accepted' and 'confirmed' status
        const statusMatch = ['accepted', 'confirmed', 'completed'].includes(booking.status);
        const paymentMatch = booking.paymentStatus === 'completed';
        const dateMatch = rideDate >= today;
        
        console.log(`🔍 Driver Booking ${booking._id} filter check:`, {
          status: booking.status,
          statusMatch,
          paymentStatus: booking.paymentStatus,
          paymentMatch,
          rideDate: rideDate.toDateString(),
          today: today.toDateString(),
          dateMatch
        });
        
        return statusMatch && paymentMatch && dateMatch;
      });
      
      console.log('✅ Filtered upcoming driver rides:', upcomingDriver.length);
      
      upcomingDriver.sort((a, b) => new Date(a.ride.date) - new Date(b.ride.date));
      setDriverRides(upcomingDriver);

      // Auto-select tab based on which has rides
      if (upcomingPassenger.length === 0 && upcomingDriver.length > 0) {
        setActiveTab('driver');
      }

      // Success message
      const totalRides = upcomingPassenger.length + upcomingDriver.length;
      if (totalRides > 0) {
        toast.success(
          `Found ${totalRides} upcoming ${totalRides === 1 ? 'ride' : 'rides'}!`,
          {
            duration: 2500,
            position: 'top-center',
            icon: '🚗',
          }
        );
      } else {
        console.log('ℹ️ No upcoming rides found after filtering');
      }

    } catch (error) {
      console.error('❌ Full error object:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error response data:', error.response?.data);
      toast.error('Failed to load upcoming rides. Please refresh the page.');
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

  const handleCallAction = (phoneNumber, role, name) => {
    if (!phoneNumber || phoneNumber === 'Not provided') {
      toast.error(`${role} phone number is not available`, {
        duration: 3000,
        position: 'top-center',
        
      });
      return;
    }
    
    // Open call confirmation modal
    setCallDetails({
      phoneNumber,
      role,
      name
    });
    setShowCallModal(true);
  };

  const handleConfirmCall = () => {
    if (callDetails) {
      // Initiate the phone call
      window.location.href = `tel:${callDetails.phoneNumber}`;
      
      // Show success toast
      toast.success(`Calling ${callDetails.name}...`, {
        duration: 2000,
        position: 'top-center',
        icon: '📞',
      });
      
      // Log for analytics (optional)
      console.log('Call initiated:', {
        to: callDetails.name,
        number: callDetails.phoneNumber,
        role: callDetails.role,
        timestamp: new Date().toISOString()
      });
    }
    
    // Close modal
    setShowCallModal(false);
    setCallDetails(null);
  };

  const handleCancelCall = () => {
    setShowCallModal(false);
    setCallDetails(null);
    
    toast('Call cancelled', {
      duration: 1500,
      position: 'top-center',
      icon: '❌',
    });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    const count = tab === 'passenger' ? passengerRides.length : driverRides.length;
    if (count === 0) {
      toast(`No ${tab} rides scheduled yet`, {
        duration: 2000,
        position: 'top-center',
        icon: '📅',
      });
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
    
    if (rideDate.getTime() === today.getTime()) return { label: '🔴 TODAY', color: 'red' };
    if (rideDate.getTime() === tomorrow.getTime()) return { label: '🟠 TOMORROW', color: 'orange' };
    return { label: rideDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), color: 'blue' };
  };

  // ✅ NEW: Calculate driver earnings from booking data
  const calculateDriverEarnings = (booking) => {
    const baseFare = booking.baseFare || 0;
    const platformFee = booking.platformFee || booking.passengerServiceFee || (baseFare * 0.08);
    const platformFeeGST = booking.gst || booking.passengerServiceFeeGST || (platformFee * 0.18);
    const netEarnings = baseFare - platformFee - platformFeeGST;
    
    return {
      baseFare,
      platformFee,
      platformFeeGST,
      netEarnings: Math.max(0, netEarnings)
    };
  };

  // ✅ NEW: Calculate passenger payment from booking data
  const calculatePassengerPayment = (booking) => {
    const baseFare = booking.baseFare || 0;
    const serviceFee = booking.passengerServiceFee || booking.platformFee || 0;
    const gst = booking.passengerServiceFeeGST || booking.gst || 0;
    const totalPaid = booking.totalFare || (baseFare + serviceFee + gst);
    
    return {
      baseFare,
      serviceFee,
      gst,
      totalPaid
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your rides...</p>
        </div>
      </div>
    );
  }

  const currentRides = activeTab === 'passenger' ? passengerRides : driverRides;
  const totalRides = passengerRides.length + driverRides.length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h1 className="text-3xl font-bold text-gray-900">My Upcoming Rides</h1>
        </div>
        <p className="text-gray-600">
          {totalRides === 0 
            ? 'No scheduled rides' 
            : `You have ${totalRides} upcoming ${totalRides === 1 ? 'ride' : 'rides'}`
          }
        </p>
      </div>

      {/* Tabs */}
      {(passengerRides.length > 0 || driverRides.length > 0) && (
        <div className="mb-6 flex gap-4 border-b border-gray-200">
          <button
            onClick={() => handleTabChange('passenger')}
            className={`pb-4 px-6 font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'passenger'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            As Passenger ({passengerRides.length})
          </button>
          <button
            onClick={() => handleTabChange('driver')}
            className={`pb-4 px-6 font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'driver'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            As Driver ({driverRides.length})
          </button>
        </div>
      )}

      {/* Empty State */}
      {totalRides === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <svg className="w-24 h-24 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Upcoming Rides</h3>
          <p className="text-gray-600 mb-6">You don't have any scheduled rides yet.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/ride/search"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search Rides
            </Link>
            <Link
              to="/ride/post"
              className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Post a Ride
            </Link>
          </div>
        </div>
      ) : currentRides.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <svg className="w-20 h-20 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No {activeTab === 'passenger' ? 'Passenger' : 'Driver'} Rides
          </h3>
          <p className="text-gray-600 mb-6">
            You don't have any upcoming rides as a {activeTab === 'passenger' ? 'passenger' : 'driver'}.
          </p>
          {activeTab === 'passenger' ? (
            <Link
              to="/ride/search"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search for Rides
            </Link>
          ) : (
            <Link
              to="/ride/post"
              className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Post a Ride
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {currentRides.map((booking) => {
            const dayLabel = getDayLabel(booking.ride.date);
            const isPassenger = activeTab === 'passenger';
            
            // ✅ FIXED: Get correct phone number based on role
            const phoneNumber = isPassenger 
              ? (booking.ride?.phoneNumber || booking.driver?.phone || booking.ride?.driverId?.phone)
              : (booking.passenger?.phone);
            
            const isDownloading = downloadingReceipt === booking._id;
            
            // ✅ FIXED: Calculate payment breakdown from actual booking data
            const paymentDetails = isPassenger 
              ? calculatePassengerPayment(booking)
              : calculateDriverEarnings(booking);
            
            // ✅ NEW: Check if this is a segment booking
            const isSegmentBooking = booking.matchType === 'on_route' && booking.userSearchDistance;
            
            return (
              <div 
                key={booking._id} 
                className={`bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border-l-4 ${
                  isPassenger ? 'border-blue-600' : 'border-green-600'
                }`}
              >
                {/* Header Section */}
                <div className="flex items-start justify-between mb-5">
                  <div className={`px-4 py-2 rounded-lg font-bold text-sm ${
                    dayLabel.color === 'red' ? 'bg-red-100 text-red-800' :
                    dayLabel.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                    isPassenger ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    <p className="font-bold">{dayLabel.label}</p>
                    <p className="text-xs mt-1">{booking.ride.time}</p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-2 ${
                      isPassenger ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isPassenger ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        )}
                      </svg>
                      {isPassenger ? 'Passenger' : 'Driver'}
                    </span>
                    
                    {/* ✅ NEW: Show segment booking badge */}
                    {isSegmentBooking && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                        📏 Segment Ride • {booking.userSearchDistance?.toFixed(1)} km
                      </span>
                    )}
                  </div>
                </div>

                {/* Route Section */}
                <div className={`bg-gradient-to-r rounded-xl p-5 mb-5 ${
                  isPassenger 
                    ? 'from-blue-50 to-purple-50' 
                    : 'from-green-50 to-emerald-50'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <svg className={`w-6 h-6 ${isPassenger ? 'text-blue-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="font-semibold text-gray-900 text-lg">{booking.pickupLocation}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-9 mb-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    {isSegmentBooking && (
                      <span className="text-xs text-purple-600 font-medium">
                        Your segment: {booking.userSearchDistance?.toFixed(1)} km
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className={`w-6 h-6 ${isPassenger ? 'text-purple-600' : 'text-emerald-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="font-semibold text-gray-900 text-lg">{booking.dropLocation}</p>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-gray-50 rounded-xl p-5 mb-5">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-lg">
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>{isPassenger ? 'Driver Information' : 'Passenger Information'}</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Name</p>
                      <p className="font-medium text-gray-900">
                        {isPassenger 
                          ? (booking.ride?.driverId?.name || booking.driver?.name || 'N/A')
                          : (booking.passenger?.name || 'N/A')
                        }
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Phone</p>
                      <p className="font-medium text-gray-900">
                        {phoneNumber || 'Not provided'}
                      </p>
                    </div>
                    {isPassenger ? (
                      <>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-sm text-gray-600 mb-1">Vehicle Number</p>
                          <p className="font-medium text-gray-900">
                            {booking.ride?.vehicleNumber || booking.ride?.vehicle || 'N/A'}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-sm text-gray-600 mb-1">Seats Booked</p>
                          <p className="font-medium text-gray-900">{booking.seatsBooked}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-sm text-gray-600 mb-1">Email</p>
                          <p className="font-medium text-gray-900 text-sm">
                            {booking.passenger?.email || 'N/A'}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-sm text-gray-600 mb-1">Seats Booked</p>
                          <p className="font-medium text-gray-900">{booking.seatsBooked}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* ✅ FIXED: Payment Breakdown with ACTUAL DATA */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 mb-5">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-lg">
                    <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Payment Details
                    {isSegmentBooking && isPassenger && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full ml-2">
                        Segment Rate: ₹{booking.perKmRate?.toFixed(2)}/km
                      </span>
                    )}
                  </h4>
                  <div className="space-y-2 text-sm bg-white p-4 rounded-lg">
                    {isPassenger ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Base Fare ({booking.seatsBooked} {booking.seatsBooked === 1 ? 'seat' : 'seats'}):
                          </span>
                          <span className="font-medium">₹{paymentDetails.baseFare.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Service Fee:</span>
                          <span className="font-medium">₹{paymentDetails.serviceFee.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">GST on Service (18%):</span>
                          <span className="font-medium">₹{paymentDetails.gst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-3 border-t-2 border-blue-200">
                          <span className="font-bold text-gray-900 text-base">Total Paid:</span>
                          <span className="font-bold text-blue-600 text-base">
                            ₹{paymentDetails.totalPaid.toFixed(2)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Base Fare ({booking.seatsBooked} {booking.seatsBooked === 1 ? 'seat' : 'seats'}):
                          </span>
                          <span className="font-medium">₹{paymentDetails.baseFare.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>Platform Fee ({((paymentDetails.platformFee / paymentDetails.baseFare) * 100).toFixed(0)}%):</span>
                          <span>- ₹{paymentDetails.platformFee.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>GST on Fee (18%):</span>
                          <span>- ₹{paymentDetails.platformFeeGST.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-3 border-t-2 border-green-200 font-bold text-green-600 text-base">
                          <span>Your Net Earnings:</span>
                          <span>₹{paymentDetails.netEarnings.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-4">
                    <span className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold shadow-sm">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Payment Completed
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-5 border-t border-gray-200 flex-wrap">
                  <button 
                    onClick={() => handleCallAction(
                      phoneNumber, 
                      isPassenger ? 'Driver' : 'Passenger',
                      isPassenger 
                        ? (booking.ride?.driverId?.name || booking.driver?.name || 'N/A')
                        : (booking.passenger?.name || 'N/A')
                    )}
                    className={`${
                      isPassenger ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                    } text-white px-5 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 shadow-md hover:shadow-lg
                     `}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Call {isPassenger ? 'Driver' : 'Passenger'}
                  </button>
                  
                  <button
                    onClick={() => handleDownloadReceipt(booking._id)}
                    disabled={isDownloading}
                    className="bg-purple-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-purple-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    {isDownloading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download Receipt
                      </>
                    )}
                  </button>
                  
                  <Link
                    to="/bookings/my-bookings"
                    className="bg-gray-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-gray-700 transition-all inline-flex items-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    All Bookings
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

     {/* 📞 ENHANCED CALL CONFIRMATION MODAL - Matching RideCard Style */}
      {showCallModal && callDetails && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300">
            
            {/* Gradient Header - Matching your RideCard modals */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-6 rounded-t-2xl sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Call {callDetails.role}</h3>
                    <p className="text-blue-100 text-sm mt-0.5">Confirm phone call</p>
                  </div>
                </div>
                <button
                  onClick={handleCancelCall}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              
              {/* Contact Info Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-700 mb-1">{callDetails.role.toUpperCase()}</p>
                    <p className="text-xl font-bold text-gray-900">{callDetails.name}</p>
                  </div>
                </div>
                
                {/* Phone Number Display */}
                <div className="bg-white rounded-lg p-4 border-2 border-blue-300">
                  <p className="text-xs font-semibold text-gray-600 mb-2">PHONE NUMBER</p>
                  <p className="text-2xl font-bold text-blue-600 tracking-wide flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {callDetails.phoneNumber}
                  </p>
                </div>
              </div>

              {/* Information Notice */}
              {/* <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                 
                </div>
              </div> */}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCancelCall}
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCall}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-3 rounded-xl font-bold hover:from-green-700 hover:to-green-600 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call Now
                </button>
              </div>

              {/* Quick Actions Footer */}
              {/* <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center mb-3">Need help?</p>
                <div className="flex gap-2 justify-center">
                  <button className="text-xs bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors font-medium text-gray-700">
                    Report Issue
                  </button>
                  <button className="text-xs bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors font-medium text-gray-700">
                    Emergency
                  </button>
                </div>
              </div> */}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default UpcomingRides;