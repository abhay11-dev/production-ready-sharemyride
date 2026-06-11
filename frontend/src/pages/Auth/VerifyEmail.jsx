import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../../services/authService';
import toast from 'react-hot-toast';

function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmailToken = async () => {
      try {
        const token = searchParams.get('token');
        const email = searchParams.get('email');

        if (!token || !email) {
          setStatus('error');
          setMessage('Invalid verification link. Missing token or email.');
          return;
        }

        // Call the verification API
        const response = await verifyEmail(token, email);

        setStatus('success');
        setMessage(response.message || 'Email verified successfully!');

        // Show success toast
        toast.success('✅ Email verified successfully!', {
          duration: 3000,
          position: 'top-center',
          style: {
            background: '#10B981',
            color: '#fff',
            fontWeight: '600',
            padding: '16px',
            borderRadius: '12px',
          },
        });

        // Redirect to login after 2 seconds
        setTimeout(() => {
          localStorage.removeItem('pendingVerificationEmail');
          navigate('/login', {
            state: { 
              message: 'Email verified! You can now log in.',
              email: email
            }
          });
        }, 2000);
      } catch (err) {
        setStatus('error');
        setMessage(err.message || 'Failed to verify email. Please try again or resend the verification email.');

        // Show error toast
        toast.error(err.message || 'Email verification failed', {
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
      } finally {
        setLoading(false);
      }
    };

    verifyEmailToken();
  }, [searchParams, navigate]);

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const handleResendEmail = () => {
    const email = searchParams.get('email');
    if (email) {
      navigate('/verification-pending', {
        state: { email }
      });
    } else {
      navigate('/signup');
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-green-50 to-green-100 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-2xl rounded-2xl px-6 sm:px-8 py-8 sm:py-10 border border-gray-100 text-center">
          
          {loading ? (
            <>
              {/* Loading State */}
              <div className="mb-6">
                <svg className="animate-spin h-16 w-16 text-green-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3">
                Verifying Your Email
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">
                Please wait while we verify your email address...
              </p>
            </>
          ) : status === 'success' ? (
            <>
              {/* Success State */}
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-green-600 mb-3">
                ✅ Email Verified!
              </h2>
              <p className="text-gray-600 text-sm sm:text-base mb-6">
                {message}
              </p>
              <p className="text-gray-500 text-xs sm:text-sm mb-6">
                Redirecting you to login...
              </p>
              <button
                onClick={handleBackToLogin}
                className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-600 transition-all duration-200"
              >
                Go to Login Now
              </button>
            </>
          ) : (
            <>
              {/* Error State */}
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
                  <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-red-600 mb-3">
                ❌ Verification Failed
              </h2>
              <p className="text-gray-600 text-sm sm:text-base mb-6">
                {message}
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleResendEmail}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-600 transition-all duration-200"
                >
                  Resend Verification Email
                </button>
                <button
                  onClick={handleBackToLogin}
                  className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-200"
                >
                  Back to Login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
