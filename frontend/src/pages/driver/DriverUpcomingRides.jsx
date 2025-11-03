import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../config/api';

const DriverUpcomingRides = () => {
  const [upcomingRides, setUpcomingRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingRides();
  }, []);

  const fetchUpcomingRides = async () => {
    try {
      const response = await api.get('/bookings/driver-bookings');
      
      // Filter for upcoming rides
      const upcoming = response.data.filter(booking => {
        const rideDate = new Date(booking.rideId?.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return (
          (booking.status === 'accepted' || booking.status === 'completed') &&
          booking.paymentStatus === 'completed' &&
          rideDate >= today
        );
      });
      
      // Sort by date
      upcoming.sort((a, b) => new Date(a.rideId.date) - new Date(b.rideId.date));
      
      setUpcomingRides(upcoming);
    } catch (error) {
      console.error('Error fetching upcoming rides:', error);
    } finally {
      setLoading(false);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🚗 My Upcoming Rides</h1>
        <p className="text-gray-600">Your scheduled rides as a driver</p>
      </div>

      {upcomingRides.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="w-24 h-24 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Upcoming Rides</h3>
          <p className="text-gray-600 mb-6">You don't have any scheduled rides yet.</p>
          <Link
            to="/ride/post"
            className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Post a Ride
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {upcomingRides.map((booking) => {
            const dayLabel = getDayLabel(booking.rideId.date);
            
            return (
              <div key={booking._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  {/* Date Badge */}
                  <div className={`px-4 py-2 rounded-lg ${
                    dayLabel.color === 'red' ? 'bg-red-100 text-red-800' :
                    dayLabel.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    <p className="font-bold">{dayLabel.label}</p>
                    <p className="text-sm">{booking.rideId.time}</p>
                  </div>
                  
                  {/* Earnings */}
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Your Earning</p>
                    <p className="text-xl font-bold text-green-600">
                      ₹{(booking.baseFare - (booking.baseFare * 0.08) - (booking.baseFare * 0.08 * 0.18)).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">After 8% fee + GST</p>
                  </div>
                </div>

                {/* Route */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="font-semibold text-gray-900">{booking.pickupLocation}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-7 mb-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="font-semibold text-gray-900">{booking.dropLocation}</p>
                  </div>
                </div>

                {/* Passenger Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Passenger Information</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Name</p>
                      <p className="font-medium text-gray-900">{booking.passengerId?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Email</p>
                      <p className="font-medium text-gray-900">{booking.passengerId?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Phone</p>
                      <p className="font-medium text-gray-900">{booking.passengerId?.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Seats Booked</p>
                      <p className="font-medium text-gray-900">{booking.seatsBooked}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600">Total Fare</p>
                    <p className="text-2xl font-bold text-gray-900">₹{booking.totalFare.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-3">
                    {booking.passengerId?.phone && (
                      <a 
                        href={`tel:${booking.passengerId.phone}`}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Call Passenger(Coming soon)
                      </a>
                    )}
                    <Link
                      to="/notifications"
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DriverUpcomingRides;