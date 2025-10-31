import React, { useState } from 'react';
import { createBooking } from '../../services/bookingService';
import { useAuth } from '../../hooks/useAuth';

function RideCard({ ride, onBookingSuccess }) {
  const { user } = useAuth();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [seatsToBook, setSeatsToBook] = useState(1);
  const [pickupLocation, setPickupLocation] = useState(ride.start);
  const [dropLocation, setDropLocation] = useState(ride.end);
  const [passengerNotes, setPassengerNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [hoveredFare, setHoveredFare] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

 const calculateFinalFare = (baseFare, seats = 1) => {
  const totalBase = baseFare * seats;
  const platformFee = totalBase * 0.10; // 10% platform fee
  const subtotal = totalBase + platformFee;
  const gst = subtotal * 0.18; // 18% GST
  const total = subtotal + gst;

  return {
    baseFare: totalBase,
    platformFee,
    gst,
    subtotal,
    total,
  };
};


  const fareDetails = calculateFinalFare(parseFloat(ride.fare), seatsToBook);
  const singleSeatFare = calculateFinalFare(parseFloat(ride.fare), 1);

  const handleRequestRide = () => {
    if (!user) {
      alert('Please login to request a ride');
      return;
    }
    setShowBookingModal(true);
    setBookingError('');
    setBookingSuccess(false);
  };

  const handleViewContact = () => {
    if (!user) {
      alert('Please login to view contact details');
      return;
    }
    setShowContactModal(true);
  };

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    setIsBooking(true);
    setBookingError('');

    try {
      const bookingData = {
        rideId: ride._id,
        seatsBooked: seatsToBook,
        pickupLocation,
        dropLocation,
        passengerNotes,
        totalFare: fareDetails.total,
        platformFee: fareDetails.platformFee,
        gst: fareDetails.gst,
        baseFare: fareDetails.baseFare
      };

      await createBooking(bookingData);

      setBookingSuccess(true);
      
      // Call parent callback if provided
      if (onBookingSuccess) {
        onBookingSuccess();
      }

      setTimeout(() => {
        setShowBookingModal(false);
        setBookingSuccess(false);
        setSeatsToBook(1);
        setPickupLocation(ride.start);
        setDropLocation(ride.end);
        setPassengerNotes('');
      }, 2000);
    } catch (error) {
      setBookingError(error.response?.data?.message || 'Failed to request ride');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <>
      <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6 hover:border-blue-400 hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-white to-gray-50">
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-4">
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
            <p className="text-base sm:text-xl font-bold text-green-600 text-center">{ride.start}</p>
            <span className="text-sm sm:text-xl text-gray-400">→</span>
            <p className="text-base sm:text-xl font-bold text-blue-600 text-center">{ride.end}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-4">
          
          <div className="bg-purple-50 rounded-lg p-2.5 sm:p-3 text-center border border-purple-200">
            <div className="flex justify-center mb-1">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-xs text-gray-500 font-medium mb-1">Driver</p>
            <p className="text-xs sm:text-sm font-bold text-gray-900 truncate" title={ride.driverId?.name}>
              {ride.driverId?.name || 'Unknown'}
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-2.5 sm:p-3 text-center border border-blue-200">
            <div className="flex justify-center mb-1">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-xs text-gray-500 font-medium mb-1">Available Seats</p>
            <p className="text-base sm:text-lg font-bold text-gray-900">{ride.seats}</p>
          </div>

          <div className="bg-purple-50 rounded-lg p-2.5 sm:p-3 text-center border border-purple-200">
            <div className="flex justify-center mb-1">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-xs text-gray-500 font-medium mb-1">Date</p>
            <p className="text-xs sm:text-sm font-bold text-gray-900">{formatDate(ride.date)}</p>
          </div>

          <div className="bg-orange-50 rounded-lg p-2.5 sm:p-3 text-center border border-orange-200">
            <div className="flex justify-center mb-1">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs text-gray-500 font-medium mb-1">Time</p>
            <p className="text-xs sm:text-sm font-bold text-gray-900">{formatTime(ride.time)}</p>
          </div>

          <div 
            className="bg-green-50 rounded-lg p-2.5 sm:p-3 text-center border border-green-200 relative"
            onMouseEnter={() => setHoveredFare(true)}
            onMouseLeave={() => setHoveredFare(false)}
          >
            <div className="flex justify-center mb-1 gap-1">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-xs text-gray-500 font-medium mb-1">Fare/Seat</p>
            <p className="text-lg sm:text-xl font-bold text-green-600">₹{singleSeatFare.total.toFixed(2)}</p>
            
            {hoveredFare && (
              <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-56 sm:w-64 bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 sm:p-4">
                <div className="space-y-2">
                  <div className="font-semibold text-sm border-b border-gray-700 pb-2">Fare Breakdown (Per Seat)</div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Base Fare:</span>
                    <span className="font-semibold">₹{parseFloat(ride.fare).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Platform Fee (10%):</span>
                    <span className="font-semibold">₹{singleSeatFare.platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">GST (18%):</span>
                    <span className="font-semibold">₹{singleSeatFare.gst.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-700 pt-2 mt-2">
                    <div className="flex justify-between items-center font-bold">
                      <span>Total per Seat:</span>
                      <span className="text-green-400">₹{singleSeatFare.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                  <div className="border-8 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleRequestRide}
            className="flex-1 bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-600 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Request Ride</span>
          </button>
          <button
            onClick={handleViewContact}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-600 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>View Contact</span>
          </button>
        </div>
      </div>

    {showContactModal && (
  <div className="fixed inset-0 backdrop-blur-sm bg-blue-100/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-95 animate-popIn">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-6 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold">Contact Details</h3>
          <button
            onClick={() => setShowContactModal(false)}
            className="text-white hover:bg-red-600 hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-2">Driver Name</p>
          <p className="text-lg font-bold text-gray-900">{ride.driverId?.name || 'Not available'}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-2">Phone Number</p>
          <p className="text-lg font-bold text-gray-900">{ride.phoneNumber || 'Not provided'}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-2">Pickup Address</p>
          <p className="text-base font-semibold text-gray-900">{ride.address || 'Not provided'}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-2">Vehicle Number</p>
          <p className="text-lg font-bold text-gray-900 uppercase">{ride.vehicleNumber}</p>
        </div>
      </div>
    </div>
  </div>
)}


    {showBookingModal && (
  <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50 p-4 animate-fadeIn">
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-95 animate-popIn">
      
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-6 rounded-t-2xl sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold">Request Ride</h3>
          <button
            onClick={() => setShowBookingModal(false)}
            className="text-white hover:bg-red-600 hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            disabled={isBooking}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-blue-100 mt-2 text-sm">{ride.start} → {ride.end}</p>
      </div>

      {bookingSuccess && (
        <div className="m-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-3 animate-popIn">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">Booking request sent successfully!</span>
        </div>
      )}

      {bookingError && (
        <div className="m-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3 animate-popIn">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">{bookingError}</span>
        </div>
      )}

      <form onSubmit={handleSubmitBooking} className="p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Number of Seats
          </label>
          <select
            value={seatsToBook}
            onChange={(e) => setSeatsToBook(parseInt(e.target.value))}
            className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            required
            disabled={isBooking}
          >
            {[...Array(ride.seats)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1} {i === 0 ? 'seat' : 'seats'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Pickup Location (Optional)
          </label>
          <input
            type="text"
            value={pickupLocation}
            onChange={(e) => setPickupLocation(e.target.value)}
            className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="Specify exact pickup point"
            disabled={isBooking}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Drop Location (Optional)
          </label>
          <input
            type="text"
            value={dropLocation}
            onChange={(e) => setDropLocation(e.target.value)}
            className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="Specify exact drop point"
            disabled={isBooking}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Additional Notes (Optional)
          </label>
          <textarea
            value={passengerNotes}
            onChange={(e) => setPassengerNotes(e.target.value)}
            className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            rows="3"
            placeholder="Any special requirements or messages for the driver..."
            disabled={isBooking}
          />
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-gray-800 mb-3">Fare Breakdown</h4>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Base Fare ({seatsToBook} × ₹{ride.fare}):</span>
            <span className="font-semibold">₹{fareDetails.baseFare.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Platform Fee (10%):</span>
            <span className="font-semibold">₹{fareDetails.platformFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">GST (18%):</span>
            <span className="font-semibold">₹{fareDetails.gst.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 mt-2 flex justify-between">
            <span className="font-bold text-gray-800">Total Amount:</span>
            <span className="font-bold text-green-600 text-lg">₹{fareDetails.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => setShowBookingModal(false)}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            disabled={isBooking}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={isBooking}
          >
            {isBooking ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Requesting...</span>
              </>
            ) : (
              'Confirm Request'
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

    </>
  );
}

export default RideCard;