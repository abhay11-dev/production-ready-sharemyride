import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifySignupOtp, resendSignupOtp } from '../../services/authService';
import OtpInput from '../../components/common/OtpInput';
import toast from '../../services/toastService';

const RESEND_COOLDOWN = 60;

function VerificationPending() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const hasAutoSent = useRef(true); // OTP is already sent by the signup call itself

  useEffect(() => {
    const emailFromState = location.state?.email;
    const nameFromState = location.state?.name;
    const emailFromStorage = localStorage.getItem('pendingVerificationEmail');
    const emailToUse = emailFromState || emailFromStorage;

    if (emailToUse) {
      setEmail(emailToUse);
      setName(nameFromState || '');
      localStorage.setItem('pendingVerificationEmail', emailToUse);
    } else {
      navigate('/signup');
    }
  }, [navigate, location]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const toastStyle = (bg) => ({
    duration: 4000,
    position: 'top-center',
    style: { background: bg, color: '#fff', fontWeight: '600', padding: '14px 18px', borderRadius: '12px' },
  });

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    if (otp.length !== 6) {
      setError('Enter the full 6-digit code');
      return;
    }

    setIsVerifying(true);
    try {
      await verifySignupOtp(email, otp);
      toast.success('Email verified successfully!', { ...toastStyle('#10B981'), iconTheme: { primary: '#fff', secondary: '#10B981' } });
      localStorage.removeItem('pendingVerificationEmail');
      setTimeout(() => {
        navigate('/login', { state: { message: 'Email verified! You can now log in.', email } });
      }, 500);
    } catch (err) {
      const msg = err.message || 'Invalid or expired code. Please try again.';
      setError(msg);
      toast.error(msg, toastStyle('#EF4444'));
      setOtp('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setIsResending(true);
    try {
      await resendSignupOtp(email);
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

  const handleChangeEmail = () => {
    localStorage.removeItem('pendingVerificationEmail');
    navigate('/signup');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-6 sm:py-10 lg:py-14 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/60 border border-gray-100 overflow-hidden">

          {/* Card header */}
          <div className="px-6 sm:px-8 pt-8 sm:pt-9 pb-5 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Verify your email</h2>
            <p className="text-sm text-gray-500 mt-1.5">
              Enter the 6-digit code sent to
            </p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5 break-all">{email || 'your email'}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleVerify} className="px-6 sm:px-8 pb-7 space-y-5">

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            <div>
              <OtpInput value={otp} onChange={setOtp} disabled={isVerifying} error={Boolean(error)} />
            </div>

            {/* Resend row */}
            <div className="text-center">
              {cooldown > 0 ? (
                <p className="text-xs text-gray-400">
                  Didn't get it? Resend in <span className="font-semibold text-gray-600">{cooldown}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
                >
                  {isResending ? 'Sending new code…' : "Didn't get it? Resend code"}
                </button>
              )}
            </div>

            {/* CTA */}
            <button
              type="submit"
              disabled={isVerifying || otp.length !== 6}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white py-3 rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isVerifying ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying…
                </>
              ) : (
                <>
                  Verify account
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100" />
              </div>
            </div>

            <button
              type="button"
              onClick={handleChangeEmail}
              disabled={isVerifying}
              className="w-full flex items-center justify-center gap-1.5 border border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-50"
            >
              Use a different email
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              disabled={isVerifying}
              className="w-full text-center text-xs text-gray-400 hover:text-blue-600 transition-colors duration-150"
            >
              Back to sign in
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          The code expires in a few minutes — check your spam folder if you don't see it.
        </p>
      </div>
    </div>
  );
}

export default VerificationPending;