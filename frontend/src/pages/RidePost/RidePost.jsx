import React, { useState, useEffect } from 'react';
import RideForm from '../../components/ride/RideForm';
import { postRide, getMyRides, deleteRide } from '../../services/rideService';
import { useAuth } from '../../hooks/useAuth';

function RidePost() {
  const { user } = useAuth();
  const [rides, setRides] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingRideId, setDeletingRideId] = useState(null);
  const [hoveredRideId, setHoveredRideId] = useState(null);
  const [expandedRideId, setExpandedRideId] = useState(null);

  useEffect(() => {
    const fetchMyRides = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const data = await getMyRides();
        setRides(data);
      } catch (err) {
        console.error('Failed to fetch rides:', err);
        setError('Failed to load your rides');
        setTimeout(() => setError(null), 3000);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyRides();
  }, [user]);

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

  const calculateFinalFare = (baseFare) => {
    const platformFee = baseFare * 0.10; // 10% platform fee
    const subtotal = baseFare + platformFee;
    const gst = subtotal * 0.18; // 18% GST
    const total = subtotal + gst;
    return { baseFare, platformFee, gst, subtotal, total };
  };

  const handlePostRide = async (rideData) => {
    if (!user) {
      setError('Please login first.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const newRide = await postRide(rideData);
      setRides([newRide, ...rides]);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to post ride. Please try again.';
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRide = async (rideId) => {
    if (!window.confirm('Are you sure you want to cancel this ride? This action cannot be undone.')) {
      return;
    }

    setDeletingRideId(rideId);
    
    try {
      await deleteRide(rideId);
      setRides(rides.filter(ride => ride._id !== rideId));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      setError('Failed to cancel ride. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setDeletingRideId(null);
    }
  };

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-2 sm:mb-3">Post a Ride</h2>
            <p className="text-base sm:text-lg text-gray-600">Share your journey and help fellow travelers</p>
          </div>

          {showSuccess && (
            <div className="mb-6 sm:mb-8 bg-green-50 border-2 border-green-200 text-green-700 px-4 sm:px-6 py-3 sm:py-4 rounded-xl flex items-center justify-center gap-2 sm:gap-3 shadow-md animate-fade-in">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold text-sm sm:text-base">Success! 🎉</span>
            </div>
          )}

          {error && (
            <div className="mb-6 sm:mb-8 bg-red-50 border-2 border-red-200 text-red-700 px-4 sm:px-6 py-3 sm:py-4 rounded-xl flex items-center justify-center gap-2 sm:gap-3 shadow-md animate-fade-in">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold text-sm sm:text-base">{error}</span>
            </div>
          )}

          <div className="mb-8 sm:mb-10 flex justify-center">
            <RideForm onSubmit={handlePostRide} isLoading={isLoading} />
          </div>

          {rides.length > 0 && (
            <div className="relative my-8 sm:my-12">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-300"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 px-4 sm:px-6 text-base sm:text-lg font-bold text-gray-700">
                  Your Rides
                </span>
              </div>
            </div>
          )}

          {isLoading && rides.length === 0 ? (
            <div className="flex justify-center items-center py-12 sm:py-20">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {rides.map((ride, index) => {
                const fareDetails = calculateFinalFare(parseFloat(ride.fare));
                const isExpanded = expandedRideId === ride._id;

                return (
                  <div key={ride._id || index} className="relative bg-white rounded-xl sm:rounded-2xl shadow-xl border-2 border-gray-200 overflow-visible hover:shadow-2xl transition-all duration-300">
                    
                    <button
                      onClick={() => handleDeleteRide(ride._id)}
                      disabled={deletingRideId === ride._id}
                      className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 bg-red-500 hover:bg-red-600 text-white p-2 sm:p-2.5 rounded-lg shadow-lg transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-4 pr-8 sm:pr-12">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
                          <p className="text-base sm:text-xl font-bold text-green-600 text-center">{ride.start}</p>
                          <span className="text-sm sm:text-xl text-gray-400">→</span>
                          <p className="text-base sm:text-xl font-bold text-blue-600 text-center">{ride.end}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                        
                        <div className="bg-blue-50 rounded-lg p-2.5 sm:p-3 text-center border border-blue-200">
                          <div className="flex justify-center mb-1">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <p className="text-xs text-gray-500 font-medium mb-1">Seats Available</p>
                          <p className="text-base sm:text-lg font-bold text-gray-900">{ride.seats}</p>
                        </div>

                        <div className="bg-purple-50 rounded-lg p-2.5 sm:p-3 text-center border border-purple-200">
                          <div className="flex justify-center mb-1">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <p className="text-xs text-gray-500 font-medium mb-1">Date</p>
                          <p className="text-xs sm:text-sm font-bold text-gray-900">{formatDate(ride.date)}</p>
                        </div>

                        <div className="bg-orange-50 rounded-lg p-2.5 sm:p-3 text-center border border-orange-200">
                          <div className="flex justify-center mb-1">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="text-xs text-gray-500 font-medium mb-1">Time</p>
                          <p className="text-xs sm:text-sm font-bold text-gray-900">{formatTime(ride.time)}</p>
                        </div>

                        <div 
                          className="bg-green-50 rounded-lg p-2.5 sm:p-3 text-center border border-green-200 col-span-2 sm:col-span-1 relative"
                          onMouseEnter={() => setHoveredRideId(ride._id)}
                          onMouseLeave={() => setHoveredRideId(null)}
                        >
                          <div className="flex justify-center mb-1 gap-1">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <p className="text-xs text-gray-500 font-medium mb-1">Total Fare (Per seat)</p>
                          <p className="text-lg sm:text-xl font-bold text-green-600">₹{fareDetails.total.toFixed(2)}</p>
                          
                          {hoveredRideId === ride._id && (
                            <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 pointer-events-none">
                              <div className="w-64 sm:w-72 bg-gray-900 text-white text-xs sm:text-sm rounded-xl shadow-2xl border border-gray-700 p-4">
                                <div className="space-y-3">
                                  {/* Header */}
                                  <div className="font-semibold text-sm sm:text-base border-b border-gray-700 pb-2 text-center text-green-400">
                                    Fare Breakdown 💰
                                  </div>

                                  {/* Breakdown Details */}
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-300">Base Fare (Driver):</span>
                                      <span className="font-medium">₹{fareDetails.baseFare.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-300">Platform Fee (10%):</span>
                                      <span className="font-medium">₹{fareDetails.platformFee.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-300">GST (18%):</span>
                                      <span className="font-medium">₹{fareDetails.gst.toFixed(2)}</span>
                                    </div>
                                  </div>

                                  {/* Total Section */}
                                  <div className="border-t border-gray-700 pt-3 mt-2">
                                    <div className="flex justify-between items-center font-bold text-sm sm:text-base">
                                      <span>Total Fare:</span>
                                      <span className="text-green-400">₹{fareDetails.total.toFixed(2)}</span>
                                    </div>
                                  </div>

                                  {/* Info Section */}
                                  <div className="text-xs text-gray-400 mt-3 border-t border-gray-700 pt-2 leading-relaxed space-y-1">
                                    <p>✓ Driver receives: ₹{fareDetails.baseFare.toFixed(2)}</p>
                                    <p>✓ Platform fee covers service costs</p>
                                    <p>✓ GST (18%) applied on total charges</p>
                                  </div>
                                </div>

                                {/* Tooltip Arrow */}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                                  <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => setExpandedRideId(isExpanded ? null : ride._id)}
                        className="w-full mb-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-2.5 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-600 transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{isExpanded ? 'Hide' : 'View'} Contact & Vehicle Details</span>
                        <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isExpanded && (
                        <div className="space-y-3 mb-3 pt-3 border-t-2 border-gray-100">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                            <p className="text-base font-bold text-gray-900">{ride.phoneNumber || 'Not provided'}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Pickup Address</p>
                            <p className="text-sm font-semibold text-gray-900">{ride.address || 'Not provided'}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Vehicle Number</p>
                            <p className="text-base font-bold text-gray-900 uppercase">{ride.vehicleNumber || 'Not provided'}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-center">
                        <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-semibold border border-green-300">
                          ✓ Active
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
              <div className="inline-flex items-center gap-2 text-green-600 font-semibold text-sm sm:text-base">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span>Get started above</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default RidePost;