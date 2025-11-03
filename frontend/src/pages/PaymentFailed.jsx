// src/pages/PaymentFailed.jsx
import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';

function PaymentFailed() {
  const { bookingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const errorData = location.state || {};
  const { error, errorCode, booking } = errorData;

  const handleRetryPayment = () => {
    // Navigate back to payment page with booking details
    navigate(`/payment/${bookingId}`, {
      state: { booking }
    });
  };

  const getErrorMessage = () => {
    if (error) return error;
    
    switch (errorCode) {
      case 'BAD_REQUEST_ERROR':
        return 'Invalid payment details. Please try again.';
      case 'GATEWAY_ERROR':
        return 'Payment gateway error. Please try again.';
      case 'SERVER_ERROR':
        return 'Server error. Please try again later.';
      default:
        return 'Payment failed. Please try again.';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Failure Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-red-100 rounded-full mb-4">
            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Failed
          </h1>
          <p className="text-gray-600">
            Your payment could not be processed
          </p>
        </div>

        {/* Error Details Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          {/* Error Message */}
          <div className="text-center pb-6 border-b border-gray-200">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-50 rounded-full mb-3">
              <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-gray-900 font-medium">
              {getErrorMessage()}
            </p>
          </div>

          {/* Transaction Details */}
          {(bookingId || errorCode) && (
            <div className="mt-6 space-y-3">
              {bookingId && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Booking ID</span>
                  <span className="font-mono text-sm text-gray-900">
                    {bookingId}
                  </span>
                </div>
              )}
              
              {errorCode && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Error Code</span>
                  <span className="font-mono text-sm text-red-600">
                    {errorCode}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Date & Time</span>
                <span className="text-gray-900">
                  {new Date().toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Trip Details */}
          {booking && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Booking Details</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-xs text-gray-500">Pickup</p>
                    <p className="text-sm font-medium text-gray-900">
                      {booking.pickupLocation}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-xs text-gray-500">Drop</p>
                    <p className="text-sm font-medium text-gray-900">
                      {booking.dropLocation}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-gray-600">Amount</span>
                  <span className="text-lg font-bold text-gray-900">
                    ₹{booking.totalFare?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Common Reasons */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-orange-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-orange-800">
              <p className="font-semibold mb-2">Common reasons for payment failure:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Insufficient balance in account</li>
                <li>Incorrect card details or CVV</li>
                <li>Payment limit exceeded</li>
                <li>Internet connectivity issues</li>
                <li>Bank declined the transaction</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleRetryPayment}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
          </button>
          
          <button
            onClick={() => navigate('/bookings')}
            className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
          >
            View My Bookings
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full px-6 py-3 text-gray-600 hover:text-gray-900 font-medium"
          >
            Back to Home
          </button>
        </div>

        {/* Support Link */}
        <div className="text-center mt-8">
          <p className="text-gray-600 text-sm mb-2">
            Need help?
          </p>
          <button
            onClick={() => navigate('/support')}
            className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentFailed;