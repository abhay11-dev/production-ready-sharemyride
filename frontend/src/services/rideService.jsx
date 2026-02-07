import axios from 'axios';

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'https://share-my-ride-backend-aioz8wnlr-abhays-projects-cdb9056e.vercel.app/';

// Create axios instance with default config
const rideAPI = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token if available
rideAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
rideAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      if (status === 401) {
        // Unauthorized - redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else if (status === 404) {
        return Promise.reject(data?.message || 'Resource not found');
      } else if (status === 500) {
        return Promise.reject(data?.message || 'Server error. Please try again later.');
      }
      
      return Promise.reject(data?.message || 'An error occurred');
    } else if (error.request) {
      // Request made but no response received
      return Promise.reject('No response from server. Please check your connection.');
    } else {
      // Error in request setup
      return Promise.reject(error.message || 'Request failed');
    }
  }
);

/**
 * Post a new ride
 * @param {Object} rideData - Ride details (matching schema structure)
 * @returns {Promise<Object>} Created ride data
 */
export const postRide = async (rideData) => {
  try {
    const response = await rideAPI.post('/', rideData);
    return response.data;
  } catch (error) {
    console.error('Post Ride error:', error);
    throw error;
  }
};

/**
 * Search for available rides
 * @param {string} start - Starting location
 * @param {string} end - Destination
 * @param {string} [date] - Optional specific date (YYYY-MM-DD)
 * @param {Object} [additionalFilters] - Additional optional filters
 * @param {number} additionalFilters.minSeats - Minimum seats required
 * @param {number} additionalFilters.maxFare - Maximum fare
 * @param {string} additionalFilters.vehicleType - Vehicle type filter
 * @param {boolean} additionalFilters.acAvailable - AC availability
 * @returns {Promise<Array>} Array of matching rides
 */
export const searchRides = async (start, end, date = null, additionalFilters = {}) => {
  try {
    const params = { 
      start, 
      end,
    };
    
    // Add date if provided
    if (date) {
      params.date = date;
    }
    
    // Merge additional filters
    Object.assign(params, additionalFilters);
    
    const response = await rideAPI.get('/search', { params });
    return response.data;
  } catch (error) {
    console.error('Search Rides error:', error);
    throw error;
  }
};

/**
 * Get a specific ride by ID
 * @param {string|number} rideId - Ride ID
 * @returns {Promise<Object>} Ride details with populated driver and booking info
 */
export const getRideById = async (rideId) => {
  try {
    const response = await rideAPI.get(`/${rideId}`);
    return response.data;
  } catch (error) {
    console.error('Get Ride error:', error);
    throw error;
  }
};

/**
 * Get all rides posted by the current user
 * @param {Object} [filters] - Optional filters
 * @param {string} filters.status - Filter by ride status (active, completed, cancelled)
 * @returns {Promise<Array>} Array of user's rides
 */
export const getMyRides = async (filters = {}) => {
  try {
    const response = await rideAPI.get('/my-rides', { params: filters });
    return response.data;
  } catch (error) {
    console.error('Get My Rides error:', error);
    throw error;
  }
};

/**
 * Update an existing ride
 * @param {string|number} rideId - Ride ID
 * @param {Object} updateData - Updated ride data (partial update supported)
 * @returns {Promise<Object>} Updated ride data
 */
export const updateRide = async (rideId, updateData) => {
  try {
    const response = await rideAPI.put(`/${rideId}`, updateData);
    return response.data;
  } catch (error) {
    console.error('Update Ride error:', error);
    throw error;
  }
};

/**
 * Delete/Cancel a ride
 * @param {string|number} rideId - Ride ID
 * @param {string} [reason] - Cancellation reason
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteRide = async (rideId, reason = '') => {
  try {
    const response = await rideAPI.delete(`/${rideId}`, {
      data: { cancellationReason: reason }
    });
    return response.data;
  } catch (error) {
    console.error('Delete Ride error:', error);
    throw error;
  }
};

/**
 * Request to book a ride
 * @param {string|number} rideId - Ride ID
 * @param {Object} bookingData - Booking details
 * @param {number} bookingData.seatsRequested - Number of seats to book
 * @param {string} [bookingData.pickupLocation] - Specific pickup location
 * @param {string} [bookingData.dropLocation] - Specific drop location
 * @param {string} [bookingData.passengerNotes] - Additional notes
 * @returns {Promise<Object>} Booking confirmation
 */
export const requestRide = async (rideId, bookingData) => {
  try {
    const response = await rideAPI.post(`/${rideId}/request`, bookingData);
    return response.data;
  } catch (error) {
    console.error('Request Ride error:', error);
    throw error;
  }
};

/**
 * Get ride requests/bookings for a specific ride (Driver view)
 * @param {string|number} rideId - Ride ID
 * @returns {Promise<Array>} Array of ride requests/bookings
 */
export const getRideRequests = async (rideId) => {
  try {
    const response = await rideAPI.get(`/${rideId}/requests`);
    return response.data;
  } catch (error) {
    console.error('Get Ride Requests error:', error);
    throw error;
  }
};

/**
 * Accept or reject a ride request
 * @param {string|number} rideId - Ride ID
 * @param {string|number} requestId - Request/Booking ID
 * @param {string} status - 'confirmed', 'cancelled', or 'rejected'
 * @param {string} [reason] - Reason for rejection (if applicable)
 * @returns {Promise<Object>} Updated request data
 */
export const updateRideRequest = async (rideId, requestId, status, reason = '') => {
  try {
    const payload = { status };
    if (reason) {
      payload.cancellationReason = reason;
    }
    const response = await rideAPI.put(`/${rideId}/requests/${requestId}`, payload);
    return response.data;
  } catch (error) {
    console.error('Update Ride Request error:', error);
    throw error;
  }
};

/**
 * Cancel a ride booking (Passenger cancellation)
 * @param {string|number} rideId - Ride ID
 * @param {string|number} bookingId - Booking ID
 * @param {string} [reason] - Cancellation reason
 * @returns {Promise<Object>} Cancellation confirmation
 */
export const cancelBooking = async (rideId, bookingId, reason = '') => {
  try {
    const response = await rideAPI.delete(`/${rideId}/bookings/${bookingId}`, {
      data: { cancellationReason: reason }
    });
    return response.data;
  } catch (error) {
    console.error('Cancel Booking error:', error);
    throw error;
  }
};

/**
 * Get user's booking history (Passenger view)
 * @param {Object} [filters] - Optional filters
 * @param {string} filters.status - Filter by booking status
 * @param {string} filters.fromDate - Start date for filtering
 * @param {string} filters.toDate - End date for filtering
 * @returns {Promise<Array>} Array of user's bookings
 */
export const getMyBookings = async (filters = {}) => {
  try {
    const response = await rideAPI.get('/my-bookings', { params: filters });
    return response.data;
  } catch (error) {
    console.error('Get My Bookings error:', error);
    throw error;
  }
};

/**
 * Rate a completed ride
 * @param {string|number} rideId - Ride ID
 * @param {string|number} bookingId - Booking ID
 * @param {Object} ratingData - Rating details
 * @param {number} ratingData.score - Rating score (1-5)
 * @param {string} [ratingData.review] - Optional review text
 * @returns {Promise<Object>} Rating confirmation
 */
export const rateRide = async (rideId, bookingId, ratingData) => {
  try {
    const response = await rideAPI.post(`/${rideId}/bookings/${bookingId}/rate`, ratingData);
    return response.data;
  } catch (error) {
    console.error('Rate Ride error:', error);
    throw error;
  }
};

/**
 * Update ride status (for drivers)
 * @param {string|number} rideId - Ride ID
 * @param {string} status - New status ('active', 'in_progress', 'completed', 'cancelled')
 * @returns {Promise<Object>} Updated ride data
 */
export const updateRideStatus = async (rideId, status) => {
  try {
    const response = await rideAPI.patch(`/${rideId}/status`, { rideStatus: status });
    return response.data;
  } catch (error) {
    console.error('Update Ride Status error:', error);
    throw error;
  }
};

/**
 * Get available seats for a specific segment of the ride
 * @param {string|number} rideId - Ride ID
 * @param {string} pickupPoint - Pickup location
 * @param {string} dropPoint - Drop location
 * @returns {Promise<Object>} Available seats info
 */
export const checkSegmentAvailability = async (rideId, pickupPoint, dropPoint) => {
  try {
    const response = await rideAPI.get(`/${rideId}/availability`, {
      params: { pickupPoint, dropPoint }
    });
    return response.data;
  } catch (error) {
    console.error('Check Segment Availability error:', error);
    throw error;
  }
};

/**
 * Increment view count for a ride
 * @param {string|number} rideId - Ride ID
 * @returns {Promise<void>}
 */
export const incrementViewCount = async (rideId) => {
  try {
    await rideAPI.post(`/${rideId}/view`);
  } catch (error) {
    console.error('Increment View Count error:', error);
    // Don't throw error for view count - it's not critical
  }
};

/**
 * Get featured/verified rides
 * @param {Object} [filters] - Optional filters
 * @returns {Promise<Array>} Array of featured rides
 */
export const getFeaturedRides = async (filters = {}) => {
  try {
    const response = await rideAPI.get('/featured', { params: filters });
    return response.data;
  } catch (error) {
    console.error('Get Featured Rides error:', error);
    throw error;
  }
};

/**
 * Get rides with partial route matching
 * @param {string} start - Starting location
 * @param {string} end - Destination
 * @returns {Promise<Array>} Array of rides that pass through or near the route
 */
export const searchPartialRoutes = async (start, end) => {
  try {
    const response = await rideAPI.get('/search/partial', {
      params: { start, end }
    });
    return response.data;
  } catch (error) {
    console.error('Search Partial Routes error:', error);
    throw error;
  }
};

export default rideAPI;