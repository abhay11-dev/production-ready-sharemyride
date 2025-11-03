import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Use environment variable or fallback to deployed API
  const API_URL = import.meta.env.VITE_API_URL || 'https://sharemyride.onrender.com';

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (pwd.length >= 6) strength++;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    if (strength <= 2) return { strength, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 3) return { strength, label: 'Fair', color: 'bg-yellow-500' };
    if (strength <= 4) return { strength, label: 'Good', color: 'bg-blue-500' };
    return { strength, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Verification code sent to your email!', {
          duration: 4000,
          position: 'top-center',
          style: {
            background: '#10B981',
            color: '#fff',
            fontWeight: '600',
            padding: '16px',
            borderRadius: '12px',
          },
          iconTheme: {
            primary: '#fff',
            secondary: '#10B981',
          },
        });
        setStep(2);
      } else {
        toast.error(data.message || 'No account found with this email. Please register first.', {
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
      }
    } catch (error) {
      console.error('Send code error:', error);
      toast.error('Failed to send verification code. Please check your internet connection and try again.', {
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
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/verify-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Code verified successfully!', {
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
        setStep(3);
      } else {
        toast.error(data.message || 'Invalid verification code. Please try again.', {
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
      }
    } catch (error) {
      console.error('Verify code error:', error);
      toast.error('Verification failed. Please try again.', {
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
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
      });
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Password reset successfully!', {
          duration: 4000,
          position: 'top-center',
          style: {
            background: '#10B981',
            color: '#fff',
            fontWeight: '600',
            padding: '16px',
            borderRadius: '12px',
          },
          iconTheme: {
            primary: '#fff',
            secondary: '#10B981',
          },
        });

        setTimeout(() => {
          toast('Please log in with your new password', {
            duration: 3000,
            position: 'top-center',
            icon: '🔐',
            style: {
              background: '#3B82F6',
              color: '#fff',
              fontWeight: '600',
              padding: '16px',
              borderRadius: '12px',
            },
          });
          
          setTimeout(() => {
            navigate('/login');
          }, 500);
        }, 1500);
      } else {
        toast.error(data.message || 'Failed to reset password. Please try again.', {
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
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('Failed to reset password. Please try again.', {
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
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] bg-gradient-to-br from-purple-50 to-purple-100 px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        {step === 1 && (
          <form onSubmit={handleSendCode} className="bg-white shadow-2xl rounded-2xl px-6 sm:px-8 py-8 sm:py-10 border border-gray-100">
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Forgot Password?</h2>
              <p className="text-gray-600 text-xs sm:text-sm">Enter your email to receive a verification code</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 outline-none text-sm sm:text-base disabled:bg-gray-50 disabled:cursor-not-allowed"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white py-3 sm:py-3.5 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-600 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none flex items-center justify-center gap-2 text-sm sm:text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Sending code...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send Verification Code
                </>
              )}
            </button>

            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-purple-600 hover:text-purple-700 font-semibold text-sm hover:underline transition-colors duration-200 inline-flex items-center gap-1"
                disabled={isLoading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Login
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyCode} className="bg-white shadow-2xl rounded-2xl px-6 sm:px-8 py-8 sm:py-10 border border-gray-100">
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Verify Code</h2>
              <p className="text-gray-600 text-xs sm:text-sm">Enter the verification code sent to <span className="font-semibold">{email}</span></p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Verification Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full border border-gray-300 pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 outline-none text-sm sm:text-base disabled:bg-gray-50 disabled:cursor-not-allowed text-center tracking-widest font-semibold"
                  required
                  disabled={isLoading}
                  maxLength={6}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white py-3 sm:py-3.5 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-600 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none flex items-center justify-center gap-2 text-sm sm:text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Verifying...</span>
                </>
              ) : (
                'Verify Code'
              )}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={handleSendCode}
                className="text-sm text-gray-600 hover:text-purple-600 hover:underline transition-colors duration-200"
                disabled={isLoading}
              >
                Didn't receive code? Resend
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="bg-white shadow-2xl rounded-2xl px-6 sm:px-8 py-8 sm:py-10 border border-gray-100">
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Reset Password</h2>
              <p className="text-gray-600 text-xs sm:text-sm">Enter your new password</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-300 pl-9 sm:pl-10 pr-10 sm:pr-12 py-2.5 sm:py-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 outline-none text-sm sm:text-base disabled:bg-gray-50 disabled:cursor-not-allowed"
                  required
                  disabled={isLoading}
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              
              {newPassword && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Password strength:</span>
                    <span className={`text-xs font-semibold ${
                      passwordStrength.label === 'Weak' ? 'text-red-600' :
                      passwordStrength.label === 'Fair' ? 'text-yellow-600' :
                      passwordStrength.label === 'Good' ? 'text-blue-600' :
                      'text-green-600'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">Must be at least 6 characters</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-300 pl-9 sm:pl-10 pr-10 sm:pr-12 py-2.5 sm:py-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 outline-none text-sm sm:text-base disabled:bg-gray-50 disabled:cursor-not-allowed"
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Passwords do not match
                </p>
              )}
            </div>

            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white py-3 sm:py-3.5 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-600 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none flex items-center justify-center gap-2 text-sm sm:text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Resetting password...</span>
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;