// components/Rides/RideCard.jsx
import React, { useState } from 'react';
import { createBooking } from '../../services/bookingService';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import PaymentCalculator from '../../utils/paymentCalculator';

function RideCard({ ride, onBookingSuccess, userBookings = [] }) {
  const { user } = useAuth();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [seatsToBook, setSeatsToBook] = useState(1);
  const [pickupLocation, setPickupLocation] = useState(ride.start);
  const [dropLocation, setDropLocation] = useState(ride.end);
  const [passengerNotes, setPassengerNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [hoveredFare, setHoveredFare] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [allowDuplicateBooking, setAllowDuplicateBooking] = useState(false);

  // Check if current user has already booked this ride
  const userBookingForThisRide = userBookings.find(booking => 
    booking.rideId === ride._id || booking.ride?._id === ride._id
  );
  
  const isAlreadyBooked = !!userBookingForThisRide;
  

  // ✅ ADD after calculatePassengerFare function
const calculateSegmentFare = (perKmRate, distance, seats = 1) => {
  const base = perKmRate * distance * seats;
  const platformFee = base * 0.08; // 8%
  const gst = platformFee * 0.18; // 18% on platform fee
  return base + platformFee + gst;
};


  // Determine booking status badge
  const getBookingStatusBadge = () => {
    if (!userBookingForThisRide) return null;
    
    const status = userBookingForThisRide.status;
    const paymentStatus = userBookingForThisRide.paymentStatus;
    
    if (status === 'pending' && paymentStatus !== 'completed') {
      return {
        text: 'Booking Pending',
        icon: '⏳',
        bgColor: 'from-yellow-600 to-yellow-500',
        subText: 'Payment Required'
      };
    }
    
    if (status === 'confirmed' && paymentStatus !== 'completed') {
      return {
        text: 'Confirmed - Pay Now',
        icon: '💳',
        bgColor: 'from-orange-600 to-orange-500',
        subText: 'Complete Payment'
      };
    }
    
    if (status === 'confirmed' && paymentStatus === 'completed') {
      return {
        text: 'Booking Confirmed',
        icon: '✓',
        bgColor: 'from-green-600 to-green-500',
        subText: 'Ready to Go'
      };
    }
    
    if (status === 'rejected') {
      return {
        text: 'Booking Rejected',
        icon: '✗',
        bgColor: 'from-red-600 to-red-500',
        subText: 'Try Another Ride'
      };
    }
    
    if (status === 'cancelled') {
      return {
        text: 'Booking Cancelled',
        icon: '⊘',
        bgColor: 'from-gray-600 to-gray-500',
        subText: 'Book Again'
      };
    }
    
    return {
      text: 'Already Booked',
      icon: '✓',
      bgColor: 'from-blue-600 to-blue-500',
      subText: ''
    };
  };
  
  const bookingBadge = getBookingStatusBadge();

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' };
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

  const getAvailableSeats = () => {
    if (ride.availableSeats !== undefined && ride.availableSeats !== null) {
      return ride.availableSeats;
    }
    
    if (!ride.bookings || ride.bookings.length === 0) {
      return ride.seats;
    }
    
    const confirmedBookings = ride.bookings.filter(
      b => b.status === 'confirmed' || b.status === 'pending'
    );
    
    const bookedSeats = confirmedBookings.reduce(
      (sum, booking) => sum + (booking.seatsBooked || 1), 
      0
    );
    
    return ride.seats - bookedSeats;
  };

  const availableSeats = getAvailableSeats();
  const totalSeats = ride.seats;
  const bookedSeatsCount = totalSeats - availableSeats;

  // Calculate passenger fare
  const calculatePassengerFare = (driverBaseFare, seats = 1) => {
    const baseFare = parseFloat(driverBaseFare);
    if (isNaN(baseFare) || baseFare <= 0) {
      return {
        baseFare: 0,
        passengerServiceFee: 0,
        passengerServiceFeeGST: 0,
        total: 0
      };
    }

    const passengerCalc = PaymentCalculator.calculatePassengerTotal(baseFare, seats);
return {
  baseFare: passengerCalc.baseFareTotal,
  passengerServiceFee: passengerCalc.serviceFeeTotal,
  passengerServiceFeeGST: passengerCalc.gstOnServiceFeeTotal,
  total: passengerCalc.totalForAllSeats
};

    return {
      baseFare: baseFareTotal,
      passengerServiceFee,
      passengerServiceFeeGST,
      total: passengerTotal
    };
  };

  const fareDetails = calculatePassengerFare(ride.fare || 0, seatsToBook);
  const singleSeatFare = calculatePassengerFare(ride.fare || 0, 1);

  const handleBookNow = () => {
    if (!user) {
      toast.error('Please login to book a ride', {
        duration: 4000,
        position: 'top-center',
        icon: '🔒',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
      });
      return;
    }

    if (availableSeats === 0) {
      toast.error('No seats available for this ride', {
        duration: 4000,
        position: 'top-center',
        icon: '🚫',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
      });
      return;
    }

    if (isAlreadyBooked && !allowDuplicateBooking) {
      toast(
        (t) => (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <span className="font-bold text-lg">Already Booked!</span>
            </div>
            <p className="text-sm">
              You already have a booking for this ride. Do you want to book additional seats?
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  setAllowDuplicateBooking(true);
                  setTimeout(() => {
                    setShowBookingModal(true);
                  }, 100);
                }}
                className="flex-1 bg-white text-amber-700 border-2 border-amber-700 px-4 py-2 rounded-lg font-semibold hover:bg-amber-50 transition-colors"
              >
                Yes, Continue
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="flex-1 bg-amber-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-amber-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ),
        {
          duration: 8000,
          position: 'top-center',
          style: {
            background: '#FEF3C7',
            color: '#92400E',
            fontWeight: '600',
            padding: '20px',
            borderRadius: '12px',
            maxWidth: '450px',
            border: '2px solid #F59E0B',
          },
        }
      );
      return;
    }

    setShowBookingModal(true);
  };

  const handleViewContact = () => {
    if (!user) {
      toast.error('Please login to view contact details', {
        duration: 4000,
        position: 'top-center',
        icon: '🔒',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
      });
      return;
    }
    
    setShowContactModal(true);
  };

const handleSubmitBooking = async (e) => {
  e.preventDefault();
  setIsBooking(true);

  const processingToast = toast.loading('Processing your booking request...', {
    position: 'top-center',
    style: {
      background: '#3B82F6',
      color: '#fff',
      fontWeight: '600',
      padding: '16px',
      borderRadius: '12px',
    },
  });

  try {
    const bookingData = {
      rideId: ride._id,
      seatsBooked: seatsToBook,
      
      // 📍 LOCATION DATA - Fixed
      pickupLocation: {
        address: ride.matchType === 'on_route' && ride.userPickup 
          ? ride.userPickup 
          : (pickupLocation || ride.start),
        coordinates: ride.pickupCoordinates || {
          lat: ride.startCoordinates?.lat || 0,
          lng: ride.startCoordinates?.lng || 0
        }
      },
      
      dropLocation: {
        address: ride.matchType === 'on_route' && ride.userDrop 
          ? ride.userDrop 
          : (dropLocation || ride.end),
        coordinates: ride.dropCoordinates || {
          lat: ride.endCoordinates?.lat || 0,
          lng: ride.endCoordinates?.lng || 0
        }
      },
      
      // 📝 NOTES & PAYMENT
      passengerNotes: passengerNotes || '',
      specialRequirements: {},
      paymentMethod: 'cash',
      
      // 🎯 CRITICAL: SEGMENT BOOKING DATA
      matchType: ride.matchType || null,
      userSearchDistance: ride.userSearchDistance || null,
      segmentFare: ride.segmentFare || null,
      matchQuality: ride.matchQuality || null,
    };

    console.log('📝 Sending booking data:', bookingData);

    await createBooking(bookingData);

    toast.dismiss(processingToast);
    
    toast.success(
      (t) => (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl"></span>
            <span className="font-bold text-lg">
              {allowDuplicateBooking ? 'Booking Updated!' : 'Booking Successful!'}
            </span>
          </div>
          <p className="text-xs mt-2 opacity-90">
            {allowDuplicateBooking 
              ? `Added ${seatsToBook} more seat${seatsToBook > 1 ? 's' : ''} to your booking`
              : 'Check your bookings page for details'
            }
          </p>
        </div>
      ),
      {
        duration: 5000,
        position: 'top-center',
        style: {
          background: '#10B981',
          color: '#fff',
          fontWeight: '600',
          padding: '20px',
          borderRadius: '12px',
          maxWidth: '400px',
        },
      }
    );

    if (onBookingSuccess) {
      onBookingSuccess();
    }

    setTimeout(() => {
      setShowBookingModal(false);
      setSeatsToBook(1);
      setPickupLocation(ride.start);
      setDropLocation(ride.end);
      setPassengerNotes('');
      setAllowDuplicateBooking(false);
    }, 1000);

  } catch (error) {
    toast.dismiss(processingToast);
    const errorMessage = error.response?.data?.message || 'Failed to book ride';
    
    toast.error(
      (t) => (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold">Booking Failed</span>
          </div>
          <p className="text-sm">{errorMessage}</p>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="mt-2 text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            Dismiss
          </button>
        </div>
      ),
      {
        duration: 6000,
        position: 'top-center',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
          maxWidth: '400px',
        },
      }
    );
  } finally {
    setIsBooking(false);
  }
};

  const handleCloseBookingModal = () => {
    if (isBooking) {
      toast('Please wait while we process your booking', {
        duration: 2000,
        position: 'top-center',
        icon: '⏳',
        style: {
          background: '#F59E0B',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
      });
      return;
    }
    setShowBookingModal(false);
    setAllowDuplicateBooking(false);
  };

  const handleSeatsChange = (newSeats) => {
    setSeatsToBook(parseInt(newSeats));
    
    if (parseInt(newSeats) > 1) {
      let totalFare = 0;
     if (ride.matchType === 'on_route' && ride.userSearchDistance && perKmRate) {
  totalFare = calculateSegmentFare(perKmRate, ride.userSearchDistance, parseInt(newSeats));
} else if (fareMode === 'per_km' && (ride.userSearchDistance || totalDistance) && perKmRate) {
  const dist = ride.userSearchDistance || totalDistance;
  totalFare = calculateSegmentFare(perKmRate, dist, parseInt(newSeats));
} else {
  totalFare = calculatePassengerFare(ride.fare || 0, parseInt(newSeats)).total;
}
      
      toast(`${newSeats} seats selected - ₹${totalFare.toFixed(2)} total`, {
        duration: 2000,
        position: 'top-center',
        icon: '🎫',
        style: {
          background: '#6366F1',
          color: '#fff',
          fontWeight: '600',
          padding: '12px 16px',
          borderRadius: '12px',
          fontSize: '14px',
        },
      });
    }
  };

  // Get driver info
  const driverData = ride.driver || ride.driverId || ride.postedBy || {};
  const driverInfo = ride.driverInfo || {};
  
  const driverName = driverData.name || driverInfo.name || 'Unknown';
  const driverPhone = driverInfo.phone || driverData.phone || ride.phoneNumber || 'Not provided';
  const driverGender = driverInfo.gender || driverData.gender || '';
  const driverAge = driverInfo.age || driverData.age || '';
  const driverVerified = driverData.verified || driverInfo.verified || false;
  const driverEmergencyContact = driverInfo.emergencyContact || '';
  const driverEmergencyContactName = driverInfo.emergencyContactName || '';
  
  const vehicleInfo = ride.vehicle || {};
  const vehicleNumber = vehicleInfo.number || ride.vehicleNumber || 'Not provided';
  const vehicleType = vehicleInfo.type || 'Sedan';
  const vehicleModel = vehicleInfo.model || '';
  const vehicleColor = vehicleInfo.color || '';
  const acAvailable = vehicleInfo.acAvailable !== false;
  const luggageSpace = vehicleInfo.luggageSpace || 'Medium';

  const preferences = ride.preferences || {};
  const fareMode = ride.fareMode || 'fixed';
  const perKmRate = ride.perKmRate || 0;
  const totalDistance = ride.totalDistance || 0;
  const estimatedDuration = ride.estimatedDuration || 0;

  return (
    <>
      <div 
        id={`ride-${ride._id}`}
        className="border-2 border-gray-200 rounded-2xl p-4 sm:p-6 hover:border-blue-400 hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-white via-gray-50 to-blue-50 relative"
      >        
        {/* Booking Status Badge */}
        {bookingBadge && (
          <div className={`absolute top-4 left-4 bg-gradient-to-r ${bookingBadge.bgColor} text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xl z-10 border-2 border-white`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{bookingBadge.icon}</span>
              <div className="flex flex-col">
                <span className="leading-tight">{bookingBadge.text}</span>
                {bookingBadge.subText && (
                  <span className="text-[10px] opacity-90 font-medium leading-tight mt-0.5">
                    {bookingBadge.subText}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Verified Badge */}
        {driverVerified && (
          <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg z-10">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Verified Driver
          </div>
        )}

        {/* Route Header */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-5">
          <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
            <p className="text-lg sm:text-2xl font-bold text-green-600 text-center">{ride.start}</p>
            <span className="text-lg sm:text-2xl text-gray-400">→</span>
            <p className="text-lg sm:text-2xl font-bold text-blue-600 text-center">{ride.end}</p>
          </div>
        </div>

        {/* Distance & Duration Badge */}
        {totalDistance > 0 && (
          <div className="flex justify-center gap-3 mb-4">
            <div className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              {totalDistance} km
            </div>
            {estimatedDuration > 0 && (
              <div className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ~{Math.round(estimatedDuration / 60)} hrs
              </div>
            )}
          </div>
        )}

        {/* User Segment Info */}
        {ride.matchType === 'on_route' && ride.userSearchDistance && (
          <div className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border-2 border-green-300">
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-green-800">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Your Journey: {ride.userSearchDistance} km</span>
              {ride.matchQuality && (
                <span className="text-xs bg-green-200 px-2 py-0.5 rounded-full">
                  {ride.matchQuality}% Match
                </span>
              )}
            </div>
          </div>
        )}

        {/* Main Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          
          {/* Driver */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 text-center border-2 border-purple-200 hover:shadow-md transition-all">
            <div className="flex justify-center mb-1">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-xs text-gray-600 font-medium mb-1">Driver</p>
            <p className="text-sm font-bold text-gray-900 truncate" title={driverName}>
              {driverName}
            </p>
            {driverAge && (
              <p className="text-xs text-gray-500">{driverAge} yrs</p>
            )}
          </div>

          {/* Seats */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 text-center border-2 border-blue-200 hover:shadow-md transition-all">
            <div className="flex justify-center mb-1">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-xs text-gray-600 font-medium mb-1">Available</p>
            <p className="text-lg font-bold text-blue-600">{availableSeats}/{totalSeats}</p>
            {bookedSeatsCount > 0 && (
              <p className="text-xs text-gray-500 mt-1">{bookedSeatsCount} booked</p>
            )}
          </div>

          {/* Date */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 text-center border-2 border-purple-200 hover:shadow-md transition-all">
            <div className="flex justify-center mb-1">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-xs text-gray-600 font-medium mb-1">Date</p>
            <p className="text-xs font-bold text-gray-900">{formatDate(ride.date)}</p>
          </div>

          {/* Time */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3 text-center border-2 border-orange-200 hover:shadow-md transition-all">
            <div className="flex justify-center mb-1">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs text-gray-600 font-medium mb-1">Time</p>
            <p className="text-sm font-bold text-gray-900">{formatTime(ride.time)}</p>
          </div>

          {/* Fare */}
          <div 
            className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 text-center border-2 border-green-200 relative hover:shadow-md transition-all cursor-help"
            onMouseEnter={() => setHoveredFare(true)}
            onMouseLeave={() => setHoveredFare(false)}
          >
            <div className="flex justify-center mb-1 gap-1">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-xs text-gray-600 font-medium mb-1">
              {ride.matchType === 'on_route' && ride.segmentFare ? 'Your Fare' : (fareMode === 'per_km' ? 'Base Rate' : 'Per Seat')}
            </p>
            <p className="text-xl font-bold text-green-600">
              {ride.matchType === 'on_route' && ride.segmentFare ? 
                `₹${                          (perKmRate * ride.userSearchDistance + (perKmRate * ride.userSearchDistance * 0.08) + (perKmRate * ride.userSearchDistance * 0.08 * 0.18)).toFixed(2)
}` :
                (fareMode === 'per_km' ? 
                  `₹${perKmRate}/km` : 
                  `₹${singleSeatFare.total.toFixed(2)}`
                )
              }
            </p>
            
            {/* Hover Tooltip */}
            {hoveredFare && (
              <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-xs rounded-xl shadow-2xl p-4 pointer-events-none">
                <div className="space-y-3">
                  <div className="font-semibold text-sm border-b border-gray-700 pb-2">
                    {ride.matchType === 'on_route' && ride.segmentFare 
                      ? '🎯 Your Segment Fare' 
                      : (fareMode === 'per_km' ? ' Per KM Pricing Model' : ' Fixed Fare Breakdown')
                    }
                  </div>
                  
                  {ride.matchType === 'on_route' && ride.segmentFare ? (
                    <>
                      <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">Driver Per KM Rate:</span>
                          <span className="font-semibold text-green-400">₹{perKmRate}/km</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">Your Distance:</span>
                          <span className="font-semibold text-green-400">{ride.userSearchDistance} km</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                          <span className="text-gray-300">Base Amount:</span>
                          <span className="font-semibold">₹{(perKmRate * ride.userSearchDistance).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400">Platform Fee (8%):</span>
                          <span className="font-semibold text-gray-300">₹{(perKmRate * ride.userSearchDistance * 0.08).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400">GST (18% on fee):</span>
                          <span className="font-semibold text-gray-300">₹{(perKmRate * ride.userSearchDistance * 0.08 * 0.18).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                          <span className="text-white font-bold">Your Segment Fare:</span>
                          <span className="font-bold text-green-400">₹{
                          (perKmRate * ride.userSearchDistance + (perKmRate * ride.userSearchDistance * 0.08) + (perKmRate * ride.userSearchDistance * 0.08 * 0.18)).toFixed(2)
                          }</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-500 italic">
                        * Your segment fare includes driver's base rate + 8% platform fee + 18% GST on platform fee
                      </div>
                    </>
                  ) : fareMode === 'per_km' ? (
                    <>
                      <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">Driver Rate:</span>
                          <span className="font-semibold text-green-400">₹{perKmRate}/km</span>
                        </div>
                        <div className="text-xs text-gray-400 italic mt-2">
                          + Platform Fee: 8% of fare + GST (18%)
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-500 italic">
                        * Final amount calculated based on actual distance traveled
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Base Fare:</span>
                        <span className="font-semibold">₹{(ride.fare || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Platform Fee (15%):</span>
                        <span className="font-semibold">₹{singleSeatFare.passengerServiceFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">GST (18%):</span>
                        <span className="font-semibold">₹{singleSeatFare.passengerServiceFeeGST.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-gray-700 pt-2 mt-2">
                        <div className="flex justify-between items-center font-bold">
                          <span>Total per Seat:</span>
                          <span className="text-green-400">₹{singleSeatFare.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                  <div className="border-8 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="mb-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-3 border-2 border-gray-200">
          <div className="flex items-center justify-center gap-3 text-sm">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="font-bold text-gray-800">{vehicleType}</span>
            {vehicleModel && (
              <>
                <span className="text-gray-400">•</span>
                <span className="text-gray-700">{vehicleModel}</span>
              </>
            )}
            {vehicleColor && (
              <>
                <span className="text-gray-400">•</span>
                <span className="text-gray-700">{vehicleColor}</span>
              </>
            )}
          </div>
        </div>

        {/* Preferences Pills */}
        <div className="mb-5 flex flex-wrap gap-2 justify-center">
          {acAvailable && (
            <span className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 rounded-full text-xs font-bold shadow-sm">
               AC Available
            </span>
          )}
          {preferences.musicAllowed && (
            <span className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-full text-xs font-bold shadow-sm">
               Music
            </span>
          )}
          {preferences.petFriendly && (
            <span className="px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-full text-xs font-bold shadow-sm">
               Pet Friendly
            </span>
          )}
          {preferences.womenOnly && (
            <span className="px-3 py-1.5 bg-gradient-to-r from-pink-100 to-rose-100 text-pink-700 rounded-full text-xs font-bold shadow-sm">
               Women Only
            </span>
          )}
          {preferences.smokingAllowed && (
            <span className="px-3 py-1.5 bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 rounded-full text-xs font-bold shadow-sm">
               Smoking OK
            </span>
          )}
          {luggageSpace !== 'None' && (
            <span className="px-3 py-1.5 bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 rounded-full text-xs font-bold shadow-sm">
               {luggageSpace} Luggage
            </span>
          )}
          {ride.tollIncluded && (
            <span className="px-3 py-1.5 bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-700 rounded-full text-xs font-bold shadow-sm">
               Toll Included
            </span>
          )}
          {ride.negotiableFare && (
            <span className="px-3 py-1.5 bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 rounded-full text-xs font-bold shadow-sm">
               Negotiable
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowDetailsModal(true)}
            className="flex-1 bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 rounded-xl font-bold hover:from-purple-700 hover:to-purple-600 transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-xl transform hover:scale-[1.02]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Details</span>
          </button>
          
          <button
            onClick={handleBookNow}
            disabled={availableSeats === 0}
            className="flex-1 bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-3 rounded-xl font-bold hover:from-green-700 hover:to-green-600 transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>{availableSeats === 0 ? 'Full' : 'Book Now'}</span>
          </button>
          
          <button
            onClick={handleViewContact}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-blue-600 transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-xl transform hover:scale-[1.02]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>Contact</span>
          </button>
        </div>
      </div>

      {/* BOOKING MODAL WITH ENHANCED SEGMENT FARE DETAILS */}
      {showBookingModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300">
            
            <div className="bg-gradient-to-r from-green-600 to-green-500 text-white p-6 rounded-t-2xl sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">Book Your Ride</h3>
                  {ride.matchType === 'on_route' && (
                    <p className="text-green-100 mt-1 text-xs font-semibold flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Route Matched - Segment Booking
                    </p>
                  )}
                </div>
                <button
                  onClick={handleCloseBookingModal}
                  className="text-white hover:bg-red-600 hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                  disabled={isBooking}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitBooking} className="p-6 space-y-5">
              
              {/* ROUTE VISUALIZATION */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Journey Overview
                </h4>

                {ride.matchType === 'on_route' && ride.userSearchDistance ? (
                  /* SEGMENT BOOKING */
                  <div className="space-y-4">
                    {/* Driver's Full Route */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                        Driver's Full Route
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                          <span className="text-sm font-semibold text-gray-700">{ride.start}</span>
                        </div>
                        <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="text-sm font-semibold text-gray-700">{ride.end}</span>
                          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2 text-center">
                        Total Distance: {totalDistance || 0} km • Driver Rate: ₹{perKmRate}/km
                      </div>
                    </div>

                    {/* Your Booked Segment */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-300">
                      <div className="text-xs font-semibold text-green-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Your Booked Segment
                      </div>
                      
                      <div className="space-y-3">
                        {/* Pickup Point */}
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold shadow-lg">
                              C
                            </div>
                            <div className="w-1 h-12 bg-green-400"></div>
                          </div>
                          <div className="flex-1 pt-2">
                            <div className="text-xs text-green-700 font-semibold mb-1">PICKUP POINT</div>
                            <div className="font-bold text-gray-900">{ride.userPickup || ride.start}</div>
                          </div>
                        </div>

                        {/* Distance Badge */}
                        <div className="ml-5 bg-white rounded-lg px-4 py-2 border-2 border-green-300 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700">Your Travel Distance:</span>
                            <span className="text-lg font-bold text-green-600">
                              {ride.userSearchDistance} km
                            </span>
                          </div>
                          {ride.matchQuality && (
                            <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              {ride.matchQuality}% Route Match
                            </div>
                          )}
                        </div>

                        {/* Drop Point */}
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-1 h-12 bg-green-400"></div>
                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shadow-lg">
                              D
                            </div>
                          </div>
                          <div className="flex-1 pt-2">
                            <div className="text-xs text-blue-700 font-semibold mb-1">DROP POINT</div>
                            <div className="font-bold text-gray-900">{ride.userDrop || ride.end}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Match Quality Indicator */}
                    {ride.matchQuality && (
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${ride.matchQuality}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-green-600">{ride.matchQuality}%</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* FULL ROUTE BOOKING */
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold shadow-lg">
                          A
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 font-semibold">FROM</div>
                          <div className="font-bold text-gray-900">{ride.start}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center">
                      <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
                      <div className="px-3 text-sm font-semibold text-gray-600">
                        {totalDistance} km
                      </div>
                      <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shadow-lg">
                          B
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 font-semibold">TO</div>
                          <div className="font-bold text-gray-900">{ride.end}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
























              {/* Seats Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Number of Seats
                </label>
                <select
                  value={seatsToBook}
                  onChange={(e) => handleSeatsChange(e.target.value)}
                  className="w-full border-2 border-gray-300 px-4 py-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  required
                  disabled={isBooking}
                >
                  {[...Array(availableSeats)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} {i === 0 ? 'seat' : 'seats'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Show pickup/drop inputs ONLY if not route-matched */}
              {ride.matchType !== 'on_route' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Pickup Location (Optional)
                    </label>
                    <input
                      type="text"
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      className="w-full border-2 border-gray-300 px-4 py-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
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
                      className="w-full border-2 border-gray-300 px-4 py-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      placeholder="Specify exact drop point"
                      disabled={isBooking}
                    />
                  </div>
                </>
              )}

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={passengerNotes}
                  onChange={(e) => setPassengerNotes(e.target.value)}
                  className="w-full border-2 border-gray-300 px-4 py-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
                  rows="3"
                  placeholder="Any special requirements or messages for the driver..."
                  disabled={isBooking}
                />
              </div>

              {/* ENHANCED FARE BREAKDOWN */}
              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-5 space-y-3 border-2 border-green-200">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  {ride.matchType === 'on_route' && ride.segmentFare ? 'Your Segment Fare Breakdown' : 'Fare Breakdown'}
                </h4>
                
                {ride.matchType === 'on_route' && ride.segmentFare ? (
                  /* SEGMENT FARE - ENHANCED */
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 border-2 border-indigo-200">
                      <div className="text-xs font-semibold text-indigo-800 mb-3 uppercase tracking-wide">
                        🎯 Your Segment Pricing Details
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">Driver's Per KM Rate:</span>
                          <span className="font-bold text-indigo-700">₹{perKmRate}/km</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">Your Distance (C→D):</span>
                          <span className="font-bold text-indigo-700">{ride.userSearchDistance} km</span>
                        </div>
                        <div className="pt-2 border-t border-indigo-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-700">Base Amount:</span>
                            <span className="font-bold text-indigo-900">
                              ₹{(perKmRate * ride.userSearchDistance).toFixed(2)}
                            </span>
                          </div>
                          <div className="text-xs text-indigo-600 mt-1 text-right">
                            (₹{perKmRate} × {ride.userSearchDistance} km)
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border-2 border-gray-200 space-y-3">
                      <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                        💰 Fare Breakdown ({seatsToBook} seat{seatsToBook > 1 ? 's' : ''})
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Base Fare:</span>
                          <span className="font-semibold text-gray-900">
                            ₹{(perKmRate * ride.userSearchDistance * seatsToBook).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Platform Fee (8%):</span>
                          <span className="font-semibold text-gray-900">
                            ₹{(perKmRate * ride.userSearchDistance * seatsToBook * 0.08).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">GST (18% on platform fee):</span>
                          <span className="font-semibold text-gray-900">
                            ₹{(perKmRate * ride.userSearchDistance * seatsToBook * 0.08 * 0.18).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg p-4 shadow-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-xs opacity-90 mb-1">Your Total Amount</div>
                          <div className="text-2xl font-bold">₹{(ride.segmentFare * seatsToBook).toFixed(2)}</div>
                        </div>
                        <svg className="w-12 h-12 opacity-20" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <div className="flex items-start gap-2">
                        <span className="text-lg text-green-600">✓</span>
                        <div className="text-xs text-green-800">
                          <strong>Smart Pricing:</strong> You're paying only for your {ride.userSearchDistance} km segment, 
                          not the full {totalDistance} km route. This includes all fees and taxes.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : fareMode === 'per_km' ? (
                  /* PER KM PRICING */
                  <div className="space-y-3">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="text-xs font-semibold text-blue-800 mb-2"> Per Kilometer Pricing</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Driver Rate:</span>
                          <span className="font-semibold">₹{perKmRate}/km</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            {ride.userSearchDistance ? 'Your Distance:' : 'Total Distance:'}
                          </span>
                          <span className="font-bold text-blue-700">
                            {ride.userSearchDistance || totalDistance} km
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                          <span className="text-gray-600">Base ({seatsToBook} seat{seatsToBook > 1 ? 's' : ''}):</span>
                          <span className="font-semibold text-green-700">
                            ₹{((ride.userSearchDistance || totalDistance) * perKmRate * seatsToBook).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Platform Fee (8%):</span>
                        <span className="font-semibold">
                          ₹{((ride.userSearchDistance || totalDistance) * perKmRate * seatsToBook * 0.08).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">GST (18%):</span>
                        <span className="font-semibold">
                          ₹{((ride.userSearchDistance || totalDistance) * perKmRate * seatsToBook * 0.08 * 0.18).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border-2 border-green-300">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-800 text-lg">Total Amount:</span>
                        <span className="font-bold text-green-600 text-2xl">
                          ₹{(
                            ((ride.userSearchDistance || totalDistance) * perKmRate * seatsToBook) + 
                            ((ride.userSearchDistance || totalDistance) * perKmRate * seatsToBook * 0.08) + 
                            ((ride.userSearchDistance || totalDistance) * perKmRate * seatsToBook * 0.08 * 0.18)
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* FIXED FARE */
                  <div className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Base Fare ({seatsToBook} × ₹{(ride.fare || 0).toFixed(2)}):</span>
                        <span className="font-semibold">₹{fareDetails.baseFare.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Platform Fee (8%):</span>
                        <span className="font-semibold">₹{fareDetails.passengerServiceFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">GST (18%):</span>
                        <span className="font-semibold">₹{fareDetails.passengerServiceFeeGST.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border-2 border-green-300">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-800 text-lg">Total Amount:</span>
                        <span className="font-bold text-green-600 text-2xl">
                          ₹{fareDetails.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Info */}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-xs text-blue-800">
                      <strong>Payment:</strong> You'll complete payment after the driver confirms your booking request.
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseBookingModal}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
                  disabled={isBooking}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-600 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                  disabled={isBooking}
                >
                  {isBooking ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Confirm Booking</span>
                    </>
                  )}
                </button>
              </div>

              {isBooking && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-3 animate-pulse">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="font-medium text-sm">Please wait, processing your booking request...</span>
                </div>
              )}
            </form>
          </div>
        </div>
      )}



{showDetailsModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-purple-500 text-white p-6 rounded-t-2xl sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">Ride Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 font-semibold transition-all ${
                    activeTab === 'overview' 
                      ? 'text-purple-600 border-b-2 border-purple-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('driver')}
                  className={`px-4 py-2 font-semibold transition-all ${
                    activeTab === 'driver' 
                      ? 'text-purple-600 border-b-2 border-purple-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Driver
                </button>
                <button
                  onClick={() => setActiveTab('vehicle')}
                  className={`px-4 py-2 font-semibold transition-all ${
                    activeTab === 'vehicle' 
                      ? 'text-purple-600 border-b-2 border-purple-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Vehicle
                </button>
                <button
                  onClick={() => setActiveTab('preferences')}
                  className={`px-4 py-2 font-semibold transition-all ${
                    activeTab === 'preferences' 
                      ? 'text-purple-600 border-b-2 border-purple-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Preferences
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border-2 border-green-200">
                    <h4 className="font-bold text-gray-800 mb-3">Route Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">From:</span>
                        <span className="font-bold text-green-600">{ride.start}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">To:</span>
                        <span className="font-bold text-blue-600">{ride.end}</span>
                      </div>
                      {totalDistance > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Distance:</span>
                          <span className="font-bold">{totalDistance} km</span>
                        </div>
                      )}
                      {estimatedDuration > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Duration:</span>
                          <span className="font-bold">~{Math.round(estimatedDuration / 60)} hours</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
                    <h4 className="font-bold text-gray-800 mb-3">Schedule</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-bold">{formatDate(ride.date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time:</span>
                        <span className="font-bold">{formatTime(ride.time)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Available Seats:</span>
                        <span className="font-bold text-blue-600">{availableSeats} / {totalSeats}</span>
                      </div>
                      {bookedSeatsCount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Booked Seats:</span>
                          <span className="font-bold text-orange-600">{bookedSeatsCount}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                    <h4 className="font-bold text-gray-800 mb-3">💰 Pricing Details</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fare Mode:</span>
                        <span className="font-bold capitalize">
                          {fareMode === 'per_km' ? ' Per Kilometer' : '💵 Fixed Rate'}
                        </span>
                      </div>
                      
                      {fareMode === 'per_km' ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Driver Rate:</span>
                            <span className="font-bold text-green-600">₹{perKmRate.toFixed(2)}/km</span>
                          </div>
                          
                          {totalDistance > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Estimated Distance:</span>
                              <span className="font-bold">{totalDistance} km</span>
                            </div>
                          )}
                          
                          <div className="bg-blue-50 rounded-lg p-3 mt-3 border border-blue-200">
                            <div className="text-xs font-semibold text-blue-800 mb-2">📊 Payment Calculation:</div>
                            <div className="text-xs text-gray-700 space-y-1">
                              <div><strong>Base Fare:</strong> Actual Distance × ₹{perKmRate}/km × Seats</div>
                              <div><strong>Platform Fee:</strong> 8% of base fare</div>
                              <div><strong>GST:</strong> 18% of platform fee</div>
                              <div className="pt-2 mt-2 border-t border-blue-200 font-semibold text-blue-900">
                                Total = Base + Platform Fee + GST
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-[10px] text-gray-500 italic mt-2">
                            * Final payment calculated after ride based on actual distance
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Base Fare:</span>
                            <span className="font-bold">₹{(ride.fare || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Platform Fee (8%):</span>
                            <span className="font-bold">₹{singleSeatFare.passengerServiceFee.toFixed(2)}/seat</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">GST (18%):</span>
                            <span className="font-bold">₹{singleSeatFare.passengerServiceFeeGST.toFixed(2)}/seat</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-green-300 mt-2">
                            <span className="text-gray-600">Total per Seat:</span>
                            <span className="font-bold text-green-600">₹{singleSeatFare.total.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                      
                      {ride.tollIncluded && (
                        <div className="mt-2 pt-2 border-t border-green-200">
                          <span className="text-xs text-green-700 font-medium">✓ Toll charges included</span>
                        </div>
                      )}
                      {ride.negotiableFare && (
                        <div className="mt-1">
                          <span className="text-xs text-yellow-700 font-medium">💰 Fare is negotiable</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {ride.notes && (
                    <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                      <h4 className="font-bold text-gray-800 mb-2">Notes</h4>
                      <p className="text-gray-700 text-sm">{ride.notes}</p>
                    </div>
                  )}

                  {ride.pickupInstructions && (
                    <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-200">
                      <h4 className="font-bold text-gray-800 mb-2">Pickup Instructions</h4>
                      <p className="text-gray-700 text-sm">{ride.pickupInstructions}</p>
                    </div>
                  )}

                  {ride.dropInstructions && (
                    <div className="bg-teal-50 rounded-lg p-4 border-2 border-teal-200">
                      <h4 className="font-bold text-gray-800 mb-2">Drop Instructions</h4>
                      <p className="text-gray-700 text-sm">{ride.dropInstructions}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'driver' && (
                <div className="space-y-4">
                  <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{driverName}</h3>
                        {driverVerified && (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold mt-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Verified Driver
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {driverAge && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Age:</span>
                          <span className="font-bold">{driverAge} years</span>
                        </div>
                      )}
                      {driverGender && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Gender:</span>
                          <span className="font-bold capitalize">{driverGender}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-bold">{driverPhone}</span>
                      </div>
                    </div>
                  </div>

                  {(driverEmergencyContact || driverEmergencyContactName) && (
                    <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
                      <h4 className="font-bold text-gray-800 mb-2">Emergency Contact</h4>
                      <div className="space-y-1">
                        {driverEmergencyContactName && (
                          <p className="text-sm"><span className="text-gray-600">Name:</span> <span className="font-semibold">{driverEmergencyContactName}</span></p>
                        )}
                        {driverEmergencyContact && (
                          <p className="text-sm"><span className="text-gray-600">Phone:</span> <span className="font-semibold">{driverEmergencyContact}</span></p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'vehicle' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                    <h4 className="font-bold text-gray-800 mb-3">Vehicle Details</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-bold">{vehicleType}</span>
                      </div>
                      {vehicleModel && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Model:</span>
                          <span className="font-bold">{vehicleModel}</span>
                        </div>
                      )}
                      {vehicleColor && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Color:</span>
                          <span className="font-bold">{vehicleColor}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Number:</span>
                        <span className="font-bold uppercase">{vehicleNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">AC:</span>
                        <span className="font-bold">{acAvailable ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Luggage Space:</span>
                        <span className="font-bold">{luggageSpace}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                    <h4 className="font-bold text-gray-800 mb-3">Ride Preferences</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`p-3 rounded-lg ${preferences.smokingAllowed ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'} border-2`}>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{preferences.smokingAllowed ? '✓' : '✗'}</span>
                          <span className="text-sm font-semibold">Smoking</span>
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${preferences.musicAllowed ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'} border-2`}>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{preferences.musicAllowed ? '✓' : '✗'}</span>
                          <span className="text-sm font-semibold">Music</span>
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${preferences.petFriendly ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'} border-2`}>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{preferences.petFriendly ? '✓' : '✗'}</span>
                          <span className="text-sm font-semibold">Pets</span>
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${preferences.luggageAllowed ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'} border-2`}>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{preferences.luggageAllowed ? '✓' : '✗'}</span>
                          <span className="text-sm font-semibold">Luggage</span>
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${preferences.talkative ? 'bg-green-100 border-green-300' : 'bg-yellow-100 border-yellow-300'} border-2`}>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{preferences.talkative ? '💬' : '🤫'}</span>
                          <span className="text-sm font-semibold">{preferences.talkative ? 'Talkative' : 'Quiet'}</span>
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${preferences.childSeatAvailable ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'} border-2`}>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{preferences.childSeatAvailable ? '✓' : '✗'}</span>
                          <span className="text-sm font-semibold">Child Seat</span>
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${preferences.womenOnly ? 'bg-pink-100 border-pink-300' : 'bg-gray-100 border-gray-300'} border-2`}>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{preferences.womenOnly ? '👩' : '👥'}</span>
                          <span className="text-sm font-semibold">{preferences.womenOnly ? 'Women Only' : 'All Welcome'}</span>
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${preferences.pickupFlexibility ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'} border-2`}>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{preferences.pickupFlexibility ? '✓' : '✗'}</span>
                          <span className="text-sm font-semibold">Flexible Pickup</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}















      {/* CONTACT MODAL - COMPLETE */}
      {showContactModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-blue-100/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto my-8">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-6 rounded-t-2xl sticky top-0 z-10">
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
                <p className="text-lg font-bold text-gray-900">{driverName}</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-2">Phone Number</p>
                <p className="text-lg font-bold text-gray-900">{driverPhone}</p>
              </div>
              
              {driverAge && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-2">Age</p>
                  <p className="text-base font-semibold text-gray-900">{driverAge} years</p>
                </div>
              )}
              
              {driverGender && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-2">Gender</p>
                  <p className="text-base font-semibold text-gray-900 capitalize">{driverGender}</p>
                </div>
              )}
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-2">Vehicle Number</p>
                <p className="text-lg font-bold text-gray-900 uppercase">{vehicleNumber}</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-2">Vehicle Details</p>
                <p className="text-base font-semibold text-gray-900">
                  {vehicleType}
                  {vehicleModel && ` - ${vehicleModel}`}
                  {vehicleColor && ` (${vehicleColor})`}
                </p>
              </div>

              {driverVerified && (
                <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-bold text-blue-800">Verified Driver</span>
                  </div>
                </div>
              )}

              {(driverEmergencyContact || driverEmergencyContactName) && (
                <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
                  <p className="text-sm font-bold text-red-800 mb-2">Emergency Contact</p>
                  {driverEmergencyContactName && (
                    <p className="text-sm text-gray-700 mb-1">
                      <span className="font-semibold">Name:</span> {driverEmergencyContactName}
                    </p>
                  )}
                  {driverEmergencyContact && (
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Phone:</span> {driverEmergencyContact}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DETAILS MODAL - Keep existing complete code from your original file */}
      {/* The full details modal with all tabs should be here as it was before */}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
}

export default RideCard;