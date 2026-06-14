import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { resendVerificationEmail } from '../../services/authService';
import toast from 'react-hot-toast';

function VerificationPending() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [cooldownTimer, setCooldownTimer] = useState(0);

  useEffect(() => {
    // Get email from state or localStorage
    const emailFromState = location.state?.email;
    const emailFromStorage = localStorage.getItem('pendingVerificationEmail');
    const emailToUse = emailFromState || emailFromStorage;

    if (emailToUse) {
      setEmail(emailToUse);
      localStorage.setItem('pendingVerificationEmail', emailToUse);
    } else {
      // Redirect to signup if no email
      navigate('/signup');
    }
  }, [navigate, location]);

  // Countdown timer for resend
  useEffect(() => {
    let interval;
    if (cooldownTimer > 0) {
      interval = setInterval(() => {
        setCooldownTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldownTimer]);

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      const response = await resendVerificationEmail(email);
      
      if (response && response.emailBypassed) {
        toast.success('Email auto-verified for demo! You can log in now.', {
          duration: 5000,
          position: 'top-center',
          icon: '🚀',
          style: {
            background: '#10B981',
            color: '#fff',
            fontWeight: '600',
            padding: '16px',
            borderRadius: '12px',
          },
        });
        
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        toast.success('Verification email sent! Please check your inbox.', {
          duration: 4000,
          position: 'top-center',
          style: {
            background: '#10B981',
            color: '#fff',
            fontWeight: '600',
            padding: '16px',
            borderRadius: '12px',
          },
        });

        // Set 60-second cooldown
        setCooldownTimer(60);
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to resend email. Please try again.';
      toast.error(errorMessage, {
        duration: 4000,
        position: 'top-center',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
      });

      // Handle rate limiting
      if (err.retryAfter) {
        setCooldownTimer(err.retryAfter * 60);
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleChangeEmail = () => {
    localStorage.removeItem('pendingVerificationEmail');
    navigate('/signup');
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-green-50 to-green-100 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-2xl rounded-2xl px-6 sm:px-8 py-8 sm:py-10 border border-gray-100 text-center">
          
          {/* Illustration */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          {/* Header */}
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3">
            Verify Your Email
          </h2>
          <p className="text-gray-600 text-sm sm:text-base mb-6">
            We've sent a verification link to
          </p>
          
          {/* Email Display */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg px-4 py-3 mb-6">
            <p className="text-blue-900 font-semibold text-sm sm:text-base break-all">
              {email || 'your email'}
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 text-left rounded">
            <h3 className="font-semibold text-green-900 mb-2">Next Steps:</h3>
            <ol className="text-green-800 text-sm space-y-2">
              <li>1. Check your email inbox for the verification link</li>
              <li>2. Click the link to verify your email address</li>
              <li>3. Return here or go to login to proceed</li>
            </ol>
          </div>

          {/* Spam Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 text-left">
            <p className="text-yellow-800 text-xs sm:text-sm">
              <strong>💡 Tip:</strong> If you don't see the email, check your spam or junk folder.
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            {/* Resend Button */}
            <button
              onClick={handleResendEmail}
              disabled={isResending || cooldownTimer > 0}
              className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-600 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none flex items-center justify-center gap-2"
            >
              {isResending ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Sending...</span>
                </>
              ) : cooldownTimer > 0 ? (
                <span>Resend in {cooldownTimer}s</span>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Resend Verification Email</span>
                </>
              )}
            </button>

            {/* Change Email Button */}
            <button
              onClick={handleChangeEmail}
              className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-200"
            >
              Change Email Address
            </button>

            {/* Login Button */}
            <button
              onClick={() => navigate('/login')}
              className="w-full text-green-600 hover:text-green-700 font-semibold py-3 hover:underline transition-colors duration-200"
            >
              Back to Login
            </button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-gray-500 mt-6">
            The verification link will expire in 24 hours. Make sure to verify your email within this timeframe.
          </p>
        </div>
      </div>
    </div>
  );
}

export default VerificationPending;
