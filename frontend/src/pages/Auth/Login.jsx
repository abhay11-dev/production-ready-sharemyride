import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import toast from 'react-hot-toast';

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

/* ── Shared modal shell: consistent across lockout + suspension states ── */
function StatusModal({ tone, icon, title, children, onClose, footer }) {
  const tones = {
    red: { ring: 'bg-red-50', iconColor: 'text-red-600' },
    orange: { ring: 'bg-orange-50', iconColor: 'text-orange-600' },
  };
  const t = tones[tone] || tones.red;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden">
        <div className="px-6 sm:px-8 pt-8 pb-6 text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 ${t.ring} rounded-full mb-4`}>
            <span className={t.iconColor}>{icon}</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
          {children}
        </div>
        <div className="px-6 sm:px-8 pb-7">
          {footer}
        </div>
      </div>
    </div>
  );
}

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [lockoutInfo, setLockoutInfo] = useState(null);
  const [lockoutModalOpen, setLockoutModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [suspensionModal, setSuspensionModal] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const getLockoutMinutes = () => {
    if (!lockoutInfo?.lockedUntil) return 0;
    return Math.max(0, Math.ceil((new Date(lockoutInfo.lockedUntil) - Date.now()) / 1000 / 60));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setWarning(''); setNeedsVerification(false);
    if (!email.trim()) { setError('Email is required.'); return; }
    if (!password) { setError('Password is required.'); return; }

    setIsLoading(true);
    try {
      const result = await login({ email: email.trim(), password });
      if (result.success) {
        const userName = result.user?.name || result.user?.email?.split('@')[0] || 'User';
        toast.success(`Welcome back, ${userName}!`, {
          duration: 3000, position: 'top-center',
          style: { background: '#10B981', color: '#fff', fontWeight: '600', padding: '14px 18px', borderRadius: '12px' },
          iconTheme: { primary: '#fff', secondary: '#10B981' },
        });
        setTimeout(() => navigate('/'), 1000);
      } else {
        handleLoginError(result);
      }
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginError = (result) => {
    const status = result.status;
    const message = result.error || 'Login failed.';
    const data = result.data || {};

    if (status === 423) {
      setLockoutInfo({ lockedUntil: data.lockedUntil });
      setLockoutModalOpen(true);
      setError(message);
      toast.error('Account temporarily locked.', {
        duration: 5000, position: 'top-center',
        style: { background: '#EF4444', color: '#fff', fontWeight: '600', padding: '14px 18px', borderRadius: '12px' },
      });
      return;
    }
    if (status === 403 && data.requiresEmailVerification) {
      setNeedsVerification(true);
      setError('Please verify your email address before logging in.');
      toast.error('Email not verified.', {
        duration: 4000, position: 'top-center',
        style: { background: '#F59E0B', color: '#fff', fontWeight: '600', padding: '14px 18px', borderRadius: '12px' },
      });
      return;
    }
    if (status === 403 && message.toLowerCase().includes('suspended')) {
      setSuspensionModal({ reason: data.suspensionReason || 'Violation of platform policies. Contact support for details.' });
      return;
    }
    if (status === 403) {
      setError(message);
      toast.error(message, {
        duration: 5000, position: 'top-center',
        style: { background: '#EF4444', color: '#fff', fontWeight: '600', padding: '14px 18px', borderRadius: '12px' },
      });
      return;
    }
    if (data.warning) setWarning(data.warning);
    setError('Invalid email or password.');
    toast.error('Invalid email or password.', {
      duration: 3000, position: 'top-center',
      style: { background: '#EF4444', color: '#fff', fontWeight: '600', padding: '14px 18px', borderRadius: '12px' },
    });
  };

  const lockoutMinutes = getLockoutMinutes();

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-6 sm:py-10 lg:py-14 px-4 sm:px-6 lg:px-8">

      {/* ── Locked account modal ── */}
      {lockoutModalOpen && lockoutMinutes > 0 && (
        <StatusModal
          tone="orange"
          onClose={() => setLockoutModalOpen(false)}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
          title="Account temporarily locked"
          footer={
            <div className="space-y-3">
              <button
                onClick={() => setLockoutModalOpen(false)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white py-3 rounded-xl text-sm font-bold shadow-md shadow-orange-600/20 hover:shadow-lg transition-all duration-150"
              >
                Got it
              </button>
              <p className="text-center text-xs text-gray-400">
                Need access sooner?{' '}
                <button
                  onClick={() => { setLockoutModalOpen(false); navigate('/forgot-password'); }}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Reset your password
                </button>
              </p>
            </div>
          }
        >
          <p className="text-sm text-gray-600 mb-4">
            Too many failed sign-in attempts were made on this account. For your security, sign-in has been paused for a short while.
          </p>
          <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-semibold text-orange-800">
              Try again in ~{lockoutMinutes} minute{lockoutMinutes !== 1 ? 's' : ''}
            </span>
          </div>
        </StatusModal>
      )}

      {/* ── Suspended account modal ── */}
      {suspensionModal && (
        <StatusModal
          tone="red"
          onClose={() => setSuspensionModal(null)}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          title="Account suspended"
          footer={
            <div className="space-y-3">
              <button
                onClick={() => setSuspensionModal(null)}
                className="w-full flex items-center justify-center gap-1.5 border border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
              >
                Close
              </button>
              <p className="text-center text-xs text-gray-400">
                Believe this is a mistake?{' '}
                <a href="mailto:sharemyride.contact@gmail.com" className="text-blue-600 hover:underline font-medium">
                  Contact support
                </a>
              </p>
            </div>
          }
        >
          <p className="text-sm text-gray-600 mb-4">
            This account can't sign in right now. It was suspended for the reason below.
          </p>
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-left">
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Reason</p>
            <p className="text-sm text-red-800 font-medium">{suspensionModal.reason}</p>
          </div>
        </StatusModal>
      )}

      <div className="w-full max-w-5xl">

        {/* Two-col on lg, single col below */}
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
              Good to have<br />
              <span className="text-blue-600">you back.</span>
            </h1>
            <p className="text-gray-500 text-base leading-relaxed mb-10 max-w-sm">
              Sign in to view your rides, manage bookings, and connect with your community.
            </p>

            {/* Value props */}
            <div className="space-y-4">
              {[
                {
                  icon: (
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  ),
                  title: 'Your bookings, at a glance',
                  desc: 'Track upcoming trips and past rides in one place.',
                },
                {
                  icon: (
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                  ),
                  title: 'Connect with drivers',
                  desc: 'Message verified drivers and coordinate instantly.',
                },
                {
                  icon: (
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  title: 'Real-time ride updates',
                  desc: 'Get notified the moment a driver accepts your request.',
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
            <div className="flex items-center justify-center gap-2 mb-5 lg:hidden">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
              </div>
              <span className="text-sm font-bold text-gray-900">ShareMyRide</span>
            </div>

            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/60 border border-gray-100 overflow-hidden">

              {/* Card header */}
              <div className="px-6 sm:px-8 pt-6 sm:pt-7 pb-5 border-b border-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Welcome back</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Sign in to your account</p>
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
              <form onSubmit={handleSubmit} autoComplete="on" className="px-6 sm:px-8 py-6 sm:py-7 space-y-4">

                {/* Attempts warning */}
                {warning && !lockoutInfo && (
                  <div className="flex items-start gap-2.5 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm font-medium">{warning}</p>
                  </div>
                )}

                {/* Generic error */}
                {error && !lockoutInfo && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                )}

                {/* Lockout inline reminder (modal already shown on trigger) */}
                {lockoutInfo && lockoutMinutes > 0 && !lockoutModalOpen && (
                  <button
                    type="button"
                    onClick={() => setLockoutModalOpen(true)}
                    className="w-full flex items-center gap-2.5 bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-xl text-left hover:bg-orange-100 transition-colors"
                  >
                    <svg className="w-4 h-4 flex-shrink-0 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-semibold">Account locked — try again in ~{lockoutMinutes} min. Tap for details.</span>
                  </button>
                )}

                {/* Needs verification */}
                {needsVerification && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl">
                    <p className="text-sm font-semibold mb-1">Email not verified</p>
                    <p className="text-xs text-amber-700 mb-3">Verify your email address to continue.</p>
                    <button
                      type="button"
                      onClick={() => navigate('/verification-pending', { state: { email: email.trim() } })}
                      className="text-xs font-semibold bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      Resend verification email →
                    </button>
                  </div>
                )}

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

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-semibold text-gray-700">Password</label>
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-xs text-blue-600 hover:text-blue-700 hover:underline transition-colors font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full border border-gray-200 pl-9 pr-9 py-2.5 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150 outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                      required
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      disabled={isLoading}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                </div>

                {/* CTA */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isLoading || (lockoutInfo && lockoutMinutes > 0)}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white py-3 rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Signing in…
                      </>
                    ) : (
                      <>
                        Sign in
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-gray-400 mt-3 leading-relaxed">
                    By signing in, you agree to our{' '}
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
                    <span className="px-3 bg-white text-xs text-gray-400">Don't have an account?</span>
                  </div>
                </div>

                {/* Sign up */}
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-1.5 border border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-50"
                >
                  Create a free account
                </button>

              </form>
            </div>

            {/* Trust chips */}
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

export default Login;