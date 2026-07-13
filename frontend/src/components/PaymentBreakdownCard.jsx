// src/components/PaymentBreakdownCard.jsx
import React from 'react';
import PaymentCalculator from '../utils/paymentCalculator';
import Icon from './ui/Icon';

const fmt = (v) => {
  const n = Math.round((Number(v) || 0) * 100) / 100;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: n % 1 === 0 ? 0 : 2, minimumFractionDigits: 0 })}`;
};

const PaymentBreakdownCard = ({
  baseFare,
  seatsBooked = 1,
  showDriverView = false,
  showPassengerView = true,
  waivePlatformCharges = false,
  waiverTitle = 'First ride celebration',
  waiverMessage = 'Platform fee is waived for your first booking. GST still applies on the base fare.',
  className = '',
  compact = false,
}) => {
  const driverCalc    = PaymentCalculator.calculateDriverEarnings(baseFare, seatsBooked);
  const passengerCalc = PaymentCalculator.calculatePassengerTotal(baseFare, seatsBooked, { waivePlatformCharges });
  const standardCalc  = PaymentCalculator.calculatePassengerTotal(baseFare, seatsBooked); // no waiver

  const totalBaseFare      = baseFare * seatsBooked;
  const totalDriverNet     = driverCalc.totalDriverEarnings;
  const totalPassengerPays = passengerCalc.totalForAllSeats;
  const totalPlatformFee   = passengerCalc.serviceFeeTotal;
  const totalGST           = passengerCalc.gstOnServiceFeeTotal;

  /* ── Compact mode ────────────────────────────────────────── */
  if (compact) {
    return (
      <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="IndianRupee" size="sm" className="text-blue-600" />
            <span className="font-semibold text-gray-900">{showDriverView ? 'You Earn' : 'Total Amount'}</span>
          </div>
          <span className="text-xl font-bold text-blue-600">
            {showDriverView ? fmt(totalDriverNet) : fmt(totalPassengerPays)}
          </span>
        </div>
      </div>
    );
  }

  /* ── Full mode ───────────────────────────────────────────── */
  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
            <Icon name="Calculator" size="sm" className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Payment Breakdown</h3>
            <p className="text-blue-100 text-xs">Transparent pricing for {seatsBooked} seat{seatsBooked > 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {/* Waiver banner */}
        {waivePlatformCharges && showPassengerView && (
          <div className="relative mb-5 overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-sky-50 to-amber-50 p-4">
            <div className="relative flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                <Icon name="PartyPopper" size="sm" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-900">{waiverTitle}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-emerald-800">{waiverMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Base Fare */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center">
              <Icon name="IndianRupee" size="xs" className="text-green-600" />
            </div>
            <h4 className="font-semibold text-gray-900 text-sm">Base Fare</h4>
          </div>
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-700">{fmt(baseFare)} × {seatsBooked} seat{seatsBooked > 1 ? 's' : ''}</span>
              <span className="text-lg font-bold text-green-600">{fmt(totalBaseFare)}</span>
            </div>
          </div>
        </div>

        {/* Driver View */}
        {showDriverView && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center">
                <Icon name="User" size="xs" className="text-orange-600" />
              </div>
              <h4 className="font-semibold text-gray-900 text-sm">Your Earnings</h4>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Base Amount</span>
                <span className="font-medium">{fmt(totalBaseFare)}</span>
              </div>
              <div className="text-xs text-orange-700 pt-1 border-t border-orange-200">
                Platform charges are added on the passenger side only — you receive the full base fare.
              </div>
              <div className="border-t border-orange-300 pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">You Receive</span>
                  <span className="text-lg font-bold text-green-600">{fmt(totalDriverNet)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Passenger View */}
        {showPassengerView && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                <Icon name="Users" size="xs" className="text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 text-sm">Passenger Payment</h4>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 space-y-2 text-sm">
              {/* Base */}
              <div className="flex justify-between">
                <span className="text-gray-600">Base Fare</span>
                <span className="font-medium">{fmt(totalBaseFare)}</span>
              </div>
              {/* Platform Fee */}
              <div className="flex justify-between">
                <span className="text-gray-600">Platform Fee (3%)</span>
                {waivePlatformCharges ? (
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="text-gray-400 line-through">{fmt(standardCalc.serviceFeeTotal)}</span>
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-700">Free</span>
                  </span>
                ) : (
                  <span className="font-medium">{fmt(totalPlatformFee)}</span>
                )}
              </div>
              {/* GST */}
              <div className="flex justify-between">
                <span className="text-gray-600">
                  GST (5% on {waivePlatformCharges ? 'base fare' : 'base + fee'})
                </span>
                <span className="font-medium">{fmt(totalGST)}</span>
              </div>
              {/* Waiver savings */}
              {waivePlatformCharges && (
                <div className="flex justify-between rounded-lg bg-emerald-100 px-3 py-2">
                  <span className="font-semibold text-emerald-800 text-xs">First booking savings</span>
                  <span className="font-bold text-emerald-700 text-xs">−{fmt(standardCalc.serviceFeeTotal)}</span>
                </div>
              )}
              {/* Total */}
              <div className="border-t border-blue-300 pt-2 mt-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total Amount</span>
                  <span className="text-lg font-bold text-blue-600">{fmt(totalPassengerPays)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security badge */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex items-center gap-3">
          <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Icon name="ShieldCheck" size="xs" className="text-green-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900">Secure Payment</p>
            <p className="text-xs text-gray-500">Protected by industry-standard encryption</p>
          </div>
        </div>

        {/* Payment methods */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-1.5">Accepted Payment Methods</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {['UPI', 'Cards', 'NetBanking', 'Wallets'].map(m => (
              <span key={m} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">{m}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentBreakdownCard;