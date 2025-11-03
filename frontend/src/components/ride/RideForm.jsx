import React, { useState } from 'react';

function RideForm({ onSubmit, isLoading }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [seats, setSeats] = useState(1);
  const [fare, setFare] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');

  // DRIVER SIDE CALCULATION - Split Model
  // Driver sets what they want to earn (base fare)
  const driverBaseFare = parseFloat(fare) || 0;
  
  // Platform deductions from driver's fare
  const platformFeeOnDriver = driverBaseFare * 0.08; // 8% platform fee
  const gstOnPlatformFee = platformFeeOnDriver * 0.18; // 18% GST on platform fee
  const driverDeductions = platformFeeOnDriver + gstOnPlatformFee;
  const driverNetEarning = driverBaseFare - driverDeductions;

  // Passenger side (what they will pay)
  const passengerServiceFee = 10; // ₹10 per seat
  const gstOnPassengerFee = passengerServiceFee * 0.18; // 18% GST
  const passengerTotalPerSeat = driverBaseFare + passengerServiceFee + gstOnPassengerFee;

  // Calculate totals for all seats
  const seatsCount = parseInt(seats) || 1;
  const driverTotalEarning = driverNetEarning * seatsCount;
  const passengerGrandTotal = passengerTotalPerSeat * seatsCount;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Send only the base fare to backend - backend will calculate everything
    onSubmit({ 
      start, 
      end, 
      date, 
      time, 
      seats: parseInt(seats), 
      fare: parseFloat(fare), // Driver's base fare only
      phoneNumber,
      address,
      vehicleNumber
    });
    
    // Clear form
    setStart('');
    setEnd('');
    setDate('');
    setTime('');
    setSeats(1);
    setFare('');
    setPhoneNumber('');
    setAddress('');
    setVehicleNumber('');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-2xl px-4 sm:px-6 md:px-8 py-6 sm:py-8 w-full max-w-2xl mx-auto border-2 border-gray-200">
      
      {/* Form Title */}
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
          Post a Ride 
        </h2>
        <p className="text-sm text-gray-600">Share your journey and earn</p>
      </div>

      {/* Trip Details Section */}
      <div className="mb-6 pb-6 border-b-2 border-gray-200">
        <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Trip Details
        </h3>

        {/* From Location */}
        <div className="mb-4 sm:mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            From <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Starting location (e.g., Phagwara)"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full border-2 border-gray-300 pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-sm sm:text-base"
              required
            />
          </div>
        </div>

        {/* To Location */}
        <div className="mb-4 sm:mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            To <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Destination (e.g., Chandigarh)"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full border-2 border-gray-300 pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-sm sm:text-base"
              required
            />
          </div>
        </div>

        {/* Date and Time */}
        <div className="mb-4 sm:mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border-2 border-gray-300 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-sm sm:text-base"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full border-2 border-gray-300 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-sm sm:text-base"
              required
            />
          </div>
        </div>

        {/* Seats and Fare */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Seats Available <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="8"
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              placeholder="1-8 seats"
              className="w-full border-2 border-gray-300 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-sm sm:text-base"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Your Desired Fare per Seat (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={fare}
              onChange={(e) => setFare(e.target.value)}
              placeholder="e.g., 500"
              className="w-full border-2 border-gray-300 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-sm sm:text-base"
              required
            />
          </div>
        </div>
      </div>

      {/* Fare Breakdown Section - DRIVER VIEW */}
      {fare && parseFloat(fare) > 0 && (
        <div className="mb-6 pb-6 border-b-2 border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Your Earnings (Per Seat)
          </h3>

          <div className="bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 rounded-xl p-5 border-2 border-green-200 shadow-inner">
            {/* Driver's Earning Breakdown */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 font-medium">Your Base Fare:</span>
                <span className="font-semibold text-gray-800">₹{driverBaseFare.toFixed(2)}</span>
              </div>
              
              <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                <p className="text-xs font-semibold text-red-700 mb-2">Deductions:</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-red-600">Platform Fee (8%):</span>
                    <span className="font-semibold text-red-700">- ₹{platformFeeOnDriver.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-red-600">GST on Platform Fee (18%):</span>
                    <span className="font-semibold text-red-700">- ₹{gstOnPlatformFee.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="border-t-2 border-gray-300 pt-3 flex justify-between items-center bg-white rounded-lg p-3 shadow-sm">
                <span className="font-bold text-gray-800 text-base">You Receive per Seat:</span>
                <span className="font-bold text-green-600 text-xl">₹{driverNetEarning.toFixed(2)}</span>
              </div>
            </div>

            {/* Total Earning for All Seats */}
            <div className="border-t-2 border-green-300 pt-4 mt-4">
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-4 shadow-md border-2 border-green-300">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="font-bold text-gray-800 text-base block">Total You'll Earn</span>
                    <span className="text-xs text-gray-600">
                      ({seatsCount} seat{seatsCount > 1 ? 's' : ''} × ₹{driverNetEarning.toFixed(2)})
                    </span>
                  </div>
                  <span className="font-bold text-green-600 text-2xl">₹{driverTotalEarning.toFixed(2)}</span>
                </div>
                <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Net amount you receive if all seats are booked
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-xs font-semibold text-blue-800 mb-1">What passengers will pay (per seat):</p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  ₹{passengerTotalPerSeat.toFixed(2)} (includes ₹{driverBaseFare.toFixed(2)} base + ₹{passengerServiceFee.toFixed(2)} service fee + ₹{gstOnPassengerFee.toFixed(2)} GST)
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-xs font-semibold text-yellow-800 mb-1">How it works:</p>
                <p className="text-xs text-yellow-700 leading-relaxed">
                  You set ₹{driverBaseFare.toFixed(2)} as your desired earning. Platform deducts ₹{driverDeductions.toFixed(2)} (8% fee + GST). Passengers pay ₹{passengerTotalPerSeat.toFixed(2)} (your base + their service fee + GST).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Details Section */}
      <div className="mb-6 pb-6 border-b-2 border-gray-200">
        <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          Contact Details
        </h3>

        {/* Phone Number */}
        <div className="mb-4 sm:mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <input
              type="tel"
              placeholder="+91 9876543210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              pattern="[0-9+\s-]+"
              className="w-full border-2 border-gray-300 pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-sm sm:text-base"
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Passengers will contact you on this number</p>
        </div>

        {/* Address */}
        <div className="mb-4 sm:mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Pickup Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute top-3 left-0 pl-3 pointer-events-none">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <textarea
              placeholder="Enter your pickup address (street, landmark, city)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows="3"
              className="w-full border-2 border-gray-300 pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none resize-none text-sm sm:text-base"
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Exact location where passengers can meet you</p>
        </div>
      </div>

      {/* Vehicle Details Section */}
      <div className="mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
          </svg>
          Vehicle Details
        </h3>

        {/* Vehicle Number */}
        <div className="mb-4 sm:mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Vehicle Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="e.g., PB10AB1234"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              className="w-full border-2 border-gray-300 pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-sm sm:text-base uppercase"
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Your vehicle registration number for passenger safety</p>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full cursor-pointer bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-3 sm:py-4 rounded-xl font-bold hover:from-blue-700 hover:to-blue-600 hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-200 text-base sm:text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Posting Ride...
          </span>
        ) : (
          ' Post Ride'
        )}
      </button>

      {/* Info Note */}
      <p className="text-xs text-center text-gray-500 mt-4 flex items-center justify-center gap-1">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        All fields marked with <span className="text-red-500 font-semibold">*</span> are mandatory
      </p>
    </form>
  );
}

export default RideForm;