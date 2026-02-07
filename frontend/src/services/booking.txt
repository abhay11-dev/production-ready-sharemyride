import axios from 'axios';

// Works for both Create React App and Vite
const getApiUrl = () => {
  // For Vite
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_API_URL || 'https://share-my-ride-backend-aioz8wnlr-abhays-projects-cdb9056e.vercel.app/';
  }
  // For Create React App
  if (typeof process !== 'undefined' && process.env) {
    return process.env.REACT_APP_API_URL || 'https://share-my-ride-backend-aioz8wnlr-abhays-projects-cdb9056e.vercel.app/';
  }
  return import.meta.env.VITE_API_URL || 
       'https://share-my-ride-backend-aioz8wnlr-abhays-projects-cdb9056e.vercel.app/api';

};

const API_BASE_URL = getApiUrl();

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    // Try multiple token locations for compatibility
    let token = null;
    
    // 1. Check authToken (primary)
    token = localStorage.getItem('authToken');
    
    // 2. Check token (backup)
    if (!token) {
      token = localStorage.getItem('token');
    }
    
    // 3. Check user object
    if (!token) {
      const user = localStorage.getItem('user');
      if (user) {
        try {
          const userData = JSON.parse(user);
          if (userData.token) {
            token = userData.token;
            // Save for next time
            localStorage.setItem('authToken', userData.token);
          }
        } catch (error) {
          console.error('Error parsing user token:', error);
        }
      }
    }
    
    // Add token to request if found
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('No authentication token found!');
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Authentication failed - redirecting to login');
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Create a new booking request
export const createBooking = async (bookingData) => {
  try {
    const response = await api.post('/bookings', bookingData);
    return response.data;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
};

// Get all bookings for the current user (passenger)
export const getMyBookings = async () => {
  try {
    const response = await api.get('/bookings/my-bookings');
    return response.data;
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    throw error;
  }
};

// Get all booking requests for rides posted by the current user (driver)
export const getDriverBookings = async () => {
  try {
    const response = await api.get('/bookings/driver-bookings');
    return response.data;
  } catch (error) {
    console.error('Error fetching driver bookings:', error);
    throw error;
  }
};

// Update booking status (accept/reject by driver)
export const updateBookingStatus = async (bookingId, status) => {
  try {
    const response = await api.patch(`/bookings/${bookingId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('Error updating booking status:', error);
    throw error;
  }
};

// Cancel booking (by passenger)
export const cancelBooking = async (bookingId) => {
  try {
    const response = await api.delete(`/bookings/${bookingId}`);
    return response.data;
  } catch (error) {
    console.error('Error cancelling booking:', error);
    throw error;
  }
};

// Get booking by ID
export const getBookingById = async (bookingId) => {
  try {
    const response = await api.get(`/bookings/${bookingId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching booking:', error);
    throw error;
  }
};

export default {
  createBooking,
  getMyBookings,
  getDriverBookings,
  updateBookingStatus,
  cancelBooking,
  getBookingById
};