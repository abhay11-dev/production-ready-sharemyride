// config/api.js
// Axios instance used by all frontend service calls.
//
// Security:
//  • Access token is pulled from memory (useAuth module) — never localStorage
//  • On 401 TOKEN_EXPIRED, one silent refresh is attempted automatically
//  • Refresh token travels as HttpOnly cookie — this file never touches it
//  • Credentials: 'include' so the browser sends the cookie cross-origin

import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from '../hooks/useAuth.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'https://production-ready-sharemyride.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,  // Required: sends the HttpOnly refresh-token cookie
});

// ── Request interceptor: attach access token from memory ─────────────────────
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle token expiry ─────────────────────────────────
let isRefreshing = false;
let failedQueue  = [];   // Requests that arrived while a refresh was in-flight

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const isRefreshRequest = (config) => 
  config?.url?.includes('/auth/refresh-token') ||
  config?.baseURL?.includes('/auth/refresh-token');

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest || isRefreshRequest(originalRequest)) {
      return Promise.reject(error);
    }

    // ── Token expired — attempt one silent refresh ──────────────────────────
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        // Queue this request until the ongoing refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${API_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );
        const newToken = refreshResponse.data?.token;

        if (!newToken) throw new Error('No token returned from refresh');

        setAccessToken(newToken);
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAccessToken();
        localStorage.removeItem('user');
        // Redirect to login — session is fully expired
        window.location.href = '/login';
        return Promise.reject(refreshError);

      } finally {
        isRefreshing = false;
      }
    }

    // ── 403 suspended / unverified — let callers handle ───────────────────
    // Do NOT auto-redirect here; Login.jsx shows contextual UI instead.

    // ── Other errors — pass through as-is ─────────────────────────────────
    return Promise.reject(error);
  }
);

export default api;