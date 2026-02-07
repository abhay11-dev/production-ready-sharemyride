import React, { useState } from 'react';

function RideForm({ onSubmit, isLoading }) {
  // Basic trip details
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [seats, setSeats] = useState(1);
  const [fare, setFare] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  
  // Route and distance tracking
  const [waypoints, setWaypoints] = useState([]);
  const [totalDistance, setTotalDistance] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [pricingMode, setPricingMode] = useState('fixed');
  const [perKmRate, setPerKmRate] = useState('');
  
  // Route preferences
  const [allowPartialRoute, setAllowPartialRoute] = useState(false);
  const [maxDetourAllowed, setMaxDetourAllowed] = useState('');
  const [recurringRide, setRecurringRide] = useState(false);
  const [recurringDays, setRecurringDays] = useState([]);
  
  // Pricing details
  const [tollIncluded, setTollIncluded] = useState(false);
  const [negotiableFare, setNegotiableFare] = useState(false);
  
  // Vehicle details
  const [vehicleType, setVehicleType] = useState('Sedan');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [acAvailable, setAcAvailable] = useState(true);
  const [luggageSpace, setLuggageSpace] = useState('Medium');
  
  // Driver details (embedded info)
  const [driverName, setDriverName] = useState('');
  const [driverGender, setDriverGender] = useState('');
  const [drivingLicense, setDrivingLicense] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  
  // Ride preferences
  const [smokingAllowed, setSmokingAllowed] = useState(false);
  const [musicAllowed, setMusicAllowed] = useState(true);
  const [petFriendly, setPetFriendly] = useState(false);
  const [talkative, setTalkative] = useState(true);
  const [pickupFlexibility, setPickupFlexibility] = useState(true);
  const [luggageAllowed, setLuggageAllowed] = useState(true);
  const [womenOnly, setWomenOnly] = useState(false);
  
  // Safety features
  const [liveLocationSharing, setLiveLocationSharing] = useState(false);
  
  // Notes
  const [notes, setNotes] = useState('');
  const [pickupInstructions, setPickupInstructions] = useState('');

  // DRIVER SIDE CALCULATION - Split Model
  const driverBaseFare = parseFloat(fare) || 0;
  const platformFeeOnDriver = driverBaseFare * 0.08;
  const gstOnPlatformFee = platformFeeOnDriver * 0.18;
  const driverDeductions = platformFeeOnDriver + gstOnPlatformFee;
  const driverNetEarning = driverBaseFare - driverDeductions;

  const passengerServiceFee = 10;
  const gstOnPassengerFee = passengerServiceFee * 0.18;
  const passengerTotalPerSeat = driverBaseFare + passengerServiceFee + gstOnPassengerFee;

  const seatsCount = parseInt(seats) || 1;
  const driverTotalEarning = driverNetEarning * seatsCount;

  // Waypoint handlers
  const addWaypoint = () => {
    setWaypoints([...waypoints, { location: '', distanceFromStart: '', order: waypoints.length + 1 }]);
  };

  const removeWaypoint = (index) => {
    const updated = waypoints.filter((_, i) => i !== index);
    const reordered = updated.map((wp, i) => ({ ...wp, order: i + 1 }));
    setWaypoints(reordered);
  };

  const updateWaypoint = (index, field, value) => {
    const updated = [...waypoints];
    updated[index][field] = value;
    setWaypoints(updated);
  };

  // Recurring days handler
  const toggleRecurringDay = (day) => {
    setRecurringDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Format waypoints
    const formattedWaypoints = waypoints
      .filter(wp => wp.location.trim() && wp.distanceFromStart)
      .map(wp => ({
        location: wp.location.trim(),
        distanceFromStart: parseFloat(wp.distanceFromStart),
        order: wp.order
      }));

    // ✅ Build driverInfo object (embedded driver details) - ONLY include fields that have values
    const driverInfoData = {};
    
    if (driverName && driverName.trim()) {
      driverInfoData.name = driverName.trim();
    }
    
    if (phoneNumber && phoneNumber.trim()) {
      driverInfoData.phone = phoneNumber.trim();
    }
    
    if (driverGender && driverGender.trim()) {
      driverInfoData.gender = driverGender;
    }
    
    if (drivingLicense && drivingLicense.trim()) {
      driverInfoData.drivingLicenseNumber = drivingLicense.trim();
    }
    
    if (emergencyContact && emergencyContact.trim()) {
      driverInfoData.emergencyContact = emergencyContact.trim();
    }
    
    if (emergencyContactName && emergencyContactName.trim()) {
      driverInfoData.emergencyContactName = emergencyContactName.trim();
    }

    // Build vehicle object
    const vehicleData = {
      number: vehicleNumber.trim().toUpperCase(),
      type: vehicleType,
      acAvailable,
      luggageSpace
    };
    
    if (vehicleModel && vehicleModel.trim()) {
      vehicleData.model = vehicleModel.trim();
    }
    
    if (vehicleColor && vehicleColor.trim()) {
      vehicleData.color = vehicleColor.trim();
    }

    // Calculate base fare based on pricing mode
    let finalBaseFare = parseFloat(fare);
    if (pricingMode === 'perKm' && perKmRate && totalDistance) {
      finalBaseFare = parseFloat(perKmRate) * parseFloat(totalDistance);
    }

    // ✅ Build the complete ride data object matching backend schema EXACTLY
    const rideData = { 
      // Trip & Route Details
      start: start.trim(), 
      end: end.trim(), 
      date, 
      time, 
      seats: parseInt(seats),
      
      // Contact Details
      phoneNumber: phoneNumber.trim(),
      address: address.trim(),
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      
      // Pricing - MATCH BACKEND SCHEMA EXACTLY
      fareMode: pricingMode === 'perKm' ? 'per_km' : 'fixed',
      fare: finalBaseFare,
      tollIncluded,
      negotiableFare,
      
      // Route details
      allowPartialRoute,
      recurringRide,
      
      // Vehicle details
      vehicle: vehicleData,
      
      // ✅ CRITICAL FIX: Use 'driverInfo' instead of 'driver' for embedded details
      ...(Object.keys(driverInfoData).length > 0 && { driverInfo: driverInfoData }),
      
      // Preferences
      preferences: {
        smokingAllowed,
        musicAllowed,
        petFriendly,
        talkative,
        pickupFlexibility,
        luggageAllowed,
        womenOnly
      },
      
      // Safety
      liveLocationSharing
    };
    
    // Add optional fields only if they have values
    if (pricingMode === 'perKm' && perKmRate) {
      rideData.perKmRate = parseFloat(perKmRate);
    }
    
    if (formattedWaypoints.length > 0) {
      rideData.waypoints = formattedWaypoints;
    }
    
    if (totalDistance) {
      rideData.totalDistance = parseFloat(totalDistance);
    }
    
    if (estimatedDuration) {
      rideData.estimatedDuration = parseInt(estimatedDuration);
    }
    
    if (maxDetourAllowed) {
      rideData.maxDetourAllowed = parseFloat(maxDetourAllowed);
    }
    
    if (recurringRide && recurringDays.length > 0) {
      rideData.recurringDays = recurringDays;
    }
    
    if (notes && notes.trim()) {
      rideData.notes = notes.trim();
    }
    
    if (pickupInstructions && pickupInstructions.trim()) {
      rideData.pickupInstructions = pickupInstructions.trim();
    }
    
    console.log('📝 Final ride data being sent:', JSON.stringify(rideData, null, 2));
    
    onSubmit(rideData);
    
    // Reset form
    setStart(''); 
    setEnd(''); 
    setDate(''); 
    setTime(''); 
    setSeats(1); 
    setFare('');
    setPhoneNumber(''); 
    setAddress(''); 
    setVehicleNumber(''); 
    setWaypoints([]);
    setTotalDistance(''); 
    setEstimatedDuration(''); 
    setPerKmRate(''); 
    setPricingMode('fixed');
    setAllowPartialRoute(false); 
    setMaxDetourAllowed(''); 
    setRecurringRide(false);
    setRecurringDays([]); 
    setTollIncluded(false); 
    setNegotiableFare(false);
    setVehicleType('Sedan'); 
    setVehicleModel(''); 
    setVehicleColor('');
    setAcAvailable(true); 
    setLuggageSpace('Medium'); 
    setDriverName('');
    setDriverGender(''); 
    setDrivingLicense(''); 
    setEmergencyContact('');
    setEmergencyContactName(''); 
    setSmokingAllowed(false); 
    setMusicAllowed(true);
    setPetFriendly(false); 
    setTalkative(true); 
    setPickupFlexibility(true);
    setLuggageAllowed(true); 
    setWomenOnly(false); 
    setLiveLocationSharing(false);
    setNotes(''); 
    setPickupInstructions('');
  };

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-2xl px-4 sm:px-6 md:px-8 py-6 sm:py-8 w-full max-w-2xl mx-auto border-2 border-gray-200">
      
      {/* Form Title */}
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Post a Ride</h2>
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

        {/* Waypoints Section */}
        <div className="mb-4 sm:mb-5">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-semibold text-gray-700">
              Waypoints (Optional)
            </label>
            <button
              type="button"
              onClick={addWaypoint}
              className="text-xs sm:text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200 transition-colors font-medium"
            >
              + Add Stop
            </button>
          </div>
          
          {waypoints.length > 0 && (
            <div className="space-y-3 bg-gray-50 p-3 rounded-lg">
              {waypoints.map((waypoint, index) => (
                <div key={index} className="flex gap-2 items-start bg-white p-3 rounded-lg border border-gray-200">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Location name"
                      value={waypoint.location}
                      onChange={(e) => updateWaypoint(index, 'location', e.target.value)}
                      className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Distance from start (km)"
                      value={waypoint.distanceFromStart}
                      onChange={(e) => updateWaypoint(index, 'distanceFromStart', e.target.value)}
                      min="0"
                      step="0.1"
                      className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeWaypoint(index)}
                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">Add intermediate stops along your route</p>
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

        {/* Distance and Duration */}
        <div className="mb-4 sm:mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Total Distance (km)
            </label>
            <input
              type="number"
              placeholder="e.g., 120"
              value={totalDistance}
              onChange={(e) => setTotalDistance(e.target.value)}
              min="0"
              step="0.1"
              className="w-full border-2 border-gray-300 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-sm sm:text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Est. Duration (min)
            </label>
            <input
              type="number"
              placeholder="e.g., 180"
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(e.target.value)}
              min="0"
              className="w-full border-2 border-gray-300 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Route Options */}
        <div className="mb-4 sm:mb-5 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowPartialRoute}
              onChange={(e) => setAllowPartialRoute(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Allow partial routes (e.g., C→D on A→C→D→B)</span>
          </label>
          
          {allowPartialRoute && (
            <div className="ml-6">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Max Detour (km)
              </label>
              <input
                type="number"
                placeholder="e.g., 5"
                value={maxDetourAllowed}
                onChange={(e) => setMaxDetourAllowed(e.target.value)}
                min="0"
                step="0.1"
                className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          )}
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

        {/* Recurring Ride */}
        <div className="mb-4 sm:mb-5">
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={recurringRide}
              onChange={(e) => setRecurringRide(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-semibold text-gray-700">Recurring Ride</span>
          </label>
          
          {recurringRide && (
            <div className="ml-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {weekDays.map(day => (
                <label key={day} className="flex items-center gap-1 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={recurringDays.includes(day)}
                    onChange={() => toggleRecurringDay(day)}
                    className="w-3 h-3 text-blue-600 rounded"
                  />
                  <span className="text-gray-700">{day.slice(0, 3)}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Seats */}
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
      </div>

      {/* Pricing Section */}
      <div className="mb-6 pb-6 border-b-2 border-gray-200">
        <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Pricing
        </h3>

        {/* Pricing Mode */}
        <div className="mb-4 sm:mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Pricing Mode</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPricingMode('fixed')}
              className={`px-4 py-3 rounded-xl font-medium transition-all ${
                pricingMode === 'fixed'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Fixed Fare
            </button>
            <button
              type="button"
              onClick={() => setPricingMode('perKm')}
              className={`px-4 py-3 rounded-xl font-medium transition-all ${
                pricingMode === 'perKm'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Per KM Rate
            </button>
          </div>
        </div>

        {/* Fare Input */}
        {pricingMode === 'fixed' ? (
          <div className="mb-4 sm:mb-5">
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
            <p className="text-xs text-gray-500 mt-1">Total fare for the entire journey</p>
          </div>
        ) : (
          <div className="mb-4 sm:mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Rate per Kilometer (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={perKmRate}
              onChange={(e) => {
                setPerKmRate(e.target.value);
                if (totalDistance) {
                  setFare((parseFloat(e.target.value) * parseFloat(totalDistance)).toFixed(2));
                }
              }}
              placeholder="e.g., 10"
              className="w-full border-2 border-gray-300 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-sm sm:text-base"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Passengers pay based on distance traveled</p>
            {totalDistance && perKmRate && (
              <p className="text-xs text-green-600 mt-1 font-semibold">
                Full journey fare: ₹{(parseFloat(perKmRate) * parseFloat(totalDistance)).toFixed(2)}
              </p>
            )}
          </div>
        )}

        {/* Pricing Options */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={tollIncluded}
              onChange={(e) => setTollIncluded(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Toll charges included</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={negotiableFare}
              onChange={(e) => setNegotiableFare(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Fare is negotiable</span>
          </label>
        </div>
      </div>

      {/* Fare Breakdown */}
      {fare && parseFloat(fare) > 0 && (
        <div className="mb-6 pb-6 border-b-2 border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Your Earnings (Per Seat)
          </h3>

          <div className="bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 rounded-xl p-5 border-2 border-green-200 shadow-inner">
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
                  Net amount if all seats booked
                </p>
              </div>
            </div>
          </div>

          
        </div>
      )}

      {/* Vehicle Details Section */}
      <div className="mb-6 pb-6 border-b-2 border-gray-200">
        <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
          </svg>
          Vehicle Details
        </h3>

        <div className="mb-4 sm:mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Vehicle Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g., PB10AB1234"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
            className="w-full border-2 border-gray-300 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-sm sm:text-base uppercase"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Type</label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full border-2 border-gray-300 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            >
              <option value="Hatchback">Hatchback</option>
              <option value="Sedan">Sedan</option>
              <option value="SUV">SUV</option>
              <option value="MUV">MUV</option>
              <option value="Bike">Bike</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Luggage Space</label>
            <select
              value={luggageSpace}
              onChange={(e) => setLuggageSpace(e.target.value)}
              className="w-full border-2 border-gray-300 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            >
              <option value="Small">Small</option>
              <option value="Medium">Medium</option>
              <option value="Large">Large</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-5">
          <input
            type="text"
            placeholder="Model (e.g., Honda City)"
            value={vehicleModel}
            onChange={(e) => setVehicleModel(e.target.value)}
            className="w-full border-2 border-gray-300 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
          />
          <input
            type="text"
            placeholder="Color (e.g., White)"
            value={vehicleColor}
            onChange={(e) => setVehicleColor(e.target.value)}
            className="w-full border-2 border-gray-300 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={acAvailable}
            onChange={(e) => setAcAvailable(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">AC Available</span>
        </label>
      </div>

      {/* Driver Details Section */}
      <div className="mb-6 pb-6 border-b-2 border-gray-200">
        <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Driver Details
        </h3>

        <div className="mb-4 sm:mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name</label>
          <input
            type="text"
            placeholder="Full name"
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
            className="w-full border-2 border-gray-300 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
            <select
              value={driverGender}
              onChange={(e) => setDriverGender(e.target.value)}
              className="w-full border-2 border-gray-300 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Driving License</label>
            <input
              type="text"
              placeholder="License number"
              value={drivingLicense}
              onChange={(e) => setDrivingLicense(e.target.value.toUpperCase())}
              className="w-full border-2 border-gray-300 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm sm:text-base uppercase"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <input
            type="text"
            placeholder="Emergency contact name"
            value={emergencyContactName}
            onChange={(e) => setEmergencyContactName(e.target.value)}
            className="w-full border-2 border-gray-300 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
          />
          <input
            type="tel"
            placeholder="Emergency contact number"
            value={emergencyContact}
            onChange={(e) => setEmergencyContact(e.target.value)}
            className="w-full border-2 border-gray-300 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Contact Details Section */}
      <div className="mb-6 pb-6 border-b-2 border-gray-200">
        <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          Contact Details
        </h3>

        <div className="mb-4 sm:mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            placeholder="+91 9876543210"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full border-2 border-gray-300 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Passengers will contact you on this number</p>
        </div>

        <div className="mb-4 sm:mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Pickup Address <span className="text-red-500">*</span>
          </label>
          <textarea
            placeholder="Enter pickup address (street, landmark, city)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows="3"
            className="w-full border-2 border-gray-300 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none text-sm sm:text-base"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Pickup Instructions (Optional)
          </label>
          <textarea
            placeholder="Any special instructions for pickup..."
            value={pickupInstructions}
            onChange={(e) => setPickupInstructions(e.target.value)}
            rows="2"
            maxLength="500"
            className="w-full border-2 border-gray-300 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none text-sm"
          />
        </div>
      </div>

      {/* Ride Preferences Section */}
      <div className="mb-6 pb-6 border-b-2 border-gray-200">
        <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Ride Preferences
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={smokingAllowed}
              onChange={(e) => setSmokingAllowed(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Smoking allowed</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={musicAllowed}
              onChange={(e) => setMusicAllowed(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Music allowed</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={petFriendly}
              onChange={(e) => setPetFriendly(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Pet friendly</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={talkative}
              onChange={(e) => setTalkative(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Open to chatting</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={pickupFlexibility}
              onChange={(e) => setPickupFlexibility(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Flexible pickup</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={luggageAllowed}
              onChange={(e) => setLuggageAllowed(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Luggage allowed</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={womenOnly}
              onChange={(e) => setWomenOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Women only</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={liveLocationSharing}
              onChange={(e) => setLiveLocationSharing(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Live location sharing</span>
          </label>
        </div>
      </div>

      {/* Additional Notes Section */}
      <div className="mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Additional Notes
        </h3>

        <textarea
          placeholder="Any additional information for passengers (optional)..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows="3"
          maxLength="1000"
          className="w-full border-2 border-gray-300 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">{notes.length}/1000 characters</p>
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
          'Post Ride'
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