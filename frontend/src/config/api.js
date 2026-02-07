import axios from 'axios';

const getApiUrl = () => {
  // Check for Vite environment variable
  if (import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Default production URL
  return 'https://share-my-ride-backend-aioz8wnlr-abhays-projects-cdb9056e.vercel.app/api';
};

const API_BASE_URL = getApiUrl();

console.log('🌐 API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Only log in development
    if (import.meta.env?.DEV) {
      console.log('📤 Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        hasToken: !!token
      });
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    if (import.meta.env?.DEV) {
      console.log('✅ Response:', response.status, response.config.url);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const isAuthRequest = error.config?.url?.includes('/auth/');
    
    // Log errors in development
    if (import.meta.env?.DEV) {
      console.error('❌ API Error:', {
        status,
        message: error.response?.data?.message || error.message,
        url: error.config?.url,
        data: error.response?.data
      });
    }

    // Handle 401 errors
    if (status === 401 && !isAuthRequest) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;