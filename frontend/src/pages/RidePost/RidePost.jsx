import React, { useState, useEffect } from 'react';
import RideForm from '../../components/ride/RideForm';
import { postRide, getMyRides, deleteRide } from '../../services/rideService';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { PaymentCalculator } from '../../utils/paymentCalculator';
import PaymentBreakdownCard from '../../components/PaymentBreakdownCard';

function RidePost() {
  const { user } = useAuth();
  const [rides, setRides] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingRideId, setDeletingRideId] = useState(null);
  const [hoveredRideId, setHoveredRideId] = useState(null);
  const [expandedRideId, setExpandedRideId] = useState(null);

  useEffect(() => {
    const fetchMyRides = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const data = await getMyRides();
        console.log('✅ Fetched rides:', data); // Debug log
        setRides(data);
      } catch (err) {
        console.error('Failed to fetch rides:', err);
        toast.error('Failed to load your rides', {
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
        setIsLoading(false);
      }
    };

    fetchMyRides();
  }, [user]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' };
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

  const calculateFinalFare = (baseFare) => {
    const driverCalc = PaymentCalculator.calculateDriverEarnings(baseFare);
    const passengerCalc = PaymentCalculator.calculatePassengerTotal(baseFare);
    
    return {
      baseFare: driverCalc.baseFare,
      platformFee: driverCalc.platformFee,
      gstOnPlatformFee: driverCalc.gstOnPlatformFee,
      driverNetAmount: driverCalc.driverNetAmount,
      totalPassengerPays: passengerCalc.totalPassengerPays
    };
  };

  const getAvailableSeats = (ride) => {
    if (!ride.bookings || ride.bookings.length === 0) {
      return ride.seats;
    }
    
    const confirmedBookings = ride.bookings.filter(
      b => b.status === 'confirmed' || b.status === 'pending'
    );
    
    const bookedSeats = confirmedBookings.reduce(
      (sum, booking) => sum + (booking.seatsBooked || 1), 
      0
    );
    
    return ride.seats - bookedSeats;
  };

  const handlePostRide = async (rideData) => {
    if (!user) {
      toast.error('Please login first to post a ride', {
        duration: 3000,
        position: 'top-center',
        icon: '🔒',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('📤 Sending ride data:', rideData); // Debug log
      const response = await postRide(rideData);
      console.log('✅ Server response:', response); // Debug log
      
      const newRide = response.data || response;
      setRides([newRide, ...rides]);
      
      toast.success('Ride posted successfully!', {
        duration: 4000,
        position: 'top-center',
        style: {
          background: '#10B981',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#10B981',
        },
      });
      
      setTimeout(() => {
        const ridesSection = document.getElementById('your-rides-section');
        if (ridesSection) {
          ridesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
      
    } catch (err) {
      console.error('❌ Post ride error:', err); // Debug log
      const errorMessage = err.response?.data?.message || 'Failed to post ride. Please try again.';
      toast.error(errorMessage, {
        duration: 4000,
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
      setIsLoading(false);
    }
  };

  const handleDeleteRide = async (rideId) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-semibold text-gray-900">Cancel this ride?</span>
        </div>
        <p className="text-sm text-gray-600">This action cannot be undone.</p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              performDelete(rideId);
            }}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            Yes, Cancel Ride
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            No, Keep It
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      position: 'top-center',
      style: {
        background: '#fff',
        padding: '16px',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        maxWidth: '400px',
      },
    });
  };

 // EMERGENCY DEBUG VERSION - USE THIS IF RIDES STILL APPEAR

const performDelete = async (rideId) => {
  setDeletingRideId(rideId);
  
  try {
    console.log('========================================');
    console.log('🗑️ DELETE PROCESS STARTED');
    console.log('========================================');
    console.log('Ride ID to delete:', rideId);
    console.log('Current rides in state:', rides.length);
    console.log('All ride IDs:', rides.map(r => r._id));
    
    // Step 1: Call delete API
    console.log('\n📡 Step 1: Calling delete API...');
    const response = await deleteRide(rideId);
    console.log('✅ Delete API response:', response);
    
    // Step 2: Remove from state
    console.log('\n🔄 Step 2: Updating state...');
    setRides(prevRides => {
      console.log('Before filter - rides count:', prevRides.length);
      console.log('Before filter - ride IDs:', prevRides.map(r => r._id));
      
      const filtered = prevRides.filter(ride => {
        const shouldKeep = ride._id !== rideId;
        console.log(`Checking ride ${ride._id}: ${shouldKeep ? 'KEEP' : 'REMOVE'}`);
        return shouldKeep;
      });
      
      console.log('After filter - rides count:', filtered.length);
      console.log('After filter - ride IDs:', filtered.map(r => r._id));
      console.log('✅ State will be updated with', filtered.length, 'rides');
      
      return filtered;
    });
    
    // Step 3: Show success
    console.log('\n✅ Step 3: Showing success message');
    toast.success('Ride cancelled successfully', {
      duration: 3000,
      position: 'top-center',
      icon: '✓',
      style: {
        background: '#10B981',
        color: '#fff',
        fontWeight: '600',
        padding: '16px',
        borderRadius: '12px',
      },
    });
    
    // Step 4: Force refresh after delay
    console.log('\n⏳ Step 4: Scheduling force refresh in 500ms...');
    setTimeout(async () => {
      try {
        console.log('\n🔄 FORCE REFRESH STARTED');
        console.log('Fetching fresh data from server...');
        
        const freshData = await getMyRides();
        
        console.log('Fresh data received from server:');
        console.log('- Count:', freshData.length);
        console.log('- IDs:', freshData.map(r => r._id));
        console.log('- Deleted ride present?', freshData.some(r => r._id === rideId) ? '❌ YES (PROBLEM!)' : '✅ NO (GOOD)');
        
        setRides(freshData);
        console.log('✅ State updated with fresh data');
        console.log('========================================');
        console.log('🎉 DELETE PROCESS COMPLETED');
        console.log('========================================\n');
      } catch (refreshErr) {
        console.error('⚠️ Refresh failed:', refreshErr);
      }
    }, 500);
    
  } catch (err) {
    console.error('========================================');
    console.error('❌ DELETE PROCESS FAILED');
    console.error('========================================');
    console.error('Error:', err);
    console.error('Error response:', err.response?.data);
    console.error('Error message:', err.message);
    
    toast.error(err.response?.data?.message || 'Failed to cancel ride', {
      duration: 4000,
      position: 'top-center',
      style: {
        background: '#EF4444',
        color: '#fff',
        fontWeight: '600',
        padding: '16px',
        borderRadius: '12px',
      },
    });
    
    // Try to refresh anyway
    try {
      const freshData = await getMyRides();
      setRides(freshData);
      console.log('Refreshed state after error');
    } catch (refreshErr) {
      console.error('Failed to refresh after error:', refreshErr);
    }
  } finally {
    setDeletingRideId(null);
    console.log('Delete button re-enabled\n');
  }
};

// ALSO ADD THIS useEffect to monitor state changes
useEffect(() => {
  console.log('📊 STATE CHANGED - Rides count:', rides.length);
  if (rides.length === 0) {
    console.log('✅ No rides in state');
  } else {
    console.log('📋 Current ride IDs in state:', rides.map(r => r._id));
  }
}, [rides]);

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-2 sm:mb-3">Post a Ride</h2>
            <p className="text-base sm:text-lg text-gray-600">Share your journey and help fellow travelers</p>
          </div>

          <div className="mb-8 sm:mb-10 flex justify-center">
            <RideForm onSubmit={handlePostRide} isLoading={isLoading} />
          </div>

          {rides.length > 0 && (
            <div id="your-rides-section" className="relative my-8 sm:my-12">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-300"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 px-4 sm:px-6 text-base sm:text-lg font-bold text-gray-700">
                  Your Posted Rides ({rides.length})
                </span>
              </div>
            </div>
          )}

          {isLoading && rides.length === 0 ? (
            <div className="flex justify-center items-center py-12 sm:py-20">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {rides.map((ride, index) => {
                const fareDetails = calculateFinalFare(parseFloat(ride.fare) || 0);
                const isExpanded = expandedRideId === ride._id;
                const availableSeats = getAvailableSeats(ride);
                const bookedSeats = ride.seats - availableSeats;

                return (
                  <div key={ride._id || index} className="relative bg-white rounded-xl sm:rounded-2xl shadow-xl border-2 border-gray-200 overflow-visible hover:shadow-2xl transition-all duration-300">
                    
                    <button
                      onClick={() => handleDeleteRide(ride._id)}
                      disabled={deletingRideId === ride._id}
                      className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 bg-red-500 hover:bg-red-600 text-white p-2 sm:p-2.5 rounded-lg shadow-lg transition-all duration-200 hover:scale-110 disabled:opacity-50"
                      title="Cancel Ride"
                    >
                      {deletingRideId === ride._id ? (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>

                    <div className="p-4 sm:p-6">
                      {/* Route Header */}
                      <div className="flex flex-col items-center gap-2 mb-4 pr-8 sm:pr-12">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          <p className="text-lg sm:text-xl font-bold text-green-600">{ride.start}</p>
                          <span className="text-xl text-gray-400">→</span>
                          <p className="text-lg sm:text-xl font-bold text-blue-600">{ride.end}</p>
                        </div>
                        
                        {ride.waypoints && ride.waypoints.length > 0 && (
                          <div className="flex flex-wrap gap-1 items-center justify-center text-xs">
                            <span className="text-gray-500">Via:</span>
                            {ride.waypoints.map((wp, idx) => (
                              <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-gray-700">
                                {wp.location}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Key Info Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                        <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
                          <svg className="w-5 h-5 text-purple-600 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-xs text-gray-500 mb-1">Date</p>
                          <p className="text-sm font-bold">{formatDate(ride.date)}</p>
                        </div>

                        <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200">
                          <svg className="w-5 h-5 text-orange-600 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-xs text-gray-500 mb-1">Time</p>
                          <p className="text-sm font-bold">{formatTime(ride.time)}</p>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                          <svg className="w-5 h-5 text-blue-600 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <p className="text-xs text-gray-500 mb-1">Total Seats</p>
                          <p className="text-lg font-bold">{ride.seats}</p>
                        </div>

                        <div className={`${bookedSeats > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'} rounded-lg p-3 text-center border`}>
                          <svg className={`w-5 h-5 ${bookedSeats > 0 ? 'text-yellow-600' : 'text-green-600'} mx-auto mb-1`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-xs text-gray-500 mb-1">Booked</p>
                          <p className="text-lg font-bold">{bookedSeats}/{ride.seats}</p>
                        </div>

                        <div 
                          className="bg-green-50 rounded-lg p-3 text-center border border-green-200 relative"
                          onMouseEnter={() => setHoveredRideId(ride._id)}
                          onMouseLeave={() => setHoveredRideId(null)}
                        >
                          <div className="flex justify-center mb-1 gap-1">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">Total Earning</p>
                          <p className="text-xl font-bold text-green-600">₹{fareDetails.driverNetAmount.toFixed(2)}</p>
                          
                          {hoveredRideId === ride._id && (
                            <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 pointer-events-none">
                              <div className="w-72 bg-gray-900 text-white text-xs rounded-xl shadow-2xl border border-gray-700 p-4">
                                <div className="space-y-3">
                                  <div className="font-semibold text-sm border-b border-gray-700 pb-2 text-center text-green-400">
                                    Your Earnings Breakdown 💰
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-300">Base Fare:</span>
                                    <span className="text-green-400">₹{fareDetails.baseFare.toFixed(2)}</span>
                                  </div>
                                  <div className="border-t border-gray-700 pt-2">
                                    <p className="text-xs text-red-400 mb-1">Deductions:</p>
                                    <div className="pl-2 space-y-1">
                                      <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Platform Fee (8%):</span>
                                        <span className="text-red-400">-₹{fareDetails.platformFee.toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">GST on Platform Fee (18%):</span>
                                        <span className="text-red-400">-₹{fareDetails.gstOnPlatformFee.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="border-t border-gray-700 pt-2 font-bold flex justify-between">
                                    <span>You Receive/Seat:</span>
                                    <span className="text-green-400">₹{fareDetails.driverNetAmount.toFixed(2)}</span>
                                  </div>
                                  <div className="border-t border-gray-700 pt-2 bg-green-900/30 -mx-4 px-4 py-2 -mb-4 rounded-b-xl">
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs">Total ({ride.seats} seats):</span>
                                      <span className="text-green-400 font-bold text-base">₹{(fareDetails.driverNetAmount * ride.seats).toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                                  <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {ride.bookings && ride.bookings.length > 0 && (
                        <div className="mb-3 bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span className="text-sm font-semibold text-blue-900">Booking Requests: {ride.bookings.length}</span>
                          </div>
                          <div className="flex gap-2 text-xs">
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                              Pending: {ride.bookings.filter(b => b.status === 'pending').length}
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                              Confirmed: {ride.bookings.filter(b => b.status === 'confirmed').length}
                            </span>
                            {ride.bookings.filter(b => b.status === 'cancelled').length > 0 && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                                Cancelled: {ride.bookings.filter(b => b.status === 'cancelled').length}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Driver Info Preview (Compact) - Show if any driver info exists */}
                      {ride.driverInfo && Object.keys(ride.driverInfo).some(key => 
                        ride.driverInfo[key] && ride.driverInfo[key] !== '' && ride.driverInfo[key] !== false
                      ) && (
                        <div className="mb-3 bg-indigo-50 border-l-4 border-indigo-500 p-3 rounded">
                          <div className="flex items-start gap-3">
                            {/* Driver Photo or Icon */}
                            {ride.driverInfo.photoURL && ride.driverInfo.photoURL.trim() ? (
                              <img 
                                src={ride.driverInfo.photoURL} 
                                alt={ride.driverInfo.name || 'Driver'} 
                                className="w-10 h-10 rounded-full object-cover border-2 border-indigo-200 flex-shrink-0"
                                onError={(e) => {
                                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(ride.driverInfo.name || 'D')}&background=4F46E5&color=fff`;
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            )}
                            
                            {/* Driver Info Summary */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-indigo-900">
                                  {ride.driverInfo.name || 'Driver'}
                                </span>
                                {ride.driverInfo.verified && (
                                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs">
                                {ride.driverInfo.gender && ride.driverInfo.gender.trim() && (
                                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded capitalize">
                                    {ride.driverInfo.gender}
                                  </span>
                                )}
                                {ride.driverInfo.age && ride.driverInfo.age > 0 && (
                                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">
                                    {ride.driverInfo.age} yrs
                                  </span>
                                )}
                                {ride.driverInfo.drivingLicenseNumber && ride.driverInfo.drivingLicenseNumber.trim() && (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Licensed
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => setExpandedRideId(isExpanded ? null : ride._id)}
                        className="w-full mb-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-2.5 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-600 transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{isExpanded ? 'Hide' : 'View'} Complete Details</span>
                        <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="space-y-4 pt-3 border-t-2 border-gray-100">
                          {/* Professional Earnings Breakdown */}
                          <PaymentBreakdownCard
                            baseFare={parseFloat(ride.fare) || 0}
                            seatsBooked={ride.seats}
                            showDriverView={true}
                            showPassengerView={false}
                            className="mb-4"
                          />
                          {/* Complete Vehicle Details */}
                          {ride.vehicle && (
                            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                              <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                </svg>
                                Vehicle Details
                              </h4>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-gray-600">Number</p>
                                  <p className="font-bold uppercase">{ride.vehicleNumber || ride.vehicle.number}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Type</p>
                                  <p className="font-bold">{ride.vehicle.type || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Model</p>
                                  <p className="font-bold">{ride.vehicle.model || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Color</p>
                                  <p className="font-bold">{ride.vehicle.color || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">AC</p>
                                  <p className="font-bold">{ride.vehicle.acAvailable ? '✓ Available' : '✗ Not Available'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Luggage Space</p>
                                  <p className="font-bold">{ride.vehicle.luggageSpace || 'Medium'}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ✅ Driver Details - USING driverInfo - Show ALL entered fields */}
                          {ride.driverInfo && Object.keys(ride.driverInfo).some(key => 
                            ride.driverInfo[key] && ride.driverInfo[key] !== '' && ride.driverInfo[key] !== false
                          ) && (
                            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                              <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Driver Details
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                {/* Driver Name */}
                                {ride.driverInfo.name && ride.driverInfo.name.trim() && (
                                  <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <div className="flex-1">
                                      <p className="text-gray-600 text-xs mb-0.5">Driver Name</p>
                                      <p className="font-bold text-gray-900">{ride.driverInfo.name}</p>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Driver Gender */}
                                {ride.driverInfo.gender && ride.driverInfo.gender.trim() && (
                                  <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    <div className="flex-1">
                                      <p className="text-gray-600 text-xs mb-0.5">Gender</p>
                                      <p className="font-bold text-gray-900 capitalize">{ride.driverInfo.gender}</p>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Driver Phone */}
                                {ride.driverInfo.phone && ride.driverInfo.phone.trim() && (
                                  <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <div className="flex-1">
                                      <p className="text-gray-600 text-xs mb-0.5">Phone</p>
                                      <p className="font-bold text-gray-900">{ride.driverInfo.phone}</p>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Driver Age */}
                                {ride.driverInfo.age && ride.driverInfo.age > 0 && (
                                  <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <div className="flex-1">
                                      <p className="text-gray-600 text-xs mb-0.5">Age</p>
                                      <p className="font-bold text-gray-900">{ride.driverInfo.age} years</p>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Driving License */}
                                {ride.driverInfo.drivingLicenseNumber && ride.driverInfo.drivingLicenseNumber.trim() && (
                                  <div className="flex items-start gap-2 sm:col-span-2">
                                    <svg className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                    </svg>
                                    <div className="flex-1">
                                      <p className="text-gray-600 text-xs mb-0.5">Driving License Number</p>
                                      <p className="font-bold text-gray-900 uppercase tracking-wide">{ride.driverInfo.drivingLicenseNumber}</p>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Emergency Contact Name */}
                                {ride.driverInfo.emergencyContactName && ride.driverInfo.emergencyContactName.trim() && (
                                  <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <div className="flex-1">
                                      <p className="text-gray-600 text-xs mb-0.5">Emergency Contact</p>
                                      <p className="font-bold text-gray-900">{ride.driverInfo.emergencyContactName}</p>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Emergency Contact Phone */}
                                {ride.driverInfo.emergencyContact && ride.driverInfo.emergencyContact.trim() && (
                                  <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <div className="flex-1">
                                      <p className="text-gray-600 text-xs mb-0.5">Emergency Phone</p>
                                      <p className="font-bold text-gray-900">{ride.driverInfo.emergencyContact}</p>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Verified Badge */}
                                {ride.driverInfo.verified && (
                                  <div className="sm:col-span-2">
                                    <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-full">
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-sm font-semibold">Verified Driver</span>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Photo URL - Show avatar if available */}
                                {ride.driverInfo.photoURL && ride.driverInfo.photoURL.trim() && (
                                  <div className="sm:col-span-2 flex items-center gap-3">
                                    <img 
                                      src={ride.driverInfo.photoURL} 
                                      alt={ride.driverInfo.name || 'Driver'} 
                                      className="w-16 h-16 rounded-full object-cover border-2 border-indigo-200"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                    <div>
                                      <p className="text-gray-600 text-xs">Driver Photo</p>
                                      <p className="text-gray-500 text-xs">Profile verified</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Contact & Pickup Details */}
                          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                            <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              Contact & Pickup Details
                            </h4>
                            <div className="space-y-3 text-sm">
                              <div>
                                <p className="text-gray-600">Phone Number</p>
                                <p className="font-bold">{ride.phoneNumber}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Pickup Address</p>
                                <p className="font-bold">{ride.address}</p>
                              </div>
                              {ride.pickupInstructions && (
                                <div>
                                  <p className="text-gray-600">Pickup Instructions</p>
                                  <p className="font-semibold text-gray-800">{ride.pickupInstructions}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Pricing & Route Information */}
                          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                            <h4 className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Pricing & Route Information
                            </h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-gray-600">Pricing Mode</p>
                                <p className="font-bold capitalize">
                                  {ride.fareMode === 'per_km' ? 'Per Kilometer' : 'Fixed Fare'}
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-gray-600">Base Fare (per seat)</p>
                                <p className="font-bold text-green-600">₹{parseFloat(ride.fare || 0).toFixed(2)}</p>
                              </div>

                              {ride.fareMode === 'per_km' && ride.perKmRate && ride.perKmRate > 0 && (
                                <div>
                                  <p className="text-gray-600">Rate per KM</p>
                                  <p className="font-bold text-blue-600">₹{parseFloat(ride.perKmRate).toFixed(2)}/km</p>
                                </div>
                              )}

                              {ride.totalDistance && ride.totalDistance > 0 && (
                                <div>
                                  <p className="text-gray-600">Total Distance</p>
                                  <p className="font-bold">{ride.totalDistance} km</p>
                                </div>
                              )}

                              {ride.estimatedDuration && ride.estimatedDuration > 0 && (
                                <div>
                                  <p className="text-gray-600">Est. Duration</p>
                                  <p className="font-bold">~{ride.estimatedDuration} minutes</p>
                                </div>
                              )}

                              <div>
                                <p className="text-gray-600">Toll Charges</p>
                                <p className={`font-bold ${ride.tollIncluded ? 'text-green-600' : 'text-orange-600'}`}>
                                  {ride.tollIncluded ? '✓ Included' : '✗ Not Included'}
                                </p>
                              </div>

                              <div>
                                <p className="text-gray-600">Fare Negotiation</p>
                                <p className={`font-bold ${ride.negotiableFare ? 'text-green-600' : 'text-gray-600'}`}>
                                  {ride.negotiableFare ? '✓ Negotiable' : '✗ Fixed'}
                                </p>
                              </div>

                              {ride.maxDetourAllowed && ride.maxDetourAllowed > 0 && (
                                <div>
                                  <p className="text-gray-600">Max Detour Allowed</p>
                                  <p className="font-bold text-blue-600">{ride.maxDetourAllowed} km</p>
                                </div>
                              )}

                              {ride.allowPartialRoute && (
                                <div className="col-span-2">
                                  <p className="text-gray-600">Partial Route</p>
                                  <p className="font-bold text-purple-600">✓ Passengers can book segments</p>
                                </div>
                              )}

                              {ride.recurringRide && (
                                <div className="col-span-2">
                                  <p className="text-gray-600">Recurring Ride</p>
                                  <p className="font-bold text-orange-600">✓ Repeats weekly</p>
                                </div>
                              )}

                              {ride.liveLocationSharing && (
                                <div className="col-span-2">
                                  <p className="text-gray-600">Live Location Sharing</p>
                                  <p className="font-bold text-red-600">✓ Enabled</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Ride Preferences */}
                          {ride.preferences && (
                            <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
                              <h4 className="font-bold text-pink-900 mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                                Ride Preferences
                              </h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {ride.preferences.smokingAllowed !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <span className={ride.preferences.smokingAllowed ? "text-green-600" : "text-red-600"}>
                                      {ride.preferences.smokingAllowed ? "✓" : "✗"}
                                    </span>
                                    <span>Smoking</span>
                                  </div>
                                )}
                                {ride.preferences.musicAllowed !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <span className={ride.preferences.musicAllowed ? "text-green-600" : "text-red-600"}>
                                      {ride.preferences.musicAllowed ? "✓" : "✗"}
                                    </span>
                                    <span>Music</span>
                                  </div>
                                )}
                                {ride.preferences.petFriendly !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <span className={ride.preferences.petFriendly ? "text-green-600" : "text-red-600"}>
                                      {ride.preferences.petFriendly ? "✓" : "✗"}
                                    </span>
                                    <span>Pet Friendly</span>
                                  </div>
                                )}
                                {ride.preferences.talkative !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <span className={ride.preferences.talkative ? "text-green-600" : "text-red-600"}>
                                      {ride.preferences.talkative ? "✓" : "✗"}
                                    </span>
                                    <span>Chatty</span>
                                  </div>
                                )}
                                {ride.preferences.pickupFlexibility !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <span className={ride.preferences.pickupFlexibility ? "text-green-600" : "text-red-600"}>
                                      {ride.preferences.pickupFlexibility ? "✓" : "✗"}
                                    </span>
                                    <span>Flexible Pickup</span>
                                  </div>
                                )}
                                {ride.preferences.luggageAllowed !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <span className={ride.preferences.luggageAllowed ? "text-green-600" : "text-red-600"}>
                                      {ride.preferences.luggageAllowed ? "✓" : "✗"}
                                    </span>
                                    <span>Luggage</span>
                                  </div>
                                )}
                                {ride.preferences.womenOnly && (
                                  <div className="col-span-2 flex items-center gap-2 text-pink-700 font-semibold">
                                    <span>👩</span>
                                    <span>Women Only</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Additional Notes */}
                          {ride.notes && (
                            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                              <h4 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Additional Notes
                              </h4>
                              <p className="text-sm text-gray-700">{ride.notes}</p>
                            </div>
                          )}

                          {/* Recurring Days */}
                          {ride.recurringRide && ride.recurringDays && ride.recurringDays.length > 0 && (
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                              <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Recurring Days
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {ride.recurringDays.map(day => (
                                  <span key={day} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold capitalize">
                                    {day}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="flex justify-center mt-3">
                        <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${
                          availableSeats === 0 
                            ? 'bg-red-100 text-red-700 border-red-300' 
                            : 'bg-green-100 text-green-700 border-green-300'
                        }`}>
                          {availableSeats === 0 ? '🔴 Fully Booked' : '✓ Active & Available'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {rides.length === 0 && !isLoading && (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border-2 border-gray-200 p-8 sm:p-12 text-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3">No rides posted yet</h3>
              <p className="text-gray-600 text-sm sm:text-lg mb-4 sm:mb-6">
                Fill out the form above to post your first ride and start sharing your journey!
              </p>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold text-sm sm:text-base hover:gap-3 transition-all duration-200 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span>Get started above</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default RidePost;