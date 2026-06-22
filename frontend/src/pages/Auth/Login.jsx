import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import toast from 'react-hot-toast';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');         // Lockout warning (N attempts left)
  const [lockoutInfo, setLockoutInfo] = useState(null); // { lockedUntil: Date }
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false); // Email not verified state

  // Always render at the top of the page
  useEffect(() => { window.scrollTo(0, 0); }, []);

  // ── Lockout countdown ──────────────────────────────────────────────────────
  const getLockoutMinutes = () => {
    if (!lockoutInfo?.lockedUntil) return 0;
    return Math.max(0, Math.ceil((new Date(lockoutInfo.lockedUntil) - Date.now()) / 1000 / 60));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setWarning('');
    setNeedsVerification(false);

    // Frontend validation — mirrors backend, never log credentials
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login({ email: email.trim(), password });

      if (result.success) {
        const userName = result.user?.name || result.user?.email?.split('@')[0] || 'User';
        toast.success(`Welcome back, ${userName}!`, {
          duration: 3000,
          position: 'top-center',
          style: {
            background: '#10B981',
            color: '#fff',
            fontWeight: '600',
            padding: '16px',
            borderRadius: '12px',
          },
          iconTheme: { primary: '#fff', secondary: '#10B981' },
        });
        setTimeout(() => navigate('/'), 1000);

      } else {
        // Structured error from useAuth — parse by code/status
        handleLoginError(result);
      }

    } catch (err) {
      // Unexpected / network errors
      setError('Something went wrong. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Centralised error handler ──────────────────────────────────────────────
  const handleLoginError = (result) => {
    const status   = result.status;
    const message  = result.error || 'Login failed.';
    const data     = result.data || {};

    // 423 — Account locked
    if (status === 423) {
      setLockoutInfo({ lockedUntil: data.lockedUntil });
      setError(message);
      toast.error('Account temporarily locked.', {
        duration: 5000,
        position: 'top-center',
        style: { background: '#EF4444', color: '#fff', fontWeight: '600', padding: '16px', borderRadius: '12px' },
      });
      return;
    }

    // 403 — Email not verified
    if (status === 403 && data.requiresEmailVerification) {
      setNeedsVerification(true);
      setError('Please verify your email address before logging in.');
      toast.error('Email not verified.', {
        duration: 4000,
        position: 'top-center',
        style: { background: '#F59E0B', color: '#fff', fontWeight: '600', padding: '16px', borderRadius: '12px' },
      });
      return;
    }

    // 403 — Suspended
    if (status === 403) {
      setError(message);
      toast.error(message, {
        duration: 5000,
        position: 'top-center',
        style: { background: '#EF4444', color: '#fff', fontWeight: '600', padding: '16px', borderRadius: '12px' },
      });
      return;
    }

    // 401 — Wrong credentials (may include attempts warning)
    if (data.warning) {
      setWarning(data.warning);
    }
    setError('Invalid email or password.');
    toast.error('Invalid email or password.', {
      duration: 3000,
      position: 'top-center',
      style: { background: '#EF4444', color: '#fff', fontWeight: '600', padding: '16px', borderRadius: '12px' },
    });
  };

  // ── Resend verification email ──────────────────────────────────────────────
  const handleGoToVerification = () => {
    navigate('/verification-pending', { state: { email: email.trim() } });
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex justify-center items-center min-h-[80vh] bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-2xl rounded-2xl px-6 sm:px-8 py-8 sm:py-10 border border-gray-100"
          // Prevent browser from autofilling passwords into wrong fields
          autoComplete="on"
        >

          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Welcome Back</h2>
            <p className="text-gray-600 text-xs sm:text-sm">Sign in to continue to RideShare</p>
          </div>

          {/* ── Error / Status Banners ─────────────────────────────────── */}

          {/* Lockout banner */}
          {lockoutInfo && getLockoutMinutes() > 0 && (
            <div className="bg-orange-50 border border-orange-300 text-orange-800 px-4 py-3 rounded-lg mb-5 flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
              </svg>
              <div>
                <p className="text-sm font-semibold">Account temporarily locked</p>
                <p className="text-xs mt-0.5">
                  Too many failed attempts. Try again in approximately {getLockoutMinutes()} minute{getLockoutMinutes() !== 1 ? 's' : ''}.
                </p>
              </div>
            </div>
          )}

          {/* Attempts warning (close to lockout) */}
          {warning && !lockoutInfo && (
            <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-lg mb-5 flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <p className="text-sm font-medium">{warning}</p>
            </div>
          )}

          {/* Generic error */}
          {error && !lockoutInfo && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
              </svg>
              <span className="text-xs sm:text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Email-not-verified inline action (replaces window.confirm) */}
          {needsVerification && (
            <div className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg mb-5">
              <p className="text-sm font-semibold mb-2">Email not verified</p>
              <p className="text-xs mb-3">
                You need to verify your email address before you can log in.
              </p>
              <button
                type="button"
                onClick={handleGoToVerification}
                className="text-xs font-semibold bg-amber-600 text-white px-3 py-1.5 rounded-md hover:bg-amber-700 transition-colors duration-200"
              >
                Resend verification email →
              </button>
            </div>
          )}

          {/* ── Email ───────────────────────────────────────────────────── */}
          <div className="mb-4 sm:mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/>
                </svg>
              </div>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none text-sm sm:text-base disabled:bg-gray-50 disabled:cursor-not-allowed"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
          </div>

          {/* ── Password ─────────────────────────────────────────────────── */}
          <div className="mb-5 sm:mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 pl-9 sm:pl-10 pr-10 sm:pr-12 py-2.5 sm:py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none text-sm sm:text-base disabled:bg-gray-50 disabled:cursor-not-allowed"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                disabled={isLoading}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="text-right mb-5 sm:mb-6">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors duration-200"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 sm:py-3.5 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-600 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none flex items-center justify-center gap-2 text-sm sm:text-base"
            disabled={isLoading || (lockoutInfo && getLockoutMinutes() > 0)}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                <span>Signing in...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Divider */}
          <div className="relative my-5 sm:my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"/>
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className="px-4 bg-white text-gray-500">Don't have an account?</span>
            </div>
          </div>

          {/* Sign Up */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="text-blue-600 hover:text-blue-700 font-semibold text-sm sm:text-base hover:underline transition-colors duration-200"
              disabled={isLoading}
            >
              Create an account
            </button>
          </div>
        </form>

        <p className="text-center mt-4 sm:mt-6 text-xs sm:text-sm text-gray-600">
          By signing in, you agree to our{' '}
          <button onClick={() => navigate('/terms')} className="text-blue-600 hover:underline">
            Terms of Service &amp; Privacy Policy
          </button>.
        </p>
      </div>
    </div>
  );
}

export default Login;