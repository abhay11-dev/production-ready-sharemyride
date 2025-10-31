// src/services/userService.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://share-my-ride-backend-aioz8wnlr-abhays-projects-cdb9056e.vercel.app/';

const userAPI = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
userAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
userAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
localStorage.removeItem('token');

      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Update user profile
 * @param {Object} profileData - Updated profile data (name, email)
 * @returns {Promise<Object>} Updated user data
 */
export const updateUserProfile = async (profileData) => {
  try {
    const response = await userAPI.put('/profile', profileData);
    return response.data;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
};

export default userAPI;