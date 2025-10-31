// src/pages/PaymentSuccess.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getTransaction } from '../services/paymentService';

function PaymentSuccess() {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTransactionDetails();
  }, [transactionId]);

  const fetchTransactionDetails = async () => {
    try {
      const response = await getTransaction(transactionId);
      if (response.success) {
        setTransaction(response.data);
      }
    } catch (error) {
      console.error('Error fetching transaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful! 🎉
          </h1>
          <p className="text-gray-600">
            Your booking has been confirmed and payment processed successfully
          </p>
        </div>

        {/* Transaction Details Card */}
        {transaction && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            {/* Transaction ID */}
            <div className="text-center mb-6 pb-6 border-b">
              <p className="text-sm text-gray-600 mb-1">Transaction ID</p>
              <p className="font-mono text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                {transaction.razorpayPaymentId}
              </p>
            </div>

            {/* Amount Breakdown */}
            <div className="space-y-4 mb-6">
              <h3 className="font-bold text-gray-900 text-lg">Payment Details</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Amount Paid</span>
                  <span className="font-semibold">₹{transaction.totalAmount.toFixed(2)}</span>
                </div>
                
                <div className="text-sm text-gray-500 pl-4 space-y-1">
                  <div className="flex justify-between">
                    <span>• Platform Fee</span>
                    <span>₹{transaction.baseCommissionAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• GST (18%)</span>
                    <span>₹{transaction.gstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Driver Amount</span>
                    <span>₹{transaction.driverNetAmount.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-600">Payment Status</span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                    ✓ Captured
                  </span>
                </div>
              </div>
            </div>

            {/* Booking Info */}
            {transaction.bookingId && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Ride Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{transaction.bookingId.pickupLocation}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{transaction.bookingId.dropLocation}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">What happens next?</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Your booking is now confirmed</li>
                <li>Driver will contact you before pickup</li>
                <li>After ride completion, driver receives automatic payout</li>
                <li>You'll receive a GST invoice via email</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Link
            to="/my-bookings"
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg text-center"
          >
            View My Bookings
          </Link>
          <Link
            to="/search"
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors text-center"
          >
            Book Another Ride
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PaymentSuccess;