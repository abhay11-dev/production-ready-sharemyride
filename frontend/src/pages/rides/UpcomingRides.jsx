import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyBookings } from '../../services/bookingService';
import { useAuth } from '../../hooks/useAuth';
import api from '../../config/api';

const UpcomingRides = () => {
  const { user } = useAuth();
  const [passengerRides, setPassengerRides] = useState([]);
  const [driverRides, setDriverRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('passenger');
  const [downloadingReceipt, setDownloadingReceipt] = useState(null);

  useEffect(() => {
    fetchAllUpcomingRides();
  }, []);

  const fetchAllUpcomingRides = async () => {
    try {
      setLoading(true);

      // Fetch rides where user is passenger
      const passengerBookings = await getMyBookings();
      const upcomingPassenger = passengerBookings.filter(booking => {
        const rideDate = new Date(booking.rideId?.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return (
          (booking.status === 'accepted' || booking.status === 'completed') &&
          booking.paymentStatus === 'completed' &&
          rideDate >= today
        );
      });
      upcomingPassenger.sort((a, b) => new Date(a.rideId.date) - new Date(b.rideId.date));
      setPassengerRides(upcomingPassenger);

      // Fetch rides where user is driver
      const driverResponse = await api.get('/bookings/driver-bookings');
      const upcomingDriver = driverResponse.data.filter(booking => {
        const rideDate = new Date(booking.rideId?.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return (
          (booking.status === 'accepted' || booking.status === 'completed') &&
          booking.paymentStatus === 'completed' &&
          rideDate >= today
        );
      });
      upcomingDriver.sort((a, b) => new Date(a.rideId.date) - new Date(b.rideId.date));
      setDriverRides(upcomingDriver);

      // Auto-select tab based on which has rides
      if (upcomingPassenger.length === 0 && upcomingDriver.length > 0) {
        setActiveTab('driver');
      }

    } catch (error) {
      console.error('Error fetching upcoming rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async (bookingId) => {
    try {
      setDownloadingReceipt(bookingId);
      
      const response = await api.get(`/receipts/download/${bookingId}`, {
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `RideShare_Receipt_${bookingId}.pdf`);
      
      document.body.appendChild(link);
      link.click();
      
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert('✅ Receipt downloaded successfully!');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      alert('❌ Failed to download receipt. Please try again.');
    } finally {
      setDownloadingReceipt(null);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentRides = activeTab === 'passenger' ? passengerRides : driverRides;
  const totalRides = passengerRides.length + driverRides.length;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🗓️ My Upcoming Rides</h1>
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
            onClick={() => setActiveTab('passenger')}
            className={`pb-4 px-6 font-semibold transition-all ${
              activeTab === 'passenger'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🎒 As Passenger ({passengerRides.length})
          </button>
          <button
            onClick={() => setActiveTab('driver')}
            className={`pb-4 px-6 font-semibold transition-all ${
              activeTab === 'driver'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🚗 As Driver ({driverRides.length})
          </button>
        </div>
      )}

      {/* Empty State */}
      {totalRides === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="w-24 h-24 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Upcoming Rides</h3>
          <p className="text-gray-600 mb-6">You don't have any scheduled rides yet.</p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/ride/search"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Search Rides
            </Link>
            <Link
              to="/ride/post"
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Post a Ride
            </Link>
          </div>
        </div>
      ) : currentRides.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No {activeTab === 'passenger' ? 'Passenger' : 'Driver'} Rides
          </h3>
          <p className="text-gray-600 mb-6">
            You don't have any upcoming rides as a {activeTab === 'passenger' ? 'passenger' : 'driver'}.
          </p>
          {activeTab === 'passenger' ? (
            <Link
              to="/ride/search"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Search for Rides
            </Link>
          ) : (
            <Link
              to="/ride/post"
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Post a Ride
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {currentRides.map((booking) => {
            const dayLabel = getDayLabel(booking.rideId.date);
            const isPassenger = activeTab === 'passenger';
            
            return (
              <div key={booking._id} className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 ${
                isPassenger ? 'border-blue-600' : 'border-green-600'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  {/* Date Badge */}
                  <div className={`px-4 py-2 rounded-lg ${
                    dayLabel.color === 'red' ? 'bg-red-100 text-red-800' :
                    dayLabel.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                    isPassenger ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    <p className="font-bold">{dayLabel.label}</p>
                    <p className="text-sm">{booking.rideId.time}</p>
                  </div>
                  
                  {/* Role Badge & Payment/Earnings */}
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold mb-2 inline-block ${
                      isPassenger ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {isPassenger ? '🎒 Passenger' : '🚗 Driver'}
                    </span>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        {isPassenger ? 'Amount Paid' : 'Your Earnings'}
                      </p>
                      <p className="text-xl font-bold text-green-600">
                        ₹{isPassenger 
                          ? booking.totalFare.toFixed(2) 
                          : (booking.totalFare * 0.85 * 0.82).toFixed(2)
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Route */}
                <div className={`bg-gradient-to-r rounded-lg p-4 mb-4 ${
                  isPassenger 
                    ? 'from-blue-50 to-purple-50' 
                    : 'from-green-50 to-emerald-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className={`w-5 h-5 ${isPassenger ? 'text-blue-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <p className="font-semibold text-gray-900">{booking.pickupLocation}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-7 mb-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className={`w-5 h-5 ${isPassenger ? 'text-purple-600' : 'text-emerald-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <p className="font-semibold text-gray-900">{booking.dropLocation}</p>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span>👤</span>
                    <span>{isPassenger ? 'Driver Information' : 'Passenger Information'}</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Name</p>
                      <p className="font-medium text-gray-900">
                        {isPassenger 
                          ? (booking.rideId.driverId?.name || 'N/A')
                          : (booking.passengerId?.name || 'N/A')
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Phone</p>
                      <p className="font-medium text-gray-900">
                        {isPassenger 
                          ? booking.rideId.phoneNumber
                          : (booking.passengerId?.phone || 'Not provided')
                        }
                      </p>
                    </div>
                    {isPassenger ? (
                      <>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Vehicle Number</p>
                          <p className="font-medium text-gray-900">{booking.rideId.vehicleNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Seats Booked</p>
                          <p className="font-medium text-gray-900">{booking.seatsBooked}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Email</p>
                          <p className="font-medium text-gray-900">{booking.passengerId?.email || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Seats Booked</p>
                          <p className="font-medium text-gray-900">{booking.seatsBooked}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-900 mb-3">💰 Payment Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base Fare:</span>
                      <span className="font-medium">₹{booking.baseFare.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Platform Fee:</span>
                      <span className="font-medium">₹{booking.platformFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">GST:</span>
                      <span className="font-medium">₹{booking.gst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-blue-200">
                      <span className="font-semibold text-gray-900">Total Fare:</span>
                      <span className="font-bold text-blue-600">₹{booking.totalFare.toFixed(2)}</span>
                    </div>
                    {!isPassenger && (
                      <>
                        <div className="flex justify-between text-red-600">
                          <span>Platform Commission (10%):</span>
                          <span>- ₹{(booking.totalFare * 0.10).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>GST on Commission (18%):</span>
                          <span>- ₹{(booking.totalFare * 0.10 * 0.18).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-green-200 font-bold text-green-600">
                          <span>Your Net Earnings:</span>
                          <span>₹{(booking.totalFare * 0.90 * 0.82).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                      ✓ Payment Completed
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200 flex-wrap">
                  <a 
                    href={`tel:${isPassenger ? booking.rideId.phoneNumber : (booking.passengerId?.phone || '')}`}
                    className={`${
                      isPassenger ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                    } text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Call {isPassenger ? 'Driver' : 'Passenger'}(Coming Soon)
                  </a>
                  
                  <button
                    onClick={() => handleDownloadReceipt(booking._id)}
                    disabled={downloadingReceipt === booking._id}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloadingReceipt === booking._id ? (
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
                        Download PDF
                      </>
                    )}
                  </button>
                  
                  <Link
                    to="/bookings/my-bookings"
                    className="bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-colors inline-block text-center"
                  >
                    All Bookings
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UpcomingRides;