import api from '../config/api';

/**
 * Start a new negotiation on a ride.
 * @param {{
 *   rideId: string,
 *   source: 'chat'|'negotiate_fare'|'request_partial'|'discuss_pickup'|'discuss_drop'|'preference',
 *   proposedFare?: number, pickupLocation?: string, dropLocation?: string,
 *   time?: string, date?: string, seats?: number, message?: string,
 *   preferenceKey?: string, preferenceRequested?: boolean, preferenceNote?: string
 * }} payload
 * @returns {Promise<{ success: boolean, data: Object, conversationId: string|null }>}
 */
export const initiateNegotiation = async (payload) => {
  const response = await api.post('/negotiations', payload);
  return response.data;
};

/**
 * List the current user's negotiations (as passenger and/or driver).
 * @param {{ role?: 'passenger'|'driver', status?: string, rideId?: string }} [params]
 * @returns {Promise<Array>}
 */
export const getMyNegotiations = async (params = {}) => {
  const response = await api.get('/negotiations/my', { params });
  return response.data?.data || [];
};

/**
 * Fetch a single negotiation by id (full detail, incl. proposal history).
 * @param {string} id
 * @returns {Promise<Object>}
 */
export const getNegotiationById = async (id) => {
  const response = await api.get(`/negotiations/${id}`);
  return response.data?.data || response.data;
};

/**
 * Counter-offer with new terms. Either party may call this while status is
 * 'pending' or 'countered'.
 * @param {string} id
 * @param {{ pickupLocation?, dropLocation?, fare?, time?, date?, seats?, message?, preferenceNote? }} payload
 * @returns {Promise<Object>}
 */
export const counterOffer = async (id, payload) => {
  const response = await api.post(`/negotiations/${id}/counter`, payload);
  return response.data?.data || response.data;
};

/**
 * Accept the current terms on the table. Does NOT create a booking — the
 * driver still needs to call finalizeNegotiation.
 * @param {string} id
 * @returns {Promise<Object>}
 */
export const acceptNegotiation = async (id) => {
  const response = await api.post(`/negotiations/${id}/accept`);
  return response.data?.data || response.data;
};

/**
 * Reject/decline a negotiation outright.
 * @param {string} id
 * @returns {Promise<Object>}
 */
export const rejectNegotiation = async (id) => {
  const response = await api.post(`/negotiations/${id}/reject`);
  return response.data?.data || response.data;
};

/**
 * Withdraw a negotiation before it's resolved.
 * @param {string} id
 * @returns {Promise<Object>}
 */
export const cancelNegotiation = async (id) => {
  const response = await api.post(`/negotiations/${id}/cancel`);
  return response.data?.data || response.data;
};

/**
 * DRIVER ONLY — turn an 'accepted' negotiation into a real Booking.
 * @param {string} id
 * @returns {Promise<{ negotiation: Object, booking: Object }>}
 */
export const finalizeNegotiation = async (id) => {
  const response = await api.post(`/negotiations/${id}/finalize`);
  return response.data?.data || response.data;
};

export default {
  initiateNegotiation,
  getMyNegotiations,
  getNegotiationById,
  counterOffer,
  acceptNegotiation,
  rejectNegotiation,
  cancelNegotiation,
  finalizeNegotiation,
};