import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { forgotPasswordSendOtp, verifyResetOtp, resetPassword } from '../../services/authService';
import OtpInput from '../../components/common/OtpInput';

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

const STEPS = { EMAIL: 1, OTP: 2, RESET: 3 };
const RESEND_COOLDOWN = 60;

function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const passwordStrength = getPasswordStrength(newPassword);
  const passwordsMatch = confirmPassword && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword && newPassword !== confirmPassword;

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const toastStyle = (bg) => ({
    duration: 4000,
    position: 'top-center',
    style: { background: bg, color: '#fff', fontWeight: '600', padding: '14px 18px', borderRadius: '12px' },
  });

  // ── Step 1: request OTP ──
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await forgotPasswordSendOtp(email);
      toast.success('Verification code sent to your email!', { ...toastStyle('#10B981'), iconTheme: { primary: '#fff', secondary: '#10B981' } });
      setStep(STEPS.OTP);
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      const msg = err.message || 'No account found with this email.';
      setError(msg);
      toast.error(msg, toastStyle('#EF4444'));
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: verify OTP ──
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) {
      setError('Enter the full 6-digit code');
      return;
    }
    setIsLoading(true);
    try {
      await verifyResetOtp(email, otp);
      toast.success('Code verified successfully!', toastStyle('#10B981'));
      setStep(STEPS.RESET);
    } catch (err) {
      const msg = err.message || 'Invalid verification code. Please try again.';
      setError(msg);
      toast.error(msg, toastStyle('#EF4444'));
      setOtp('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setIsResending(true);
    try {
      await forgotPasswordSendOtp(email);
      toast.success('A new code has been sent to your email', toastStyle('#10B981'));
      setOtp('');
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      const msg = err.message || 'Failed to resend code. Please try again.';
      toast.error(msg, toastStyle('#EF4444'));
      if (err.retryAfter) setCooldown(err.retryAfter);
    } finally {
      setIsResending(false);
    }
  };

  // ── Step 3: set new password (no OTP needed again) ──
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }

    setIsLoading(true);
    try {
      await resetPassword({ email, otp, newPassword });
      toast.success('Password reset successfully!', { ...toastStyle('#10B981'), iconTheme: { primary: '#fff', secondary: '#10B981' } });
      setTimeout(() => {
        toast('Please log in with your new password', { ...toastStyle('#3B82F6'), icon: '🔐' });
        setTimeout(() => navigate('/login'), 500);
      }, 1200);
    } catch (err) {
      const msg = err.message || 'Failed to reset password. Please try again.';
      setError(msg);
      toast.error(msg, toastStyle('#EF4444'));
    } finally {
      setIsLoading(false);
    }
  };

  const stepMeta = {
    [STEPS.EMAIL]: {
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      title: 'Forgot password?',
      subtitle: 'Enter your email to receive a verification code',
    },
    [STEPS.OTP]: {
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      title: 'Enter verification code',
      subtitle: `Sent to ${email}`,
    },
    [STEPS.RESET]: {
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      title: 'Set a new password',
      subtitle: 'Choose a strong password for your account',
    },
  }[step];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-6 sm:py-10 lg:py-14 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/60 border border-gray-100 overflow-hidden">

          {/* Header */}
          <div className="px-6 sm:px-8 pt-8 sm:pt-9 pb-5 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 mb-4">
              {stepMeta.icon}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{stepMeta.title}</h2>
            <p className="text-sm text-gray-500 mt-1.5 break-all">{stepMeta.subtitle}</p>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-1.5 mt-4">
              {[STEPS.EMAIL, STEPS.OTP, STEPS.RESET].map((s) => (
                <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-6 bg-blue-600' : s < step ? 'w-1.5 bg-blue-300' : 'w-1.5 bg-gray-200'}`} />
              ))}
            </div>
          </div>

          {/* Error banner (shared) */}
          {error && (
            <div className="mx-6 sm:mx-8 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {/* ── STEP 1: Email ── */}
          {step === STEPS.EMAIL && (
            <form onSubmit={handleSendOtp} className="px-6 sm:px-8 py-6 sm:py-7 space-y-4">
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
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-200 pl-9 pr-4 py-2.5 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150 outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

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
                    Sending code…
                  </>
                ) : (
                  <>
                    Send verification code
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                disabled={isLoading}
                className="w-full text-center text-xs text-gray-400 hover:text-blue-600 transition-colors duration-150"
              >
                Back to sign in
              </button>
            </form>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === STEPS.OTP && (
            <form onSubmit={handleVerifyOtp} className="px-6 sm:px-8 py-6 sm:py-7 space-y-5">
              <OtpInput value={otp} onChange={setOtp} disabled={isLoading} error={Boolean(error)} />

              <div className="text-center">
                {cooldown > 0 ? (
                  <p className="text-xs text-gray-400">
                    Didn't get it? Resend in <span className="font-semibold text-gray-600">{cooldown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isResending}
                    className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
                  >
                    {isResending ? 'Sending new code…' : "Didn't get it? Resend code"}
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white py-3 rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isLoading ? 'Verifying…' : 'Verify code'}
              </button>

              <button
                type="button"
                onClick={() => { setStep(STEPS.EMAIL); setError(''); setOtp(''); }}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-1.5 border border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-50"
              >
                Use a different email
              </button>
            </form>
          )}

          {/* ── STEP 3: New password ── */}
          {step === STEPS.RESET && (
            <form onSubmit={handleResetPassword} className="px-6 sm:px-8 py-6 sm:py-7 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-gray-200 pl-9 pr-9 py-2.5 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150 outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                    required
                    disabled={isLoading}
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={isLoading}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
                {newPassword && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="flex gap-0.5 flex-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= passwordStrength.strength ? passwordStrength.color : 'bg-gray-200'}`} />
                      ))}
                    </div>
                    <span className={`text-[10px] font-semibold flex-shrink-0 ${
                      passwordStrength.label === 'Weak' ? 'text-red-500' :
                      passwordStrength.label === 'Fair' ? 'text-yellow-600' :
                      passwordStrength.label === 'Good' ? 'text-blue-600' : 'text-green-600'
                    }`}>{passwordStrength.label}</span>
                  </div>
                )}
              </div>

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
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full border pl-9 pr-9 py-2.5 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:border-transparent transition-all duration-150 outline-none disabled:bg-gray-50 disabled:cursor-not-allowed ${
                      passwordsMismatch ? 'border-red-300 focus:ring-red-400 bg-red-50/30' :
                      passwordsMatch ? 'border-green-300 focus:ring-green-400 bg-green-50/30' :
                      'border-gray-200 focus:ring-blue-500'
                    }`}
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
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
                    Resetting password…
                  </>
                ) : (
                  'Reset password'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;