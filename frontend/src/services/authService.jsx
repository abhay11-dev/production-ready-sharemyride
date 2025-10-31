import axios from 'axios';

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'https://share-my-ride-backend-aioz8wnlr-abhays-projects-cdb9056e.vercel.app/';

// Create axios instance with default config
const authAPI = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token if available
authAPI.interceptors.request.use(
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
authAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      if (status === 401) {
        // Unauthorized - clear auth data
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else if (status === 403) {
        console.error('Access forbidden');
      } else if (status === 500) {
        console.error('Server error');
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
 * Login user with credentials
 * @param {Object} credentials - User credentials
 * @param {string} credentials.email - User email
 * @param {string} credentials.password - User password
 * @returns {Promise<Object>} User data and token
 */
export const loginUser = async (credentials) => {
  try {
    const response = await authAPI.post('/login', credentials);
    
    // Store auth token if provided
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * Register new user
 * @param {Object} details - User registration details
 * @param {string} details.name - User full name
 * @param {string} details.email - User email
 * @param {string} details.password - User password
 * @returns {Promise<Object>} User data and token
 */
export const signupUser = async (details) => {
  try {
    const response = await authAPI.post('/signup', details);
    
    // Store auth token if provided
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    
    return response.data;
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
};

/**
 * Logout user and clear auth data
 * @returns {Promise<void>}
 */
export const logoutUser = async () => {
  try {
    // Optional: Call logout endpoint if backend requires it
    // await authAPI.post('/logout');
    
    // Clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    return Promise.resolve();
  } catch (error) {
    console.error('Logout error:', error);
    // Clear local storage even if API call fails
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    throw error;
  }
};

/**
 * Verify user token
 * @returns {Promise<Object>} User data
 */
export const verifyToken = async () => {
  try {
    const response = await authAPI.get('/verify');
    return response.data;
  } catch (error) {
    console.error('Token verification error:', error);
    throw error;
  }
};

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Promise<Object>} Response message
 */
export const requestPasswordReset = async (email) => {
  try {
    const response = await authAPI.post('/forgot-password', { email });
    return response.data;
  } catch (error) {
    console.error('Password reset request error:', error);
    throw error;
  }
};

/**
 * Reset password with token
 * @param {Object} data - Reset data
 * @param {string} data.token - Reset token
 * @param {string} data.newPassword - New password
 * @returns {Promise<Object>} Response message
 */
export const resetPassword = async (data) => {
  try {
    const response = await authAPI.post('/reset-password', data);
    return response.data;
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
};

export default authAPI;