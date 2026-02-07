import React, { useState, useRef } from 'react';
import RideCard from '../../components/ride/RideCard';
import { searchRides } from '../../services/rideService';
import LeafletRideMap from '../../components/map/LeafletRideMap';
import toast from 'react-hot-toast';

const defaultCenter = {
  lat: 23.0225,
  lng: 72.5714
};

function RideSearch() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [date, setDate] = useState('');
  const [rides, setRides] = useState([]);
  const [connectedRides, setConnectedRides] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Map state
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(5);
  const [startMarker, setStartMarker] = useState(null);
  const [endMarker, setEndMarker] = useState(null);
  const [userRoute, setUserRoute] = useState([]);
  const [rideRoutes, setRideRoutes] = useState([]);
  
  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [minSeats, setMinSeats] = useState('');
  const [maxFare, setMaxFare] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [acOnly, setAcOnly] = useState(false);
  const [womenOnly, setWomenOnly] = useState(false);
  const [instantBooking, setInstantBooking] = useState(false);

  const applyAdvancedFilters = (rides) => {
    return rides.filter(ride => {
      const availableSeats = ride.availableSeats || ride.seats;
      if (minSeats && availableSeats < parseInt(minSeats)) return false;
      if (maxFare && ride.fare) {
        const passengerFare = ride.fare + 10 + (10 * 0.18);
        if (passengerFare > parseFloat(maxFare)) return false;
      }
      if (vehicleType && ride.vehicle?.type !== vehicleType) return false;
      if (acOnly && !ride.vehicle?.acAvailable) return false;
      if (womenOnly && !ride.preferences?.womenOnly) return false;
      if (instantBooking && !ride.driver?.verified && ride.ratingSummary < 4.0) return false;
      return true;
    });
  };

  const handleSearch = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    if (!start || !end) {
      toast.error('Please enter both start and end locations');
      return;
    }
    
    setIsLoading(true);
    setHasSearched(true);
    
    const searchingToast = toast.loading('Searching for rides...');
    
    try {
      // Backend does all geocoding via Nominatim
      console.log('🔍 Calling backend API with:', { start, end, date });
      const results = await searchRides(start, end, date);
      
      console.log('📦 Backend returned:', results.length, 'rides');
      if (results.length > 0) {
        console.log('🔍 Sample ride:', {
          id: results[0]._id,
          matchType: results[0].matchType,
          matchQuality: results[0].matchQuality,
          userSearchDistance: results[0].userSearchDistance,
          segmentFare: results[0].segmentFare,
          hasRouteCoordinates: results[0].routeCoordinates?.length > 0
        });
      }
      
      if (results && results.length > 0) {
        // Apply filters
        let filteredResults = applyAdvancedFilters(results);
        
        // Separate by matchType from backend
        const routeMatched = filteredResults.filter(r => r.matchType === 'on_route');
        const otherRides = filteredResults.filter(r => r.matchType !== 'on_route');
        
        console.log('✅ Route-matched rides:', routeMatched.length);
        console.log('✅ Other rides:', otherRides.length);
        
        // Prepare routes for map
        const routesToDraw = [];
        
        // Green for matched routes
        routeMatched.forEach(ride => {
          if (ride.routeCoordinates && ride.routeCoordinates.length > 0) {
            routesToDraw.push({
              id: ride._id,
              path: ride.routeCoordinates,
              color: '#10B981', // GREEN
              strokeWeight: 6,
              zIndex: 100,
            });
          }
        });
        
        // Purple for other rides
        otherRides.forEach(ride => {
          if (ride.routeCoordinates && ride.routeCoordinates.length > 0) {
            routesToDraw.push({
              id: ride._id,
              path: ride.routeCoordinates,
              color: '#8B5CF6', // PURPLE
              strokeWeight: 5,
              zIndex: 50,
            });
          }
        });
        
        console.log('🗺️ Drawing', routesToDraw.length, 'routes on map');
        console.log('  - Green (matched):', routeMatched.filter(r => r.routeCoordinates?.length > 0).length);
        console.log('  - Purple (other):', otherRides.filter(r => r.routeCoordinates?.length > 0).length);
        
        setRideRoutes(routesToDraw);
        
        // Set markers from first route-matched ride's coordinates
        if (routeMatched.length > 0 && routeMatched[0].pickupCoordinates) {
          setStartMarker(routeMatched[0].pickupCoordinates);
          setEndMarker(routeMatched[0].dropCoordinates);
        }
        
        setRides(filteredResults);
        setConnectedRides(routeMatched);
        
        toast.dismiss(searchingToast);
        
        if (routeMatched.length > 0) {
          toast.success(
            `Found ${routeMatched.length} ride${routeMatched.length === 1 ? '' : 's'} covering your route!`,
            { duration: 3000, id: 'search-success', icon: '🎯' }
          );
        } else if (otherRides.length > 0) {
          toast.success(
            `Found ${otherRides.length} ride${otherRides.length === 1 ? '' : 's'}!`,
            { duration: 3000, id: 'search-success' }
          );
        } else {
          toast.error('No rides match your filters', { id: 'search-error' });
        }
      } else {
        setRides([]);
        setConnectedRides([]);
        setRideRoutes([]);
        toast.dismiss(searchingToast);
        toast.error(`No rides found from ${start} to ${end}`, { id: 'search-error' });
      }
    } catch (err) {
      console.error('❌ Search error:', err);
      toast.dismiss(searchingToast);
      toast.error(err.response?.data?.message || 'Search failed', { id: 'search-error' });
      setRides([]);
      setConnectedRides([]);
      setRideRoutes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSearch = () => {
    setStart('');
    setEnd('');
    setDate('');
    setRides([]);
    setConnectedRides([]);
    setHasSearched(false);
    setStartMarker(null);
    setEndMarker(null);
    setUserRoute([]);
    setRideRoutes([]);
    setMinSeats('');
    setMaxFare('');
    setVehicleType('');
    setAcOnly(false);
    setWomenOnly(false);
    setInstantBooking(false);
    setShowFilters(false);
    setMapCenter(defaultCenter);
    setMapZoom(5);
    toast.success('Search cleared');
  };

  const handleClearFilters = () => {
    setMinSeats('');
    setMaxFare('');
    setVehicleType('');
    setAcOnly(false);
    setWomenOnly(false);
    setInstantBooking(false);
    toast.success('Filters cleared');
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const activeFiltersCount = [minSeats, maxFare, vehicleType, acOnly, womenOnly, instantBooking].filter(Boolean).length;

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-2 sm:mb-3">🗺️ Smart Ride Search</h2>
            <p className="text-gray-600 text-base sm:text-lg">Find rides with intelligent route matching</p>
          </div>

          {/* LEAFLET MAP */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-4 overflow-hidden">
              <LeafletRideMap
                startMarker={startMarker}
                endMarker={endMarker}
                userRoute={userRoute}
                rideRoutes={rideRoutes}
                connectedRides={connectedRides}
                rides={rides}
                hasSearched={hasSearched}
                onRouteClick={(ride) => {
                  console.log('Route clicked:', ride);
                }}
              />
            </div>
          </div>

          {/* SEARCH FORM */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border-2 border-gray-200 p-6 sm:p-8 mb-8 sm:mb-10">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-4 items-end mb-4">
              
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  From <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Starting location (e.g., Mumbai)"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="w-full border-2 border-gray-300 pl-10 sm:pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-sm sm:text-base disabled:bg-gray-50 disabled:cursor-not-allowed"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  To <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Destination (e.g., Pune)"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="w-full border-2 border-gray-300 pl-10 sm:pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-sm sm:text-base disabled:bg-gray-50 disabled:cursor-not-allowed"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={getTodayDate()}
                    className="w-full border-2 border-gray-300 pl-10 sm:pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-sm sm:text-base disabled:bg-gray-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                <svg className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span>Advanced Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {showFilters && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Minimum Seats</label>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={minSeats}
                      onChange={(e) => setMinSeats(e.target.value)}
                      placeholder="Any"
                      className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Max Fare (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={maxFare}
                      onChange={(e) => setMaxFare(e.target.value)}
                      placeholder="Any"
                      className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Vehicle Type</label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">Any</option>
                      <option value="Hatchback">Hatchback</option>
                      <option value="Sedan">Sedan</option>
                      <option value="SUV">SUV</option>
                      <option value="MUV">MUV</option>
                      <option value="Bike">Bike</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={acOnly} onChange={(e) => setAcOnly(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">AC Only</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={womenOnly} onChange={(e) => setWomenOnly(e.target.checked)} className="w-4 h-4 text-pink-600 rounded" />
                    <span className="text-sm text-gray-700">Women Only</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={instantBooking} onChange={(e) => setInstantBooking(e.target.checked)} className="w-4 h-4 text-green-600 rounded" />
                    <span className="text-sm text-gray-700">Verified Drivers</span>
                  </label>
                </div>

                {activeFiltersCount > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button type="button" onClick={handleClearFilters} className="text-xs text-red-600 hover:text-red-700 font-semibold">
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4">
              <button
                onClick={handleSearch}
                type="button"
                className="w-full cursor-pointer flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-3.5 rounded-xl font-bold text-sm sm:text-base
                           hover:from-blue-700 hover:to-blue-600 hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200
                           disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none"
                disabled={isLoading || !start || !end}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Search Rides</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-500 text-center">
                🎯 Smart search with OSRM route matching 
              </p>
            </div>

            {hasSearched && (
              <div className="flex justify-center mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors duration-200"
                  disabled={isLoading}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear search & filters
                </button>
              </div>
            )}
          </div>

          {/* RESULTS */}
          {hasSearched && (
            <>
              {connectedRides.length > 0 && (
                <div className="mb-8">
                  <div className="mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg shadow-md border-2 border-green-200">
                      <div className="flex items-center gap-3">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h3 className="text-xl sm:text-2xl font-bold text-green-900">Connected Routes</h3>
                          <p className="text-sm text-green-700">These rides cover your journey!</p>
                        </div>
                      </div>
                      <span className="bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md w-fit">
                        {connectedRides.length} {connectedRides.length === 1 ? 'ride' : 'rides'} found
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    {connectedRides.map((ride, index) => (
                      <div key={ride._id || ride.id || index} className="relative">
                        <RideCard ride={ride} onBookingSuccess={() => handleSearch()} />
                        <div className="absolute top-3 right-3 bg-gradient-to-r from-green-600 to-green-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-lg z-10 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Connected Route
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rides.length > 0 && rides.some(r => !connectedRides.find(cr => cr._id === r._id)) && (
                <div className="mb-8">
                  <div className="mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-lg shadow-md border border-gray-200">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Other Available Rides</h3>
                        {activeFiltersCount > 0 && (
                          <p className="text-xs text-gray-500 mt-1">{activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} applied</p>
                        )}
                      </div>
                      <span className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md w-fit">
                        {rides.filter(r => !connectedRides.find(cr => cr._id === r._id)).length} {rides.filter(r => !connectedRides.find(cr => cr._id === r._id)).length === 1 ? 'ride' : 'rides'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    {rides
                      .filter(r => !connectedRides.find(cr => cr._id === r._id))
                      .map((ride, index) => (
                        <div key={ride._id || ride.id || index} className="relative">
                          <RideCard ride={ride} onBookingSuccess={() => handleSearch()} />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {!isLoading && rides.length === 0 && (
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border-2 border-gray-200 p-8 sm:p-12 text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3">😞 No rides found</h3>
                  <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
                    We couldn't find any rides matching your search criteria.
                  </p>
                  <button
                    onClick={handleClearSearch}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors text-sm"
                  >
                    Start New Search
                  </button>
                </div>
              )}
            </>
          )}

          {!hasSearched && (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border-2 border-gray-200 p-8 sm:p-12 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3">🗺️ Ready for Smart Search?</h3>
              <p className="text-gray-600 text-sm sm:text-base mb-6">
                Enter your locations above and we'll find rides with intelligent OSRM route matching!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RideSearch;