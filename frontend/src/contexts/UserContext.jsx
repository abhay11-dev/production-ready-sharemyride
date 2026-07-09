import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { loginUser as loginAPI, signupUser as signupAPI } from '../services/authService';

export const UserContext = createContext();

const sanitizeForLog = (value) => {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitizeForLog);

  return Object.entries(value).reduce((safeValue, [key, item]) => {
    if (/password|token|authorization/i.test(key)) {
      safeValue[key] = '********';
    } else {
      safeValue[key] = sanitizeForLog(item);
    }
    return safeValue;
  }, {});
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');

        if (storedUser && storedToken) {
          const parsedUser = JSON.parse(storedUser);

          if (parsedUser && (parsedUser.id || parsedUser._id) && parsedUser.email) {
            setUser(parsedUser);
            console.log('✅ User session restored:', parsedUser.email);
          } else {
            console.warn('⚠️ Invalid user data in localStorage');
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
        }
      } catch (error) {
        console.error('❌ Failed to parse stored user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setError('Failed to restore session');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (credentials) => {
    try {
      setLoading(true);
      setError(null);

      if (!credentials || !credentials.email || !credentials.password) {
        throw new Error('Email and password are required');
      }

      if (import.meta.env?.DEV) {
        console.log('🔄 Logging in with:', sanitizeForLog(credentials));
      }

      const response = await loginAPI(credentials);
      if (import.meta.env?.DEV) {
        console.log('📦 Login API response:', sanitizeForLog(response));
      }

      if (response.success === false) {
        throw new Error(response.message || 'Login failed');
      }

      const token = response.token;
      const userData = response.user;

      if (!token) {
        console.error('❌ No token in login response');
        throw new Error('No authentication token received');
      }

      console.log('✅ Login successful with token');

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);

      return { success: true, user: userData, token };
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Login failed';
      setError(errorMessage);
      console.error('❌ Login error:', err.message || err);

      localStorage.removeItem('token');
      localStorage.removeItem('user');

      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (details) => {
    try {
      setLoading(true);
      setError(null);

      if (!details.name || !details.email || !details.password) {
        throw new Error('Name, email, and password are required');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(details.email)) {
        throw new Error('Invalid email format');
      }

      if (import.meta.env?.DEV) {
        console.log('🔄 Signing up with:', sanitizeForLog(details));
      }

      const response = await signupAPI(details);
      if (import.meta.env?.DEV) {
        console.log('📦 Signup API response:', sanitizeForLog(response));
      }

      const token = response.token || response.data?.token;
      const userData = response.user || response.data?.user || response;

      if (!token) {
        console.error('❌ No token in signup response');
        throw new Error('No authentication token received');
      }

      console.log('✅ Signup successful with token');

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);

      return { success: true, user: userData, token };
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Signup failed';
      setError(errorMessage);
      console.error('❌ Signup error:', err.message || err);

      localStorage.removeItem('token');
      localStorage.removeItem('user');

      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    try {
      setUser(null);
      setError(null);

      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');

      console.log('✅ User logged out');
      return { success: true };
    } catch (err) {
      console.error('❌ Logout error:', err);
      return { success: false, error: err.message };
    }
  }, []);

  const updateUser = useCallback((updatedData) => {
    try {
      console.log('🔄 Updating user with data:', updatedData);

      if (!user) {
        throw new Error('No user logged in');
      }

      const currentToken = localStorage.getItem('token');

      if (!currentToken) {
        console.error('❌ No token found when updating user');
        throw new Error('Authentication token missing. Please log in again.');
      }

      const updatedUser = {
        ...updatedData,
        id: updatedData.id || updatedData._id || user.id || user._id,
        updatedAt: new Date().toISOString()
      };

      console.log('✅ Updated user object:', updatedUser);

      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      console.log('✅ User updated successfully in state and localStorage');
      console.log('🔑 Token preserved in localStorage');

      return { success: true, user: updatedUser };
    } catch (err) {
      const errorMessage = err.message || 'Failed to update user';
      setError(errorMessage);
      console.error('❌ Update user error:', err);
      return { success: false, error: errorMessage };
    }
  }, [user]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    user,
    login,
    signup,
    logout,
    updateUser,
    loading,
    error,
    clearError,
    isAuthenticated: !!user
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
