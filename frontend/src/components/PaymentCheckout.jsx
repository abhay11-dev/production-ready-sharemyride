// src/components/PaymentCheckout.jsx
import React, { useState, useEffect } from 'react';
import { createPaymentOrder, verifyPayment } from '../services/paymentService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PaymentCalculator } from '../utils/paymentCalculator';
import PaymentBreakdownCard from './PaymentBreakdownCard';

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

  // Calculate passenger-side breakdown using new 8% fee structure
  const calculatePassengerBreakdown = () => {
    if (!booking) return null;
    
    // Use the base fare from booking or calculate from total
    const baseFare = booking.baseFare || (booking.totalFare / (1 + 0.08 + (0.08 * 0.18))); // Reverse calc with 8% + GST
    const passengerCalc = PaymentCalculator.calculatePassengerTotal(baseFare);
    
    return {
      baseFare: baseFare,
      passengerServiceFee: passengerCalc.passengerServiceFee,
      passengerServiceFeeGST: passengerCalc.gstOnServiceFee,
      total: passengerCalc.totalPassengerPays,
      seatsBooked: booking.seatsBooked || 1
    };
  };

  const passengerBreakdown = calculatePassengerBreakdown();

  const handlePayment = async () => {
    if (!booking || !booking._id) {
      setError('Invalid booking details');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Step 1: Create Razorpay order with Route
      const orderResponse = await createPaymentOrder(booking._id);
      
      if (!orderResponse.success) {
        throw new Error(orderResponse.message || 'Failed to create order');
      }

      const { orderId, amount, currency, razorpayKeyId } = orderResponse.data;
      setCommissionBreakdown(orderResponse.data.commissionBreakdown);

      // Step 2: Configure Razorpay Checkout options
      const options = {
        key: razorpayKeyId, // Razorpay Key ID from backend
        amount: amount, // Total amount in paise
        currency: currency || 'INR',
        name: 'ShareMyRide',
        description: `Booking: ${booking.pickupLocation} to ${booking.dropLocation}`,
        image: '/logo.png', // Your app logo
        order_id: orderId, // Razorpay Order ID
        
        // Pre-fill customer details
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || ''
        },
        
        // Theme customization
        theme: {
          color: '#3B82F6' // Blue color matching your app
        },
        
        // Notes (for reference)
        notes: {
          booking_id: booking._id,
          passenger_id: user?.id || user?._id,
          pickup: booking.pickupLocation,
          drop: booking.dropLocation,
          seats: booking.seatsBooked
        },
        
        // Success handler - called after successful payment
        handler: async function (response) {
          try {
            setIsLoading(true);
            
            // Step 3: Verify payment signature on backend
            const verificationData = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: booking._id
            };
            
            const verifyResponse = await verifyPayment(verificationData);
            
            if (verifyResponse.success) {
              // Payment verified successfully
              // Backend webhook will automatically trigger driver transfer
              
              if (onSuccess) {
                onSuccess({
                  ...verifyResponse.data,
                  bookingId: booking._id,
                  paymentId: response.razorpay_payment_id
                });
              } else {
                // Navigate to success page
                navigate(`/payment-success/${booking._id}`, {
                  state: {
                    paymentId: response.razorpay_payment_id,
                    orderId: response.razorpay_order_id,
                    amount: amount / 100, // Convert paise to rupees
                    booking: booking
                  }
                });
              }
            } else {
              throw new Error(verifyResponse.message || 'Payment verification failed');
            }
            
          } catch (error) {
            console.error('Payment verification error:', error);
            setError(error.message || 'Payment verification failed. Please contact support.');
            setIsLoading(false);
            
            // Navigate to failure page
            navigate(`/payment-failed/${booking._id}`, {
              state: {
                error: error.message,
                booking: booking
              }
            });
          }
        },
        
        // Modal closed handler
        modal: {
          ondismiss: function() {
            setIsLoading(false);
            setError('Payment cancelled. You can try again when ready.');
            console.log('Payment modal closed by user');
          }
        }
      };

      // Step 4: Open Razorpay Checkout
      if (!window.Razorpay) {
        throw new Error('Razorpay SDK not loaded. Please refresh the page.');
      }
      
      const razorpay = new window.Razorpay(options);
      
      // Handle payment failures
      razorpay.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);
        setError(`Payment failed: ${response.error.description || 'Please try again'}`);
        setIsLoading(false);
        
        // Navigate to failure page
        navigate(`/payment-failed/${booking._id}`, {
          state: {
            error: response.error.description,
            errorCode: response.error.code,
            booking: booking
          }
        });
      });
      
      razorpay.open();
      setIsLoading(false);

    } catch (error) {
      console.error('Error initiating payment:', error);
      setError(error.message || 'Failed to initiate payment. Please try again.');
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

        {/* Professional Payment Breakdown */}
        <div className="border-t border-gray-200 pt-4">
          <PaymentBreakdownCard
            baseFare={passengerBreakdown?.baseFare || 0}
            seatsBooked={booking.seatsBooked || 1}
            showPassengerView={true}
            showDriverView={false}
            compact={true}
            className="mb-4"
          />
          
          {/* Detailed breakdown */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Base Fare ({booking.seatsBooked} seat{booking.seatsBooked > 1 ? 's' : ''})</span>
              <span>₹{(passengerBreakdown?.baseFare * (booking.seatsBooked || 1)).toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-gray-600">
              <span>Service Fee (8%)</span>
              <span>₹{(passengerBreakdown?.passengerServiceFee * (booking.seatsBooked || 1)).toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-gray-600">
              <span>GST on Service Fee (18%)</span>
              <span>₹{(passengerBreakdown?.passengerServiceFeeGST * (booking.seatsBooked || 1)).toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
              <span>Total Amount</span>
              <span>₹{booking.totalFare.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Enhanced Info Note */}
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-2">🔒 Secure Payment with Automatic Payout</p>
              <div className="space-y-1 text-xs">
                <p>• Your payment is processed securely through Razorpay</p>
                <p>• Driver receives earnings (after 8% platform fee + GST) within 1-2 business days</p>
                <p>• 256-bit SSL encryption protects your payment data</p>
                <p>• Full refund available if ride is cancelled by driver</p>
              </div>
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

      {/* Enhanced Payment Methods */}
      <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="text-center mb-3">
          <p className="text-sm font-semibold text-gray-700 mb-2">Accepted Payment Methods</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center justify-center gap-2 bg-white rounded-lg p-3 border border-gray-200">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-medium text-gray-700">UPI</span>
            </div>
            <div className="flex items-center justify-center gap-2 bg-white rounded-lg p-3 border border-gray-200">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span className="text-xs font-medium text-gray-700">Cards</span>
            </div>
            <div className="flex items-center justify-center gap-2 bg-white rounded-lg p-3 border border-gray-200">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="text-xs font-medium text-gray-700">NetBanking</span>
            </div>
            <div className="flex items-center justify-center gap-2 bg-white rounded-lg p-3 border border-gray-200">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-xs font-medium text-gray-700">Wallets</span>
            </div>
          </div>
        </div>
        
        {/* Security badges */}
        <div className="flex items-center justify-center gap-4 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-gray-600">SSL Secured</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-4 4-4-4 4-4 .257-.257A6 6 0 1118 8zm-6-2a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-gray-600">PCI Compliant</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-gray-600">RBI Approved</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentCheckout;