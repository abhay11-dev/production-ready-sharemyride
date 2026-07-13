import React, { useState, useContext } from 'react';
import { UserContext } from '../../contexts/UserContext';
import { createBooking } from '../../services/bookingService';
import toast from '../../services/toastService';
import PaymentCalculator from '../../utils/paymentCalculator';
import Icon from '../ui/Icon';

function BookingModal({ ride, onClose, onSuccess, isFirstRideFree = false }) {
  const { user } = useContext(UserContext);
  const [seatsToBook, setSeatsToBook] = useState(1);
  const [pickupLocation, setPickupLocation] = useState(ride.matchedPickup || ride.start);
  const [dropLocation, setDropLocation] = useState(ride.matchedDrop || ride.end);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const farePerSeat = ride.segmentFare || ride.fare || 0;

  // Standard (non-waived) calculation — used to show the crossed-out amounts
  const standardCalc = PaymentCalculator.calculatePassengerTotal(farePerSeat, seatsToBook);
  // Actual calculation (may have waiver)
  const actualCalc = PaymentCalculator.calculatePassengerTotal(farePerSeat, seatsToBook, {
    waivePlatformCharges: isFirstRideFree,
  });

  const baseFareTotal   = actualCalc.baseFareTotal;
  const platformFee     = actualCalc.serviceFeeTotal;
  const gst             = actualCalc.gstOnServiceFeeTotal;
  const totalFare       = actualCalc.totalForAllSeats;

  const availableSeats = ride.availableSeats ?? ride.seats;
  const maxSeats = Math.min(availableSeats, 4);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (seatsToBook < 1 || seatsToBook > maxSeats) {
      toast.error(`Please select between 1 and ${maxSeats} seats`);
      return;
    }

    setIsSubmitting(true);
    const bookingToast = toast.loading('Creating booking...');

    try {
      const bookingData = {
        rideId: ride._id,
        seatsBooked: seatsToBook,
        pickupLocation: {
          address: pickupLocation,
          coordinates: ride.pickupCoordinates || {}
        },
        dropLocation: {
          address: dropLocation,
          coordinates: ride.dropCoordinates || {}
        },
        passengerNotes: notes,
        paymentMethod: 'upi',
        specialRequirements: {}
      };

      const response = await createBooking(bookingData);

      toast.dismiss(bookingToast);
      toast.success(response?.isFirstRideFree || isFirstRideFree
        ? 'Booking created. First ride platform fee waived!'
        : 'Booking created successfully!');
      
      if (onSuccess) onSuccess(response);
      onClose();
    } catch (error) {
      console.error('Booking error:', error);
      toast.dismiss(bookingToast);
      toast.error(error.response?.data?.message || 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-5 sm:p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                <Icon name="Ticket" size="md" className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Confirm Booking</h2>
                <p className="text-blue-100 text-sm">Review details and confirm</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-full p-2 transition-colors"
            >
              <Icon name="X" size="md" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Trip Details */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
              <Icon name="Route" size="sm" className="text-blue-600" />
              Trip Details
            </h3>
            <div className="space-y-2.5 text-sm">
              {[
                ['From', pickupLocation],
                ['To', dropLocation],
                ['Date & Time', `${new Date(ride.date).toLocaleDateString('en-IN')} at ${ride.time}`],
                ['Driver', ride.driver?.name || ride.driverId?.name || 'Driver'],
                ['Vehicle', `${ride.vehicle?.type} — ${ride.vehicle?.number || ride.vehicleNumber}`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900 text-right max-w-[60%] truncate">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Seat Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Seats</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSeatsToBook(Math.max(1, seatsToBook - 1))}
                disabled={seatsToBook <= 1}
                className="w-10 h-10 rounded-lg border-2 border-gray-200 font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >−</button>
              <input
                type="number"
                min="1"
                max={maxSeats}
                value={seatsToBook}
                onChange={(e) => setSeatsToBook(Math.min(maxSeats, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-16 text-center text-xl font-bold border-2 border-gray-200 rounded-lg py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setSeatsToBook(Math.min(maxSeats, seatsToBook + 1))}
                disabled={seatsToBook >= maxSeats}
                className="w-10 h-10 rounded-lg border-2 border-gray-200 font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >+</button>
              <span className="ml-2 text-xs text-gray-500">(Max {maxSeats} available)</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes for Driver (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requirements or pickup instructions..."
              rows={3}
              maxLength={500}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <div className="text-xs text-gray-400 mt-1 text-right">{notes.length}/500</div>
          </div>

          {/* ── Fare Breakdown ────────────────────────────────────────── */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
              <Icon name="IndianRupee" size="sm" className="text-blue-600" />
              Fare Breakdown
            </h3>

            {isFirstRideFree && (
              <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                <p className="text-xs font-bold text-green-800">First ride offer active</p>
                <p className="mt-0.5 text-xs text-green-700">
                  Platform fee is waived for your first booking. GST still applies on the base fare.
                </p>
              </div>
            )}

            <div className="space-y-2 text-sm">
              {/* Base Fare */}
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Base Fare ({seatsToBook} seat{seatsToBook > 1 ? 's' : ''} × ₹{farePerSeat.toFixed(0)})
                </span>
                <span className="font-semibold text-gray-900">₹{baseFareTotal.toFixed(2)}</span>
              </div>

              {/* Platform Fee */}
              <div className="flex justify-between">
                <span className="text-gray-600">Platform Fee (3%)</span>
                {isFirstRideFree ? (
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="text-gray-400 line-through">₹{standardCalc.serviceFeeTotal.toFixed(2)}</span>
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700 uppercase">Free</span>
                  </span>
                ) : (
                  <span className="font-semibold text-gray-900">₹{platformFee.toFixed(2)}</span>
                )}
              </div>

              {/* GST */}
              <div className="flex justify-between">
                <span className="text-gray-600">
                  GST (5% on {isFirstRideFree ? 'base fare' : 'base + fee'})
                </span>
                <span className="font-semibold text-gray-900">₹{gst.toFixed(2)}</span>
              </div>

              {/* Divider + Total */}
              <div className="border-t-2 border-blue-200 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total Amount</span>
                  <span className="text-2xl font-bold text-blue-600">₹{totalFare.toFixed(2)}</span>
                </div>
                {isFirstRideFree && (
                  <p className="text-xs text-green-700 mt-1 text-right">
                    You save ₹{standardCalc.serviceFeeTotal.toFixed(2)} on this booking
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2.5">
              <Icon name="Info" size="sm" className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 space-y-1">
                <p className="font-semibold">Payment Info</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Secure payment via Razorpay</li>
                  <li>Driver receives payment after ride completion</li>
                  <li>Cancel 24+ hours before departure for a full refund</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-5 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                `Confirm Booking — ₹${totalFare.toFixed(2)}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BookingModal;
