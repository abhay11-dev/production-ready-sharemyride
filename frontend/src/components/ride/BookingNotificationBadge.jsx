import React, { useState, useEffect } from 'react';
import { getDriverBookings } from '../../services/bookingService';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';

function BookingNotificationBadge() {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchPendingBookings();
      // Refresh every 30 seconds
      const interval = setInterval(fetchPendingBookings, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchPendingBookings = async () => {
    try {
      const bookings = await getDriverBookings();
      const pending = bookings.filter(b => b.status === 'pending').length;
      setPendingCount(pending);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  if (!user || pendingCount === 0) {
    return null;
  }

  return (
    <Link 
      to="/driver/bookings"
      className="relative inline-flex items-center justify-center"
    >
      <svg 
        className="w-6 h-6 text-gray-700 hover:text-blue-600 transition-colors" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
        />
      </svg>
      {pendingCount > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full animate-pulse">
          {pendingCount > 9 ? '9+' : pendingCount}
        </span>
      )}
    </Link>
  );
}

export default BookingNotificationBadge;