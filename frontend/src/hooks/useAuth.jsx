// hooks/useAuth.jsx
// Central auth state — wraps login/signup/logout and manages access token
// in memory (not localStorage) so it is never accessible to injected scripts.
//
// Token storage strategy:
//   Access token  → memory (this module's closure) — refreshed on expiry
//   Refresh token → HttpOnly Secure cookie (set/cleared by the backend)
//   User object   → localStorage (non-sensitive fields only, read on mount)

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../config/api';

// ── In-memory access token store ─────────────────────────────────────────────
// Keeps the access token out of localStorage/sessionStorage entirely.
let _accessToken = null;
export const getAccessToken  = ()      => _accessToken;
export const setAccessToken  = (token) => { _accessToken = token; };
export const clearAccessToken = ()     => { _accessToken = null; };

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(() => {
    // Restore non-sensitive user object from localStorage on page load
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);  // true while silently refreshing on mount
  const refreshTimer = useRef(null);

  // ── Schedule silent token refresh ──────────────────────────────────────────
  // Access tokens live 15 min. Refresh at 14 min to avoid expiry mid-request.
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(async () => {
      try {
        await silentRefresh();
      } catch {
        // Refresh token expired/invalid → log the user out
        handleLogout(false);
      }
    }, 14 * 60 * 1000); // 14 minutes
  }, []);

  // ── Silent token refresh ────────────────────────────────────────────────────
  const silentRefresh = useCallback(async () => {
    const response = await api.post('/auth/refresh-token');
    if (response.data?.token) {
      setAccessToken(response.data.token);
      scheduleRefresh();
      return response.data.token;
    }
    throw new Error('No token in refresh response');
  }, [scheduleRefresh]);

  // ── Mount: try to restore session via refresh token cookie ─────────────────
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await silentRefresh();
        if (token) {
          // Fetch fresh user profile to make sure stored user isn't stale
          const profileRes = await api.get('/auth/profile');
          if (profileRes.data?.user) {
            setUser(profileRes.data.user);
            localStorage.setItem('user', JSON.stringify(profileRes.data.user));
          }
        }
      } catch {
        // No valid refresh token — clear any stale user from localStorage
        clearAccessToken();
        setUser(null);
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [silentRefresh]);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { token, user: userData } = response.data;

      setAccessToken(token);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      scheduleRefresh();

      return { success: true, user: userData };

    } catch (err) {
      // Return structured error so Login.jsx can branch on status/data
      // without having to re-parse thrown errors
      return {
        success: false,
        status: err.response?.status,
        error:  err.response?.data?.message || err.message || 'Login failed.',
        data:   err.response?.data || {}
      };
    }
  }, [scheduleRefresh]);

  // ── Signup ─────────────────────────────────────────────────────────────────
  const signup = useCallback(async (details) => {
    try {
      const response = await api.post('/auth/signup', details);
      return { success: true, data: response.data };
    } catch (err) {
      return {
        success: false,
        status: err.response?.status,
        error:  err.response?.data?.message || err.message || 'Signup failed.',
        data:   err.response?.data || {}
      };
    }
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(async (callApi = true) => {
    try {
      if (callApi) await api.post('/auth/logout');
    } catch {
      // Ignore API errors on logout — always clear client state
    } finally {
      clearAccessToken();
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('pendingVerificationEmail');
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    }
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user && !!getAccessToken(),
    login,
    signup,
    logout: handleLogout,
    silentRefresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}