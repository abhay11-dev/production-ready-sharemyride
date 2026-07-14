import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signupUser } from '../../services/authService';
import { useAuth } from '../../hooks/useAuth';
import toast from '../../services/toastService';
import { useGoogleLogin } from '@react-oauth/google';

function getPasswordStrength(pwd) {
  if (!pwd) return { strength: 0, label: '', color: '' };
  let s = 0;
  if (pwd.length >= 6) s++;
  if (pwd.length >= 8) s++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
  if (/\d/.test(pwd)) s++;
  if (/[^a-zA-Z0-9]/.test(pwd)) s++;
  if (s <= 2) return { strength: s, label: 'Weak', color: 'bg-red-500' };
  if (s <= 3) return { strength: s, label: 'Fair', color: 'bg-yellow-500' };
  if (s <= 4) return { strength: s, label: 'Good', color: 'bg-blue-500' };
  return { strength: s, label: 'Strong', color: 'bg-green-500' };
}

function EyeIcon({ open }) {
  return open ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function Signup() {
  const navigate = useNavigate();
  const { signup, loginWithGoogle } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword && password === confirmPassword;
  const passwordsMismatch = confirmPassword && password !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setIsLoading(true);
    try {
      const userData = await signupUser({ name, email, password });
      toast.success('Account created successfully!', {
        duration: 4000, position: 'top-center',
        style: { background: '#10B981', color: '#fff', fontWeight: '600', padding: '14px 18px', borderRadius: '12px' },
        iconTheme: { primary: '#fff', secondary: '#10B981' },
      });
      localStorage.setItem('pendingVerificationEmail', email);
      const isPending = userData.verificationPending !== false;
      setTimeout(() => {
        if (isPending) {
          toast('Please check your email to verify your account', {
            duration: 3000, position: 'top-center', icon: '📧',
            style: { background: '#3B82F6', color: '#fff', fontWeight: '600', padding: '14px 18px', borderRadius: '12px' },
          });
          setTimeout(() => navigate('/verification-pending', { state: { email } }), 500);
        } else {
          toast('Email auto-verified for demo! You can log in now.', {
            duration: 4000, position: 'top-center', icon: '🚀',
            style: { background: '#10B981', color: '#fff', fontWeight: '600', padding: '14px 18px', borderRadius: '12px' },
          });
          setTimeout(() => navigate('/login'), 500);
        }
      }, 1500);
    } catch (err) {
      const msg = err.message || 'Signup failed. Please try again.';
      setError(msg);
      toast.error(msg, {
        duration: 4000, position: 'top-center',
        style: { background: '#EF4444', color: '#fff', fontWeight: '600', padding: '14px 18px', borderRadius: '12px' },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const googleSignupHandler = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        const result = await loginWithGoogle(tokenResponse.access_token);
        if (result.success) {
          const userName = result.user?.name || result.user?.email?.split('@')[0] || 'User';
          toast.success(`Welcome, ${userName}!`, {
            duration: 1500, position: 'top-center',
            style: { background: '#10B981', color: '#fff', fontWeight: '600', padding: '14px 18px', borderRadius: '12px' },
            iconTheme: { primary: '#fff', secondary: '#10B981' },
          });
          setTimeout(() => navigate('/'), 800);
        } else {
          toast.error(result.error || 'Google Signup failed');
        }
      } catch {
        setError('Something went wrong during Google Signup.');
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      toast.error('Google Signup failed');
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-6 sm:py-10 lg:py-14 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl">

        {/* ── Two-col on lg, single-col on mobile ── */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 lg:items-center">

          {/* ── LEFT: branding panel (desktop only) ── */}
          <div className="hidden lg:flex flex-col justify-center">
            {/* Brand mark */}
            <div className="inline-flex items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
              </div>
              <span className="text-base font-bold text-gray-900">ShareMyRide</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
              Share the road,<br />
              <span className="text-blue-600">split the cost.</span>
            </h1>
            <p className="text-gray-500 text-base leading-relaxed mb-10 max-w-sm">
              Connect with verified drivers going your way. Join a community that saves money and reduces traffic across India.
            </p>

            {/* Value props */}
            <div className="space-y-4">
              {[
                {
                  icon: (
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ),
                  title: 'Verified drivers',
                  desc: 'Every driver submits ID, licence & vehicle docs.',
                },
                {
                  icon: (
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  title: 'Fair cost-sharing',
                  desc: 'Pay a fraction of what a solo trip would cost.',
                },
                {
                  icon: (
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ),
                  title: 'Instant booking',
                  desc: 'Request a seat and get confirmed in minutes.',
                },
              ].map(v => (
                <div key={v.title} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {v.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{v.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{v.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Community note */}
            <div className="mt-10 flex items-center gap-3 pt-8 border-t border-gray-100">
              <div className="flex -space-x-2">
                {['bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-amber-400'].map((c, i) => (
                  <div key={i} className={`w-7 h-7 rounded-full ${c} border-2 border-white flex items-center justify-center text-white text-[10px] font-bold`}>
                    {['A', 'R', 'P', 'S'][i]}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 leading-snug">
                Trusted by thousands of commuters<br />across India every day
              </p>
            </div>
          </div>

          {/* ── RIGHT: form card ── */}
          <div className="w-full">

            {/* Mobile-only brand pill */}
        

            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/60 border border-gray-100 overflow-hidden">

              {/* Card header */}
              <div className="px-6 sm:px-8 pt-6 sm:pt-7 pb-5 border-b border-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Create your account</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Get started in under a minute</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full font-semibold flex-shrink-0">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                    </svg>
                    Secure
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="px-6 sm:px-8 py-6 sm:py-7 space-y-4">

                {/* Error banner */}
                {error && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                )}

                {/* Full name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full border border-gray-200 pl-9 pr-4 py-2.5 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150 outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                      required
                      disabled={isLoading}
                      autoComplete="name"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full border border-gray-200 pl-9 pr-4 py-2.5 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150 outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                      required
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password row — side by side on sm+ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min. 6 characters"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full border border-gray-200 pl-9 pr-9 py-2.5 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150 outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                        required
                        disabled={isLoading}
                        minLength={6}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        disabled={isLoading}
                        tabIndex={-1}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <EyeIcon open={showPassword} />
                      </button>
                    </div>
                    {/* Strength pills */}
                    {password && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="flex gap-0.5 flex-1">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= passwordStrength.strength ? passwordStrength.color : 'bg-gray-200'}`} />
                          ))}
                        </div>
                        <span className={`text-[10px] font-semibold flex-shrink-0 ${passwordStrength.label === 'Weak' ? 'text-red-500' :
                            passwordStrength.label === 'Fair' ? 'text-yellow-600' :
                              passwordStrength.label === 'Good' ? 'text-blue-600' : 'text-green-600'
                          }`}>{passwordStrength.label}</span>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className={`w-full border pl-9 pr-9 py-2.5 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:border-transparent transition-all duration-150 outline-none disabled:bg-gray-50 disabled:cursor-not-allowed ${passwordsMismatch ? 'border-red-300 focus:ring-red-400 bg-red-50/30' :
                            passwordsMatch ? 'border-green-300 focus:ring-green-400 bg-green-50/30' :
                              'border-gray-200 focus:ring-blue-500'
                          }`}
                        required
                        disabled={isLoading}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(v => !v)}
                        disabled={isLoading}
                        tabIndex={-1}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <EyeIcon open={showConfirmPassword} />
                      </button>
                    </div>
                    {passwordsMismatch && (
                      <p className="flex items-center gap-1 text-[10px] text-red-600 mt-1.5">
                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        Passwords do not match
                      </p>
                    )}
                    {passwordsMatch && (
                      <p className="flex items-center gap-1 text-[10px] text-green-600 mt-1.5">
                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM13.707 9.293a1 1 0 00-1.414-1.414L9 11.172 7.707 9.879a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Passwords match
                      </p>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white py-3 rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating your account…
                      </>
                    ) : (
                      <>
                        Create free account
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-gray-400 mt-3 leading-relaxed">
                    By joining, you agree to our{' '}
                    <button type="button" onClick={() => navigate('/terms')} className="text-blue-600 hover:underline font-medium">Terms of Service</button>
                    {' '}&amp;{' '}
                    <button type="button" onClick={() => navigate('/terms')} className="text-blue-600 hover:underline font-medium">Privacy Policy</button>
                  </p>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-white text-xs text-gray-400">Or continue with</span>
                  </div>
                </div>

                {/* Google Login */}
                <button
                  type="button"
                  onClick={() => googleSignupHandler()}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all duration-150 shadow-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-white text-xs text-gray-400">Already a member?</span>
                  </div>
                </div>

                {/* Sign in */}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-1.5 border border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-50"
                >
                  Sign in instead
                </button>

              </form>
            </div>

            {/* Trust chips — below card, mobile + desktop */}
            <div className="mt-4 flex flex-wrap items-center gap-2 justify-center">
              {[
                { icon: '🛡️', text: 'Verified drivers' },
                { icon: '💸', text: 'Cost-sharing' },
                { icon: '⭐', text: 'Rated community' },
                { icon: '⚡', text: 'Instant booking' },
              ].map(b => (
                <span key={b.text} className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-white border border-gray-100 px-3 py-1.5 rounded-full">
                  {b.icon} {b.text}
                </span>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;