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
        return Promise.reject('Resource not found');
      } else if (status === 500) {
        return Promise.reject('Server error. Please try again later.');
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
 * @param {Object} rideData - Ride details
 * @param {string} rideData.start - Starting location
 * @param {string} rideData.end - Destination
 * @param {string} rideData.date - Ride date
 * @param {string} rideData.time - Ride time
 * @param {number} rideData.seats - Available seats
 * @param {number} rideData.fare - Fare per seat
 * @param {number} rideData.driverId - Driver user ID
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
 * @param {Object} filters - Optional filters
 * @param {string} filters.date - Specific date
 * @param {number} filters.minSeats - Minimum seats required
 * @param {number} filters.maxFare - Maximum fare
 * @returns {Promise<Array>} Array of matching rides
 */
export const searchRides = async (start, end, filters = {}) => {
  try {
    const response = await rideAPI.get('/search', {
      params: { 
        start, 
        end,
        ...filters
      },
    });
    return response.data;
  } catch (error) {
    console.error('Search Rides error:', error);
    throw error;
  }
};

/**
 * Get a specific ride by ID
 * @param {string|number} rideId - Ride ID
 * @returns {Promise<Object>} Ride details
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
 * @returns {Promise<Array>} Array of user's rides
 */
export const getMyRides = async () => {
  try {
    const response = await rideAPI.get('/my-rides');
    return response.data;
  } catch (error) {
    console.error('Get My Rides error:', error);
    throw error;
  }
};

/**
 * Update an existing ride
 * @param {string|number} rideId - Ride ID
 * @param {Object} updateData - Updated ride data
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
 * Delete a ride
 * @param {string|number} rideId - Ride ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteRide = async (rideId) => {
  try {
    const response = await rideAPI.delete(`/${rideId}`);
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
 * Get ride requests for a specific ride
 * @param {string|number} rideId - Ride ID
 * @returns {Promise<Array>} Array of ride requests
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
 * @param {string|number} requestId - Request ID
 * @param {string} status - 'accepted' or 'rejected'
 * @returns {Promise<Object>} Updated request data
 */
export const updateRideRequest = async (rideId, requestId, status) => {
  try {
    const response = await rideAPI.put(`/${rideId}/requests/${requestId}`, { status });
    return response.data;
  } catch (error) {
    console.error('Update Ride Request error:', error);
    throw error;
  }
};

/**
 * Cancel a ride booking
 * @param {string|number} rideId - Ride ID
 * @param {string|number} bookingId - Booking ID
 * @returns {Promise<Object>} Cancellation confirmation
 */
export const cancelBooking = async (rideId, bookingId) => {
  try {
    const response = await rideAPI.delete(`/${rideId}/bookings/${bookingId}`);
    return response.data;
  } catch (error) {
    console.error('Cancel Booking error:', error);
    throw error;
  }
};

/**
 * Get user's booking history
 * @returns {Promise<Array>} Array of user's bookings
 */
export const getMyBookings = async () => {
  try {
    const response = await rideAPI.get('/my-bookings');
    return response.data;
  } catch (error) {
    console.error('Get My Bookings error:', error);
    throw error;
  }
};

/**
 * Rate a completed ride
 * @param {string|number} rideId - Ride ID
 * @param {Object} ratingData - Rating details
 * @param {number} ratingData.rating - Rating (1-5)
 * @param {string} ratingData.review - Optional review text
 * @returns {Promise<Object>} Rating confirmation
 */
export const rateRide = async (rideId, ratingData) => {
  try {
    const response = await rideAPI.post(`/${rideId}/rate`, ratingData);
    return response.data;
  } catch (error) {
    console.error('Rate Ride error:', error);
    throw error;
  }
};

export default rideAPI;