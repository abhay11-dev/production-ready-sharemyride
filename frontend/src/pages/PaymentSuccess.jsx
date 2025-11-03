// src/pages/PaymentSuccess.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getBookingPaymentDetails } from '../services/paymentService.js';

function PaymentSuccess() {
  const { bookingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get data from navigation state or fetch from API
  useEffect(() => {
    const fetchPaymentDetails = async () => {
      if (location.state) {
        // Use data passed from navigation
        setPaymentDetails(location.state);
        setLoading(false);
      } else if (bookingId) {
        // Fetch from API if no state
        try {
          const response = await getBookingPaymentDetails(bookingId);
          if (response.success) {
            setPaymentDetails(response.data);
          }
        } catch (error) {
          console.error('Error fetching payment details:', error);
        }
        setLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [bookingId, location.state]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-4 animate-bounce">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-600">
            Your ride has been confirmed
          </p>
        </div>

        {/* Payment Details Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          {/* Amount */}
          <div className="text-center pb-6 border-b border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Amount Paid</p>
            <p className="text-4xl font-bold text-green-600">
              ₹{paymentDetails?.amount?.toFixed(2) || '0.00'}
            </p>
          </div>

          {/* Transaction Details */}
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Payment ID</span>
              <span className="font-mono text-sm text-gray-900">
                {paymentDetails?.paymentId || 'N/A'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Order ID</span>
              <span className="font-mono text-sm text-gray-900">
                {paymentDetails?.orderId || 'N/A'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Booking ID</span>
              <span className="font-mono text-sm text-gray-900">
                {bookingId || 'N/A'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Date & Time</span>
              <span className="text-gray-900">
                {new Date().toLocaleString()}
              </span>
            </div>
          </div>

          {/* Trip Details */}
          {paymentDetails?.booking && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Trip Details</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-xs text-gray-500">Pickup</p>
                    <p className="text-sm font-medium text-gray-900">
                      {paymentDetails.booking.pickupLocation}
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
                      {paymentDetails.booking.dropLocation}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                  </svg>
                  <div>
                    <p className="text-xs text-gray-500">Seats</p>
                    <p className="text-sm font-medium text-gray-900">
                      {paymentDetails.booking.seatsBooked} seat(s)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">What happens next?</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Driver will receive payout automatically in 1-2 business days</li>
                <li>You'll receive booking confirmation via email/SMS</li>
                <li>Check your bookings page for ride details</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/bookings')}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            View My Bookings
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
          >
            Back to Home
          </button>
        </div>

        {/* Download Receipt */}
        <div className="text-center mt-6">
          <button
            onClick={() => window.print()}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentSuccess;