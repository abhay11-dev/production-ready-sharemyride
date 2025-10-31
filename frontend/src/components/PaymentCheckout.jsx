// src/components/PaymentCheckout.jsx
import React, { useState, useEffect } from 'react';
import { createPaymentOrder, verifyPayment } from '../services/paymentService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function PaymentCheckout({ booking, onSuccess, onCancel }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [commissionBreakdown, setCommissionBreakdown] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
    if (!booking || !booking._id) {
      setError('Invalid booking details');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Step 1: Create payment order
      const orderResponse = await createPaymentOrder(booking._id);
      
      if (!orderResponse.success) {
        throw new Error(orderResponse.message || 'Failed to create order');
      }

      const { orderId, amount, currency, transactionId, razorpayKeyId } = orderResponse.data;
      setCommissionBreakdown(orderResponse.data.commissionBreakdown);

      // Step 2: Configure Razorpay options
      const options = {
        key: razorpayKeyId,
        amount: amount, // Amount in paise
        currency: currency,
        name: 'ShareMyRide',
        description: `Booking: ${booking.pickupLocation} to ${booking.dropLocation}`,
        order_id: orderId,
        
        // Customer details
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone
        },
        
        // Theme
        theme: {
          color: '#3B82F6'
        },
        
        // Payment success handler
        handler: async function (response) {
          try {
            setIsLoading(true);
            
            // Step 3: Verify payment on backend
            const verificationData = {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              transactionId: transactionId
            };
            
            const verifyResponse = await verifyPayment(verificationData);
            
            if (verifyResponse.success) {
              // Payment successful
              if (onSuccess) {
                onSuccess(verifyResponse.data);
              } else {
                navigate(`/payment-success/${transactionId}`);
              }
            } else {
              throw new Error('Payment verification failed');
            }
            
          } catch (error) {
            console.error('Payment verification error:', error);
            setError(error.message || 'Payment verification failed');
            setIsLoading(false);
          }
        },
        
        // Payment modal closed handler
        modal: {
          ondismiss: function() {
            setIsLoading(false);
            setError('Payment cancelled by user');
          }
        },
        
        // Error handler
        error: function(error) {
          console.error('Payment error:', error);
          setError('Payment failed. Please try again.');
          setIsLoading(false);
        }
      };

      // Step 4: Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      razorpay.open();
      
      setIsLoading(false);

    } catch (error) {
      console.error('Error initiating payment:', error);
      setError(error.message || 'Failed to initiate payment');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Booking Summary */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Complete Your Payment
        </h2>
        
        {/* Trip Details */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 mt-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-gray-600">Pickup</p>
              <p className="font-semibold text-gray-900">{booking.pickupLocation}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-gray-600">Drop</p>
              <p className="font-semibold text-gray-900">{booking.dropLocation}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 mt-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
            <div>
              <p className="text-sm text-gray-600">Seats Booked</p>
              <p className="font-semibold text-gray-900">{booking.seatsBooked}</p>
            </div>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="border-t border-gray-200 pt-4">
          <div className="space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Ride Fare</span>
              <span>₹{booking.totalFare.toFixed(2)}</span>
            </div>
            
            {commissionBreakdown && (
              <>
                <div className="text-xs text-gray-500 pl-4">
                  <div className="flex justify-between">
                    <span>• Platform Fee</span>
                    <span>₹{commissionBreakdown.platformCommission.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• GST (18%)</span>
                    <span>₹{commissionBreakdown.gstOnCommission.toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}
            
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
              <span>Total Amount</span>
              <span>₹{booking.totalFare.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Info Note */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Secure Payment</p>
              <p>Your payment is processed securely through Razorpay. The driver will receive their amount automatically after ride completion.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">{error}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        
        <button
          onClick={handlePayment}
          disabled={isLoading}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Pay ₹{booking.totalFare.toFixed(2)}
            </>
          )}
        </button>
      </div>

      {/* Payment Methods */}
      <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-500">
        <span>We accept:</span>
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 bg-gray-100 rounded">UPI</span>
          <span className="px-2 py-1 bg-gray-100 rounded">Cards</span>
          <span className="px-2 py-1 bg-gray-100 rounded">NetBanking</span>
          <span className="px-2 py-1 bg-gray-100 rounded">Wallets</span>
        </div>
      </div>
    </div>
  );
}

export default PaymentCheckout;