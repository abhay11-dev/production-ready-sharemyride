import axios from 'axios';

// Works for both Create React App and Vite
const getApiUrl = () => {
  // For Vite
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_API_URL || 'https://share-my-ride-backend-aioz8wnlr-abhays-projects-cdb9056e.vercel.app/api/';
  }
  // For Create React App
  if (typeof process !== 'undefined' && process.env) {
    return process.env.REACT_APP_API_URL || 'https://share-my-ride-backend-aioz8wnlr-abhays-projects-cdb9056e.vercel.app/api/';
  }
  return import.meta.env.VITE_API_URL || 
       'https://share-my-ride-backend-aioz8wnlr-abhays-projects-cdb9056e.vercel.app/api';

};

const API_BASE_URL = getApiUrl();

console.log('🌐 API Base URL:', API_BASE_URL);

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Token attached to request:', config.url);
    } else {
      console.log('⚠️ No token found for request:', config.url);
    }
    
    // Log the full request for debugging
    console.log('📤 Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      data: config.data,
      hasToken: !!token
    });
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    // Log detailed error information
    console.error('❌ API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.response?.data?.message || error.message,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      data: error.response?.data
    });

    // Handle specific error cases
    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.message?.toLowerCase() || '';
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      const isSignupRequest = error.config?.url?.includes('/auth/signup');
      
      // DON'T clear session for login/signup failures (invalid credentials)
      if (isLoginRequest || isSignupRequest) {
        console.warn('🔐 Authentication failed - invalid credentials');
        // Let the component handle the error message
      } else {
        // For other 401 errors, it's likely an invalid/expired token
        console.error('🔒 Token invalid/expired - clearing session');
        
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        
        // Redirect to login only if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    } else if (error.response?.status === 403) {
      console.error('🚫 Forbidden - insufficient permissions');
    } else if (error.response?.status === 404) {
      console.error('🔍 Not found - endpoint does not exist');
    } else if (error.response?.status >= 500) {
      console.error('🔥 Server error - backend issue');
    } else if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timeout');
    } else if (error.message === 'Network Error') {
      console.error('🌐 Network error - check if backend is running');
    }
    
    return Promise.reject(error);
  }
);

export default api;