import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.error('❌ VITE_API_URL is not set in environment variables');
}

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Create axios instance with auth headers
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ========================================
// BOOKING OPERATIONS
// ========================================

/**
 * Create a new booking
 * @param {Object} bookingData - Booking details
 * @returns {Promise} Booking response
 */
export const createBooking = async (bookingData) => {
  try {
    console.log('📝 Creating booking:', bookingData);
    const response = await apiClient.post('/bookings', bookingData);
    console.log('✅ Booking created:', response.data);
    return response.data.data || response.data;
  } catch (error) {
    console.error('❌ Create booking error:', error.response?.data || error);
    throw error;
  }
};

/**
 * Get user's bookings (as passenger)
 * @param {Object} params - Query parameters (status, limit, page)
 * @returns {Promise} Bookings array
 */
export const getMyBookings = async (params = {}) => {
  try {
    console.log('📞 Fetching my bookings...');
    const response = await apiClient.get('/bookings/my', { params });
    console.log('✅ My bookings response:', response.data);
    
    // ✅ Always return an array
    if (Array.isArray(response.data)) {
      return response.data;
    }
    
    // Backend returns: { success, data: [...], bookings: [...] }
    const bookings = response.data.bookings || response.data.data || [];
    console.log('✅ Extracted bookings array:', bookings.length, 'items');
    return bookings;
    
  } catch (error) {
    console.error('❌ Error fetching my bookings:', error);
    throw error;
  }
};

/**
 * Get driver's bookings
 * @param {Object} params - Query parameters (status, limit, page)
 * @returns {Promise} Bookings array
 */
export const getDriverBookings = async (params = {}) => {
  try {
    console.log('📞 Fetching driver bookings...');
    const response = await apiClient.get('/bookings/driver', { params });
    console.log('✅ Driver bookings response:', response.data);
    
    // ✅ Always return an array
    if (Array.isArray(response.data)) {
      return response.data;
    }
    
    const bookings = response.data.bookings || response.data.data || [];
    console.log('✅ Extracted driver bookings array:', bookings.length, 'items');
    return bookings;
  } catch (error) {
    console.error('❌ Get driver bookings error:', error.response?.data || error);
    throw error;
  }
};

/**
 * Get single booking by ID
 * @param {string} bookingId - Booking ID
 * @returns {Promise} Booking details
 */
export const getBookingById = async (bookingId) => {
  try {
    const response = await apiClient.get(`/bookings/${bookingId}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error('❌ Get booking error:', error.response?.data || error);
    throw error;
  }
};

/**
 * Update booking status (Driver action)
 * @param {string} bookingId - Booking ID
 * @param {string} status - New status (accepted, rejected, completed, etc.)
 * @param {string} reason - Optional reason
 * @param {string} message - Optional message
 * @returns {Promise} Updated booking
 */
export const updateBookingStatus = async (bookingId, status, reason = '', message = '') => {
  try {
    console.log(`🔄 Updating booking ${bookingId} status to:`, status);
    const response = await apiClient.patch(`/bookings/${bookingId}/status`, {
      status,
      reason,
      message
    });
    console.log('✅ Booking status updated:', response.data);
    return response.data.data || response.data;
  } catch (error) {
    console.error('❌ Update booking status error:', error.response?.data || error);
    throw error;
  }
};

/**
 * Cancel booking (Passenger action)
 * @param {string} bookingId - Booking ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise} Cancellation response
 */
export const cancelBooking = async (bookingId, reason = '') => {
  try {
    console.log(`❌ Cancelling booking ${bookingId}`);
    const response = await apiClient.post(`/bookings/${bookingId}/cancel`, { reason });
    console.log('✅ Booking cancelled:', response.data);
    return response.data.data || response.data;
  } catch (error) {
    console.error('❌ Cancel booking error:', error.response?.data || error);
    throw error;
  }
};

/**
 * Complete payment for booking
 * @param {string} bookingId - Booking ID
 * @param {Object} paymentDetails - Payment transaction details
 * @returns {Promise} Payment response
 */
export const completePayment = async (bookingId, paymentDetails) => {
  try {
    console.log(`💳 Completing payment for booking ${bookingId}`);
    const response = await apiClient.post(`/bookings/${bookingId}/payment`, paymentDetails);
    console.log('✅ Payment completed:', response.data);
    return response.data.data || response.data;
  } catch (error) {
    console.error('❌ Complete payment error:', error.response?.data || error);
    throw error;
  }
};

/**
 * Add rating for completed booking
 * @param {string} bookingId - Booking ID
 * @param {number} rating - Rating (1-5)
 * @param {string} review - Optional review text
 * @param {Object} categories - Category ratings (punctuality, driving, etc.)
 * @returns {Promise} Rating response
 */
export const addRating = async (bookingId, rating, review = '', categories = {}) => {
  try {
    console.log(`⭐ Adding rating for booking ${bookingId}`);
    const response = await apiClient.post(`/bookings/${bookingId}/rating`, {
      rating,
      review,
      categories
    });
    console.log('✅ Rating added:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Add rating error:', error.response?.data || error);
    throw error;
  }
};

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Calculate refund amount based on cancellation time
 * @param {Date} rideDate - Ride date
 * @param {number} totalFare - Total booking fare
 * @returns {number} Refund amount
 */
export const calculateRefund = (rideDate, totalFare) => {
  const now = new Date();
  const ride = new Date(rideDate);
  const hoursUntilRide = (ride - now) / (1000 * 60 * 60);

  if (hoursUntilRide > 24) {
    return totalFare; // 100% refund
  }

  return totalFare * 0.97; // 97% refund; 3% retained as the late-cancellation fee
};

/**
 * Format booking status for display
 * @param {string} status - Booking status
 * @returns {Object} Status display info
 */
export const formatBookingStatus = (status) => {
  const statusMap = {
    pending: {
      label: 'Pending',
      color: 'yellow',
      icon: '⏳',
      description: 'Waiting for driver approval'
    },
    accepted: {
      label: 'Accepted',
      color: 'green',
      icon: '✅',
      description: 'Driver has accepted your booking'
    },
    rejected: {
      label: 'Rejected',
      color: 'red',
      icon: '❌',
      description: 'Driver declined this booking'
    },
    cancelled: {
      label: 'Cancelled',
      color: 'gray',
      icon: '🚫',
      description: 'Booking was cancelled'
    },
    completed: {
      label: 'Completed',
      color: 'blue',
      icon: '🎉',
      description: 'Trip completed successfully'
    },
    no_show: {
      label: 'No Show',
      color: 'orange',
      icon: '⚠️',
      description: 'Passenger did not show up'
    }
  };

  return statusMap[status] || {
    label: status,
    color: 'gray',
    icon: '❓',
    description: 'Unknown status'
  };
};

/**
 * Format payment status for display
 * @param {string} status - Payment status
 * @returns {Object} Payment status display info
 */
export const formatPaymentStatus = (status) => {
  const statusMap = {
    pending: {
      label: 'Payment Pending',
      color: 'yellow',
      icon: '💳'
    },
    initiated: {
      label: 'Payment Initiated',
      color: 'blue',
      icon: '🔄'
    },
    completed: {
      label: 'Paid',
      color: 'green',
      icon: '✅'
    },
    failed: {
      label: 'Payment Failed',
      color: 'red',
      icon: '❌'
    },
    refunded: {
      label: 'Refunded',
      color: 'purple',
      icon: '↩️'
    }
  };

  return statusMap[status] || {
    label: status,
    color: 'gray',
    icon: '❓'
  };
};

/**
 * Check if booking can be cancelled
 * @param {Object} booking - Booking object
 * @returns {boolean} Can cancel
 */
export const canCancelBooking = (booking) => {
  return ['pending', 'accepted'].includes(booking.status);
};

/**
 * Check if booking can be rated
 * @param {Object} booking - Booking object
 * @returns {boolean} Can rate
 */
export const canRateBooking = (booking) => {
  return booking.status === 'completed' && !booking.rating?.driverRating?.score;
};

export default {
  createBooking,
  getMyBookings,
  getDriverBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  completePayment,
  addRating,
  calculateRefund,
  formatBookingStatus,
  formatPaymentStatus,
  canCancelBooking,
  canRateBooking
};