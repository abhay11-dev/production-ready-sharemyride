import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDriverBookings } from '../../services/bookingService';
import Icon from '../../components/ui/Icon.jsx';

const DriverUpcomingRides = () => {
  const [upcomingRides, setUpcomingRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingRides();
  }, []);

  const fetchUpcomingRides = async () => {
    try {
      const bookings = await getDriverBookings();
      const normalizedBookings = bookings.map((booking) => ({
        ...booking,
        rideId: booking.rideId || booking.ride,
        passengerId: booking.passengerId || booking.passenger,
      }));

      // Filter for upcoming rides
      const upcoming = normalizedBookings.filter(booking => {
        const rideDate = new Date(booking.rideId?.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return (
          ['accepted', 'completed'].includes(booking.status) &&
          !Number.isNaN(rideDate.getTime()) &&
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

    if (rideDate.getTime() === today.getTime()) return { label: 'Today', tone: 'red' };
    if (rideDate.getTime() === tomorrow.getTime()) return { label: 'Tomorrow', tone: 'amber' };
    return {
      label: rideDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
      tone: 'blue',
    };
  };

  const badgeClasses = {
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  // ── Skeleton card, matching Home.jsx's SkeletonCard pattern ──────────────
  const SkeletonCard = () => (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="h-8 bg-gray-200 rounded-lg w-28" />
        <div className="h-8 bg-gray-200 rounded-lg w-20" />
      </div>
      <div className="h-16 bg-gray-100 rounded-xl mb-4" />
      <div className="h-20 bg-gray-100 rounded-xl mb-4" />
      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
        <div className="h-4 bg-gray-200 rounded w-20" />
        <div className="h-8 bg-gray-200 rounded-lg w-24" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header (matches home page hero band) ── */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 pt-5 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Icon name="Calendar" size="md" className="text-white" />
            </div>
            <div>
              <p className="text-blue-200 text-xs font-medium">Driver dashboard</p>
              <h1 className="text-lg sm:text-2xl font-bold text-white leading-tight">My upcoming rides</h1>
              <p className="text-blue-200 text-xs mt-0.5">Your scheduled rides as a driver</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : upcomingRides.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Icon name="Calendar" size="lg" className="text-blue-400" />
            </div>
            <p className="font-semibold text-gray-800 mb-1">No upcoming rides</p>
            <p className="text-sm text-gray-500 mb-4">You don't have any scheduled rides yet.</p>
            <Link
              to="/ride/post"
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <Icon name="Plus" size="sm" />
              Post a ride
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingRides.map((booking) => {
              const dayLabel = getDayLabel(booking.rideId.date);
              const earning = (
                booking.baseFare -
                booking.baseFare * 0.08 -
                booking.baseFare * 0.08 * 0.18
              ).toFixed(2);

              return (
                <div
                  key={booking._id}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50/60 transition-all duration-200"
                >
                  <div className="p-4 sm:p-5">
                    {/* Date badge + earnings */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`inline-flex flex-col px-3 py-1.5 rounded-xl ${badgeClasses[dayLabel.tone]}`}>
                        <span className="text-xs font-semibold">{dayLabel.label}</span>
                        <span className="text-xs opacity-80">{booking.rideId.time}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Your earning</p>
                        <p className="text-lg font-bold text-green-600">₹{earning}</p>
                        <p className="text-xs text-gray-400">After 8% fee + GST</p>
                      </div>
                    </div>

                    {/* Route */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                        <span className="font-semibold text-gray-900 text-sm truncate">{booking.pickupLocation}</span>
                      </div>
                      <div className="ml-[3px] border-l-2 border-dashed border-gray-200 h-3 my-0.5" />
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                        <span className="font-semibold text-gray-900 text-sm truncate">{booking.dropLocation}</span>
                      </div>
                    </div>

                    {/* Passenger info */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-1.5">
                        <Icon name="User" size="sm" className="text-gray-500" />
                        Passenger information
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Name</p>
                          <p className="text-sm font-medium text-gray-900 truncate">{booking.passengerId?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Email</p>
                          <p className="text-sm font-medium text-gray-900 truncate">{booking.passengerId?.email || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                          <p className="text-sm font-medium text-gray-900">{booking.passengerId?.phone || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Seats booked</p>
                          <p className="text-sm font-medium text-gray-900">{booking.seatsBooked}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                      <div>
                        <p className="text-xs text-gray-400">Total fare</p>
                        <p className="text-xl font-bold text-gray-900">₹{booking.totalFare.toFixed(2)}</p>
                      </div>
                      <div className="flex gap-2">
                        {booking.passengerId?.phone && (
                          <a
                            href={`tel:${booking.passengerId.phone}`}
                            className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                          >
                            <Icon name="Phone" size="sm" />
                            Call passenger
                          </a>
                        )}
                        <Link
                          to="/driver/bookings"
                          className="inline-flex items-center gap-1.5 border border-blue-200 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                        >
                          View details
                          <Icon name="ChevronRight" size="sm" />
                        </Link>
                      </div>
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

export default DriverUpcomingRides;