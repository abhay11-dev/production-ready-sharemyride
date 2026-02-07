import React, { useState, useContext } from 'react';
import { UserContext } from '../../contexts/UserContext';
import { createBooking } from '../../services/bookingService';
import toast from 'react-hot-toast';

function BookingModal({ ride, onClose, onSuccess }) {
  const { user } = useContext(UserContext);
  const [seatsToBook, setSeatsToBook] = useState(1);
  const [pickupLocation, setPickupLocation] = useState(ride.matchedPickup || ride.start);
  const [dropLocation, setDropLocation] = useState(ride.matchedDrop || ride.end);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate fares
  const baseFare = (ride.segmentFare || ride.fare || 0) * seatsToBook;
  const platformFee = Math.round(baseFare * 0.05);
  const gst = Math.round(baseFare * 0.18);
  const totalFare = baseFare + platformFee + gst;

  const availableSeats = ride.availableSeats ?? ride.seats;
  const maxSeats = Math.min(availableSeats, 4); // Max 4 seats per booking

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
        paymentMethod: razorpay,
        specialRequirements: {}
      };

      const response = await createBooking(bookingData);

      toast.dismiss(bookingToast);
      toast.success('Booking created successfully!');
      
      if (onSuccess) {
        onSuccess(response);
      }
      
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">🎫 Confirm Booking</h2>
              <p className="text-blue-100 text-sm">Review details and confirm</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Trip Details */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Trip Details
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">From</span>
                <span className="font-semibold text-gray-900">{pickupLocation}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">To</span>
                <span className="font-semibold text-gray-900">{dropLocation}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Date & Time</span>
                <span className="font-semibold text-gray-900">
                  {new Date(ride.date).toLocaleDateString('en-IN')} at {ride.time}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Driver</span>
                <span className="font-semibold text-gray-900">
                  {ride.driver?.name || ride.driverId?.name || 'Driver'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Vehicle</span>
                <span className="font-semibold text-gray-900">
                  {ride.vehicle?.type} - {ride.vehicle?.number || ride.vehicleNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Seat Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Number of Seats *
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSeatsToBook(Math.max(1, seatsToBook - 1))}
                disabled={seatsToBook <= 1}
                className="w-10 h-10 rounded-lg border-2 border-gray-300 font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max={maxSeats}
                value={seatsToBook}
                onChange={(e) => setSeatsToBook(Math.min(maxSeats, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-20 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setSeatsToBook(Math.min(maxSeats, seatsToBook + 1))}
                disabled={seatsToBook >= maxSeats}
                className="w-10 h-10 rounded-lg border-2 border-gray-300 font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
              <span className="ml-2 text-sm text-gray-600">
                (Max {maxSeats} available)
              </span>
            </div>
          </div>

          {/* Payment Method */}
        

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Notes for Driver (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requirements or pickup instructions..."
              rows={3}
              maxLength={500}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {notes.length}/500 characters
            </div>
          </div>

          {/* Fare Breakdown */}
          <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-100">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Fare Breakdown
            </h3>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Base Fare ({seatsToBook} seat{seatsToBook > 1 ? 's' : ''})</span>
                <span className="font-semibold text-gray-900">₹{baseFare}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Platform Fee (5%)</span>
                <span className="font-semibold text-gray-900">₹{platformFee}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST (18%)</span>
                <span className="font-semibold text-gray-900">₹{gst}</span>
              </div>
              <div className="border-t-2 border-blue-200 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total Amount</span>
                  <span className="text-2xl font-bold text-blue-600">₹{totalFare}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Important Info */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Payment via Razorpay:</p>
<ul className="list-disc list-inside space-y-1 text-xs">
  <li>Your payment will be processed securely via Razorpay</li>
  <li>Driver receives payment after successful ride completion</li>
  <li>Your booking will be confirmed once payment is successful</li>
  <li>Cancellation policy applies based on time remaining</li>
</ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-bold hover:from-blue-700 hover:to-blue-600 hover:shadow-lg transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                `Confirm Booking - ₹${totalFare}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BookingModal;