import api from '../config/api';

/**
 * Post a new ride
 * @param {Object} rideData - Ride details (matching schema structure)
 * @returns {Promise<Object>} Created ride data
 */
export const postRide = async (rideData) => {
  const response = await api.post('/rides', rideData);
  return response.data;
};

/**
 * Search for available rides with enhanced error handling and debugging
 */
export const searchRides = async (start, end, date = null, additionalFilters = {}) => {
  try {
    const params = {};
    
    if (start && start.trim()) {
      params.start = start.trim();
    }
    
    if (end && end.trim()) {
      params.end = end.trim();
    }
    
    if (date) {
      params.date = date;
    }
    
    Object.assign(params, additionalFilters);
    
    console.log('🔍 Frontend: Calling API with params:', params);
    
    const response = await api.get('/rides/search', { params });
    
    console.log('📦 Frontend: Raw API response:', response);
    console.log('📊 Frontend: Response data type:', typeof response.data);
    console.log('📊 Frontend: Response data:', response.data);
    console.log('📊 Frontend: Is Array?', Array.isArray(response.data));
    
    // Handle different response formats
    let rides;
    
    if (Array.isArray(response.data)) {
      // Direct array response
      rides = response.data;
      console.log('✅ Frontend: Direct array detected');
    } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
      // Wrapped in { data: [] }
      rides = response.data.data;
      console.log('✅ Frontend: Wrapped array detected');
    } else if (response.data && response.data.rides && Array.isArray(response.data.rides)) {
      // Wrapped in { rides: [] }
      rides = response.data.rides;
      console.log('✅ Frontend: Rides array detected');
    } else {
      console.warn('⚠️ Frontend: Unexpected response format:', response.data);
      rides = [];
    }
    
    console.log('✅ Frontend: Final rides count:', rides.length);
    
    return rides;
    
  } catch (error) {
    console.error('❌ Frontend: Search API error');
    console.error('Error object:', error);
    console.error('Error response:', error.response);
    console.error('Error data:', error.response?.data);
    throw error;
  }
};

/**
 * Get a specific ride by ID
 * @param {string} rideId - Ride ID
 * @returns {Promise<Object>} Ride details with populated driver and booking info
 */
export const getRideById = async (rideId) => {
  const response = await api.get(`/rides/${rideId}`);
  return response.data;
};

/**
 * Get all rides posted by the current user
 * @param {Object} [filters] - Optional filters
 * @param {string} filters.status - Filter by ride status (active, completed, cancelled)
 * @returns {Promise<Array>} Array of user's rides
 */
export const getMyRides = async (filters = {}) => {
  const response = await api.get('/rides/my', { params: filters });
  
  // Handle different response formats
  if (Array.isArray(response.data)) {
    return response.data;
  } else if (response.data.data && Array.isArray(response.data.data)) {
    return response.data.data;
  } else if (response.data.rides && Array.isArray(response.data.rides)) {
    return response.data.rides;
  }
  
  return response.data;
};

/**
 * Update an existing ride
 * @param {string} rideId - Ride ID
 * @param {Object} updateData - Updated ride data (partial update supported)
 * @returns {Promise<Object>} Updated ride data
 */
export const updateRide = async (rideId, updateData) => {
  const response = await api.put(`/rides/${rideId}`, updateData);
  return response.data;
};

/**
 * Delete/Cancel a ride
 * @param {string} rideId - Ride ID
 * @param {string} [reason] - Cancellation reason
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteRide = async (rideId, reason = '') => {
  const data = reason ? { cancellationReason: reason } : {};
  const response = await api.delete(`/rides/${rideId}`, { data });
  return response.data;
};

/**
 * Update ride status (for drivers)
 * @param {string} rideId - Ride ID
 * @param {string} status - New status ('active', 'in_progress', 'completed', 'cancelled')
 * @returns {Promise<Object>} Updated ride data
 */
export const updateRideStatus = async (rideId, status) => {
  const response = await api.patch(`/rides/${rideId}/status`, { rideStatus: status });
  return response.data;
};

/**
 * Get ride bookings for a specific ride (Driver view)
 * @param {string} rideId - Ride ID
 * @returns {Promise<Array>} Array of ride bookings
 */
export const getRideBookings = async (rideId) => {
  const response = await api.get(`/rides/${rideId}/bookings`);
  return response.data;
};

/**
 * Get available seats for a specific segment of the ride
 * @param {string} rideId - Ride ID
 * @param {string} pickupPoint - Pickup location
 * @param {string} dropPoint - Drop location
 * @returns {Promise<Object>} Available seats info
 */
export const checkSegmentAvailability = async (rideId, pickupPoint, dropPoint) => {
  const response = await api.get(`/rides/${rideId}/availability`, {
    params: { pickupPoint, dropPoint }
  });
  return response.data;
};

/**
 * Increment view count for a ride
 * @param {string} rideId - Ride ID
 * @returns {Promise<void>}
 */
export const incrementViewCount = async (rideId) => {
  try {
    await api.post(`/rides/${rideId}/view`);
  } catch (error) {
    console.error('Failed to increment view count:', error);
  }
};

/**
 * Get featured/verified rides
 * @param {Object} [filters] - Optional filters
 * @returns {Promise<Array>} Array of featured rides
 */
export const getFeaturedRides = async (filters = {}) => {
  const response = await api.get('/rides/featured', { params: filters });
  return response.data;
};

/**
 * Get rides with partial route matching
 * @param {string} start - Starting location
 * @param {string} end - Destination
 * @returns {Promise<Array>} Array of rides that pass through or near the route
 */
export const searchPartialRoutes = async (start, end) => {
  const response = await api.get('/rides/search/partial', {
    params: { start, end }
  });
  return response.data;
};