// src/components/PaymentBreakdownCard.jsx
import React from 'react';
import PaymentCalculator from '../utils/paymentCalculator';

const PaymentBreakdownCard = ({ 
  baseFare, 
  seatsBooked = 1, 
  showDriverView = false, 
  showPassengerView = true,
  className = "",
  compact = false 
}) => {
  const driverCalc = PaymentCalculator.calculateDriverEarnings(baseFare);
  const passengerCalc = PaymentCalculator.calculatePassengerTotal(baseFare);
  
  const totalBaseFare = baseFare * seatsBooked;
  const totalDriverNet = driverCalc.driverNetAmount * seatsBooked;
  const totalPassengerPays = passengerCalc.totalPassengerPays * seatsBooked;

  if (compact) {
    return (
      <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold text-gray-900">
              {showDriverView ? 'You Earn' : 'Total Amount'}
            </span>
          </div>
          <span className="text-xl font-bold text-blue-600">
            ₹{showDriverView ? totalDriverNet.toFixed(2) : totalPassengerPays.toFixed(2)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Payment Breakdown</h3>
            <p className="text-blue-100 text-sm">Transparent pricing for {seatsBooked} seat{seatsBooked > 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Base Fare Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900">Base Fare</h4>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">₹{baseFare.toFixed(2)} × {seatsBooked} seat{seatsBooked > 1 ? 's' : ''}</span>
              <span className="text-xl font-bold text-green-600">₹{totalBaseFare.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Driver View */}
        {showDriverView && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900">Your Earnings</h4>
            </div>
            
            <div className="space-y-3">
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Base Amount</span>
                    <span className="font-medium">₹{totalBaseFare.toFixed(2)}</span>
                  </div>
                  
                  <div className="border-t border-orange-200 pt-2">
                    <p className="text-xs text-orange-700 font-medium mb-2">Platform Deductions:</p>
                    <div className="space-y-1 pl-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">• Platform Fee (8%)</span>
                        <span className="text-red-600">-₹{(driverCalc.platformFee * seatsBooked).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">• GST on Platform Fee (18%)</span>
                        <span className="text-red-600">-₹{(driverCalc.gstOnPlatformFee * seatsBooked).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-orange-300 pt-2 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900">You Receive</span>
                      <span className="text-xl font-bold text-green-600">₹{totalDriverNet.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Passenger View */}
        {showPassengerView && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900">Passenger Payment</h4>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Base Fare</span>
                  <span className="font-medium">₹{totalBaseFare.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service Fee (8%)</span>
                  <span className="font-medium">₹{(passengerCalc.passengerServiceFee * seatsBooked).toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">GST on Service Fee (18%)</span>
                  <span className="font-medium">₹{(passengerCalc.gstOnServiceFee * seatsBooked).toFixed(2)}</span>
                </div>
                
                <div className="border-t border-blue-300 pt-2 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total Amount</span>
                    <span className="text-xl font-bold text-blue-600">₹{totalPassengerPays.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Security Badge */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Secure Payment</p>
              <p className="text-xs text-gray-600">Protected by industry-standard encryption</p>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Accepted Payment Methods:</p>
          <div className="flex items-center gap-2 flex-wrap">
            {['UPI', 'Cards', 'NetBanking', 'Wallets'].map((method) => (
              <span key={method} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentBreakdownCard;