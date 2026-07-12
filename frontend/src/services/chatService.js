import api from '../config/api';

/**
 * Get (or create, if this is the first contact) the conversation for a ride.
 * @param {string} rideId
 * @returns {Promise<Object>} the Conversation document
 */
export const getOrCreateConversation = async (rideId) => {
  const response = await api.post('/chat/conversations', { rideId });
  return response.data?.data || response.data;
};

/**
 * Single conversation, with ride/passenger/driver populated. Used to build
 * the in-chat preference cards and to know which side (passenger/driver)
 * the current user is on.
 * @param {string} conversationId
 * @returns {Promise<Object>}
 */
export const getConversationById = async (conversationId) => {
  const response = await api.get(`/chat/conversations/${conversationId}`);
  return response.data?.data || response.data;
};

/**
 * List every conversation the current user participates in (as passenger or
 * driver), newest-updated first.
 * @returns {Promise<Array>}
 */
export const getMyConversations = async () => {
  const response = await api.get('/chat/conversations');
  if (Array.isArray(response.data)) return response.data;
  return response.data?.data || [];
};

/**
 * Paginated message history for a conversation. Returned newest-first by
 * the API — callers that render chronologically (e.g. ChatThread) should
 * reverse the `data` array before rendering.
 * @param {string} conversationId
 * @param {{ page?: number, limit?: number }} [opts]
 * @returns {Promise<{ data: Array, meta: { page, limit, total, totalPages } }>}
 */
export const getMessages = async (conversationId, opts = {}) => {
  const { page = 1, limit = 30 } = opts;
  const response = await api.get(`/chat/conversations/${conversationId}/messages`, {
    params: { page, limit },
  });
  return {
    data: response.data?.data || [],
    meta: response.data?.meta || { page, limit, total: 0, totalPages: 1 },
  };
};

/**
 * AI-generated summary of the conversation + all negotiation threads on it
 * (fare, seats, pickup/drop, accepted/rejected preferences, conditions,
 * special agreements).
 * @param {string} conversationId
 * @returns {Promise<Object>}
 */
export const getConversationSummary = async (conversationId) => {
  const response = await api.get(`/chat/conversations/${conversationId}/summary`);
  return response.data?.data || response.data;
};

/**
 * REST fallback send — used only when the socket isn't connected. The
 * primary send path is useChat's `sendMessage`, which uses the socket.
 * @param {string} conversationId
 * @param {string} text
 * @returns {Promise<Object>} the saved Message document
 */
export const sendMessageRest = async (conversationId, text) => {
  const response = await api.post(`/chat/conversations/${conversationId}/messages`, { text });
  return response.data?.data || response.data;
};

export default {
  getOrCreateConversation,
  getConversationById,
  getMyConversations,
  getMessages,
  getConversationSummary,
  sendMessageRest,
};