import api from '../config/api';

/**
 * Signup user
 * @param {Object} userData - {name, email, password}
 * @returns {Promise<Object>} - {token, user}
 */
export const signupUser = async (userData) => {
  try {
    const response = await api.post('/auth/signup', userData);
    return response.data;
  } catch (error) {
    // Extract error message from response or use default
    const message = error.response?.data?.message || error.message || 'Signup failed. Please try again.';
    const customError = new Error(message);
    customError.status = error.response?.status;
    customError.data = error.response?.data;
    throw customError;
  }
};

/**
 * Login user
 * @param {Object} credentials - {email, password}
 * @returns {Promise<Object>} - {token, user}
 */
export const loginUser = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Login failed. Please try again.';
    const customError = new Error(message);
    customError.status = error.response?.status;
    customError.response = error.response;
    throw customError;
  }
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

/**
 * Verify email with token
 * @param {string} token - Email verification token
 * @param {string} email - User's email address
 * @returns {Promise<Object>} - Response data
 */
export const verifyEmail = async (token, email) => {
  try {
    const response = await api.post('/auth/verify-email', { token, email });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Email verification failed. Please try again.';
    const customError = new Error(message);
    customError.status = error.response?.status;
    throw customError;
  }
};

/**
 * Resend verification email
 * @param {string} email - User's email address
 * @returns {Promise<Object>} - Response data
 */
export const resendVerificationEmail = async (email) => {
  try {
    const response = await api.post('/auth/resend-verification-email', { email });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to resend email. Please try again.';
    const customError = new Error(message);
    customError.status = error.response?.status;
    customError.retryAfter = error.response?.data?.retryAfter;
    throw customError;
  }
};