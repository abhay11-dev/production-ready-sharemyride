import React, { useState, useEffect, useRef } from 'react';
import { getDriverBookings } from '../services/bookingService';
import { updateBookingStatus } from '../services/bookingService';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

function NotificationDropdown() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Refresh every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const bookings = await getDriverBookings();
      // Only show pending bookings as notifications
      const pendingBookings = bookings.filter(b => b.status === 'pending');
      setNotifications(pendingBookings);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleAccept = async (bookingId, e) => {
    e.stopPropagation();
    setProcessingId(bookingId);
    try {
      await updateBookingStatus(bookingId, 'accepted');
      // Remove from notifications
      setNotifications(notifications.filter(n => n._id !== bookingId));
    } catch (error) {
      alert('Failed to accept booking');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (bookingId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to reject this booking?')) {
      return;
    }
    setProcessingId(bookingId);
    try {
      await updateBookingStatus(bookingId, 'rejected');
      // Remove from notifications
      setNotifications(notifications.filter(n => n._id !== bookingId));
    } catch (error) {
      alert('Failed to reject booking');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
        aria-label="Notifications"
      >
        <svg
          className="w-6 h-6"
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
        
        {/* Badge */}
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full animate-pulse">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {/* Dropdown - Responsive positioning and width */}
      {isOpen && (
        <div className="fixed sm:absolute right-0 left-0 sm:left-auto mt-2 sm:w-96 bg-white rounded-xl shadow-2xl border-2 border-gray-200 z-50 max-h-[600px] sm:max-h-[600px] max-h-[calc(100vh-80px)] overflow-hidden flex flex-col mx-2 sm:mx-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-3 sm:px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
              <h3 className="font-bold text-base sm:text-lg">Ride Requests</h3>
            </div>
            <span className="bg-white text-blue-600 text-xs font-bold px-2 py-1 rounded-full">
              {notifications.length}
            </span>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-gray-600 font-semibold">No new requests</p>
                <p className="text-gray-400 text-sm mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((booking) => (
                  <div
                    key={booking._id}
                    className="p-3 sm:p-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* User Info */}
                    <div className="flex items-start gap-2 sm:gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {booking.passengerId?.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                          {booking.passengerId?.name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {getTimeAgo(booking.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Ride Details */}
                    <div className="bg-blue-50 rounded-lg p-2 sm:p-3 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <p className="font-semibold text-blue-900 text-xs sm:text-sm break-words">
                          {booking.rideId?.start}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pl-6">
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        <p className="font-semibold text-blue-900 text-xs sm:text-sm break-words">
                          {booking.rideId?.end}
                        </p>
                      </div>
                    </div>

                    {/* Booking Info - Responsive grid */}
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-3">
                      <div className="bg-gray-50 rounded-lg p-1.5 sm:p-2 text-center">
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Seats</p>
                        <p className="font-bold text-gray-900 text-sm sm:text-base">{booking.seatsBooked}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-1.5 sm:p-2 text-center">
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Date</p>
                        <p className="font-bold text-gray-900 text-[10px] sm:text-xs leading-tight">
                          {formatDate(booking.rideId?.date)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-1.5 sm:p-2 text-center">
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Fare</p>
                        <p className="font-bold text-green-600 text-sm sm:text-base">₹{booking.totalFare?.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Passenger Notes */}
                    {booking.passengerNotes && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3">
                        <p className="text-xs text-yellow-800">
                          <span className="font-semibold">Note:</span> {booking.passengerNotes}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons - Stack on very small screens */}
                    <div className="flex flex-col xs:flex-row gap-2">
                      <button
                        onClick={(e) => handleAccept(booking._id, e)}
                        disabled={processingId === booking._id}
                        className="flex-1 bg-gradient-to-r from-green-600 to-green-500 text-white px-3 sm:px-4 py-2 rounded-lg font-semibold hover:from-green-700 hover:to-green-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs sm:text-sm"
                      >
                        {processingId === booking._id ? (
                          <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Accept
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => handleReject(booking._id, e)}
                        disabled={processingId === booking._id}
                        className="flex-1 bg-gradient-to-r from-red-600 to-red-500 text-white px-3 sm:px-4 py-2 rounded-lg font-semibold hover:from-red-700 hover:to-red-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs sm:text-sm"
                      >
                        {processingId === booking._id ? (
                          'Processing...'
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Reject
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-200 p-3 bg-gray-50">
              <Link
                to="/driver/bookings"
                onClick={() => setIsOpen(false)}
                className="text-center block text-blue-600 hover:text-blue-700 font-semibold text-sm"
              >
                View All Requests →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;