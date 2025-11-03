import api from '../config/api';

/**
 * Signup user
 * @param {Object} userData - {name, email, password}
 * @returns {Promise<Object>} - {token, user}
 */
export const signupUser = async (userData) => {
  const response = await api.post('/auth/signup', userData);
  return response.data;
};

/**
 * Login user
 * @param {Object} credentials - {email, password}
 * @returns {Promise<Object>} - {token, user}
 */
export const loginUser = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
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

/**
 * Send password reset email
 * @param {string} email - User's email address
 * @returns {Promise<Object>} - Response data
 */
export const sendPasswordResetEmail = async (email) => {
  try {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Verify reset code
 * @param {string} email - User's email address
 * @param {string} code - Verification code
 * @returns {Promise<Object>} - Response data
 */
export const verifyResetCode = async (email, code) => {
  try {
    const response = await api.post('/auth/verify-reset-code', { email, code });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Reset password
 * @param {string} email - User's email address
 * @param {string} code - Verification code
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Response data
 */
export const resetPassword = async (email, code, newPassword) => {
  try {
    const response = await api.post('/auth/reset-password', { 
      email, 
      code, 
      newPassword 
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};