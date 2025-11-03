// src/services/userService.js
import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://share-my-ride-backend-aioz8wnlr-abhays-projects-cdb9056e.vercel.app/';

const userAPI = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

userAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('🔄 API Request:', config.method.toUpperCase(), config.url);
    return config;
  },
  (error) => Promise.reject(error)
);

userAPI.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.config.url, response.data);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.response?.data || error.message);
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
    console.log('📤 Updating profile with:', profileData);
    
    const response = await userAPI.put('/users/profile', profileData);
    
    console.log('📦 Profile update response:', response.data);
    
    // Handle different response structures from backend
    // Backend might return: { user: {...} } or { data: {...} } or just {...}
    const updatedUser = response.data.user || response.data.data || response.data;
    
    if (!updatedUser || !updatedUser.email) {
      throw new Error('Invalid response from server');
    }
    
    return updatedUser;
  } catch (error) {
    console.error('❌ Update profile error:', error);
    throw error;
  }
};

export default userAPI;