import api from '../config/api';

/**
 * Signup user
 * @param {Object} userData - {name, email, password}
 * @returns {Promise<Object>} - {token, user}
 */
export const signupUser = async (userData) => {
  const response = await api.post('/auth/signup', userData);
  
  // ✅ RETURN THE COMPLETE RESPONSE (includes token + user)
  // UserContext will handle saving to localStorage
  return response.data;
};

/**
 * Login user
 * @param {Object} credentials - {email, password}
 * @returns {Promise<Object>} - {token, user}
 */
export const loginUser = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  
  // ✅ RETURN THE COMPLETE RESPONSE (includes token + user)
  // UserContext will handle saving to localStorage
  return response.data;
};

/**
 * Get current user profile
 * @returns {Promise<Object>} - User data
 */
export const getProfile = async () => {
  const response = await api.get('/auth/profile');
  return response.data;
};

/**
 * Logout user (client-side cleanup)
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('authToken'); // Remove old key if exists
};