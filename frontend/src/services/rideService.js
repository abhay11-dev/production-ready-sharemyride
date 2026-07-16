// src/services/rideService.js
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
 * Search for available rides
 */
export const searchRides = async (start, end, date = null, additionalFilters = {}) => {
  try {
    const params = {};

    if (start && start.trim()) params.start = start.trim();
    if (end && end.trim()) params.end = end.trim();
    if (date) params.date = date;

    Object.assign(params, additionalFilters);

    const response = await api.get('/rides/search', { params });

    let rides;
    if (Array.isArray(response.data)) {
      rides = response.data;
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      rides = response.data.data;
    } else if (response.data?.rides && Array.isArray(response.data.rides)) {
      rides = response.data.rides;
    } else {
      rides = [];
    }

    // meta carries Smart Search tier info + pagination (Milestone 1).
    // Safe default so older/partial responses don't break callers.
    const meta = (!Array.isArray(response.data) && response.data?.meta) || {};

    return { rides, meta };
  } catch (error) {
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
 * Get all rides posted by the current user.
 * @param {Object} [filters]
 * @param {string} [filters.status] - 'active' | 'completed' | 'cancelled' | 'in_progress' | 'expired'
 *   Omit to get all statuses. Defaults to 'active' for backward compatibility if not supplied.
 * @returns {Promise<Array>}
 */
export const getMyRides = async (filters = {}) => {
  // Build params: only include status if explicitly provided in filters.
  // RidePost page now passes { status: 'active' | 'completed' | 'cancelled' }
  // so the controller receives a real filter value each time.
  const params = {};
  if (filters.status) params.status = filters.status;

  const response = await api.get('/rides/my', { params });

  if (Array.isArray(response.data)) return response.data;
  if (response.data?.data && Array.isArray(response.data.data)) return response.data.data;
  if (response.data?.rides && Array.isArray(response.data.rides)) return response.data.rides;
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
 */
export const checkSegmentAvailability = async (rideId, pickupPoint, dropPoint) => {
  const response = await api.get(`/rides/${rideId}/availability`, {
    params: { pickupPoint, dropPoint }
  });
  return response.data;
};

/**
 * Increment view count for a ride
 */
export const incrementViewCount = async (rideId) => {
  try {
    await api.post(`/rides/${rideId}/view`);
  } catch {
    // Non-critical — fail silently
  }
};

/**
 * Get featured/verified rides
 */
export const getFeaturedRides = async (filters = {}) => {
  const response = await api.get('/rides/featured', { params: filters });
  return response.data;
};

/**
 * Get rides with partial route matching
 */
export const searchPartialRoutes = async (start, end) => {
  const response = await api.get('/rides/search/partial', {
    params: { start, end }
  });
  return response.data;
};