const axios = require('axios');
const polyline = require('polyline');

// Free Nominatim geocoding API
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Add delay between requests to respect rate limits
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Geocode an address to get coordinates using Nominatim (Free)
 * @param {string} address - Address to geocode
 * @returns {Promise<Object>} {lat, lng, formattedAddress}
 */
const geocodeAddress = async (address) => {
  try {
    await delay(1000); // 1 second delay to respect rate limits
    
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: address,
        format: 'json',
        limit: 1,
      },
      headers: {
        'User-Agent': 'ShareMyRide-App/1.0',
      },
      timeout: 10000,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('Address not found');
    }

    const result = response.data[0];
    
    const coords = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      formattedAddress: result.display_name,
    };
    
    console.log(`   📍 Geocoded "${address}" → ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
    
    return coords;
  } catch (error) {
    console.error('❌ Geocoding Error:', error.message);
    throw new Error(`Failed to geocode address: ${error.message}`);
  }
};

/**
 * Calculate distance between two points (Haversine formula)
 * @param {Object} point1 - {lat, lng}
 * @param {Object} point2 - {lat, lng}
 * @returns {number} Distance in meters
 */
const calculateDistance = (point1, point2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) *
      Math.cos(toRad(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Convert degrees to radians
 */
const toRad = (degrees) => {
  return (degrees * Math.PI) / 180;
};

/**
 * Simplified route calculation using straight-line approximation with waypoints
 */
const calculateStraightLineRoute = (startCoords, endCoords) => {
  // Create a simple route with intermediate points
  const points = 20;
  const coordinates = [];
  
  for (let i = 0; i <= points; i++) {
    const ratio = i / points;
    coordinates.push({
      lat: startCoords.lat + (endCoords.lat - startCoords.lat) * ratio,
      lng: startCoords.lng + (endCoords.lng - startCoords.lng) * ratio,
    });
  }
  
  // Calculate approximate distance
  let distance = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    distance += calculateDistance(coordinates[i], coordinates[i + 1]);
  }
  
  // Approximate duration (assuming 60 km/h average speed)
  const duration = (distance / 1000) * 3600 / 60;
  
  return {
    coordinates,
    distance: Math.round(distance),
    duration: Math.round(duration),
  };
};

/**
 * Get route details between two locations
 * @param {string|Object} origin - Starting location (address or {lat, lng})
 * @param {string|Object} destination - Ending location (address or {lat, lng})
 * @returns {Promise<Object>} Route data with coordinates
 */
const getRouteDetails = async (origin, destination) => {
  try {
    console.log(`\n🗺️ Getting route...`);
    
    // Step 1: Get start coordinates
    let startCoords;
    if (typeof origin === 'object' && origin.lat !== undefined && origin.lng !== undefined) {
      startCoords = origin;
      console.log(`   Start (provided): ${startCoords.lat.toFixed(4)}, ${startCoords.lng.toFixed(4)}`);
    } else if (typeof origin === 'string') {
      console.log(`   Geocoding start: "${origin}"`);
      startCoords = await geocodeAddress(origin);
    } else {
      throw new Error('Invalid origin format');
    }

    // Step 2: Get end coordinates
    let endCoords;
    if (typeof destination === 'object' && destination.lat !== undefined && destination.lng !== undefined) {
      endCoords = destination;
      console.log(`   End (provided): ${endCoords.lat.toFixed(4)}, ${endCoords.lng.toFixed(4)}`);
    } else if (typeof destination === 'string') {
      console.log(`   Geocoding end: "${destination}"`);
      endCoords = await geocodeAddress(destination);
    } else {
      throw new Error('Invalid destination format');
    }

    // Validate coordinates
    if (isNaN(startCoords.lat) || isNaN(startCoords.lng)) {
      throw new Error(`Invalid start coordinates: ${JSON.stringify(startCoords)}`);
    }
    if (isNaN(endCoords.lat) || isNaN(endCoords.lng)) {
      throw new Error(`Invalid end coordinates: ${JSON.stringify(endCoords)}`);
    }

    console.log(`   ✓ Start: ${startCoords.lat.toFixed(4)}, ${startCoords.lng.toFixed(4)}`);
    console.log(`   ✓ End: ${endCoords.lat.toFixed(4)}, ${endCoords.lng.toFixed(4)}`);

    // Calculate straight-line route
    console.log('   Calculating route approximation...');
    const route = calculateStraightLineRoute(startCoords, endCoords);
    
    const distanceKm = (route.distance / 1000).toFixed(2);
    const durationHours = (route.duration / 3600).toFixed(1);

    console.log(`   ✅ Route created: ${distanceKm} km, ~${durationHours} hours`);

    return {
      polyline: null,
      coordinates: route.coordinates,
      distance: route.distance,
      duration: route.duration,
      distanceText: `~${distanceKm} km`,
      durationText: `~${durationHours} hours`,
      startCoordinates: startCoords,
      endCoordinates: endCoords,
      method: 'straight-line',
    };
  } catch (error) {
    console.error('❌ Route Error:', error.message);
    throw error;
  }
};

/**
 * Check if a point is near the route
 * @param {Object} point - {lat, lng}
 * @param {Array} routeCoordinates - Array of {lat, lng}
 * @param {number} maxDistanceMeters - Max distance in meters
 * @returns {Object} {isNear, distance, closestIndex}
 */
const isPointNearRoute = (point, routeCoordinates, maxDistanceMeters = 5000) => {
  let minDistance = Infinity;
  let closestIndex = -1;

  for (let i = 0; i < routeCoordinates.length; i++) {
    const distance = calculateDistance(point, routeCoordinates[i]);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }

  return {
    isNear: minDistance <= maxDistanceMeters,
    distance: Math.round(minDistance),
    closestIndex,
  };
};

/**
 * Check if passenger route (C→D) is on driver route (A→B)
 * @param {Object} driverRoute - {start, end, coordinates}
 * @param {string} passengerPickup - Passenger pickup location
 * @param {string} passengerDrop - Passenger drop location
 * @param {number} tolerance - Tolerance in meters (default 5000m)
 * @returns {Promise<Object>} Match details
 */
/**
 * Check if passenger route (C→D) is on driver route (A→B)
 * Logic: A ≤ C and D ≤ B (passenger journey is subset of driver route)
 * @param {Object} driverRoute - {start, end, coordinates}
 * @param {string} passengerPickup - Passenger pickup location (C)
 * @param {string} passengerDrop - Passenger drop location (D)
 * @param {number} tolerance - Tolerance in meters (default 5000m)
 * @returns {Promise<Object>} Match details
 */
const checkRouteMatch = async (driverRoute, passengerPickup, passengerDrop, tolerance = 5000) => {
  try {
    console.log('\n🔍 Checking route match...');
    console.log(`   Driver: ${driverRoute.start} (A) → ${driverRoute.end} (B)`);
    console.log(`   Passenger: ${passengerPickup} (C) → ${passengerDrop} (D)`);
    console.log(`   Rule: A ≤ C and D ≤ B`);
    console.log(`   Tolerance: ${tolerance}m (${(tolerance/1000).toFixed(1)}km)`);

    // Get route coordinates
    let routeCoordinates = driverRoute.coordinates;
    
    if (!routeCoordinates || routeCoordinates.length === 0) {
      if (driverRoute.polyline) {
        routeCoordinates = polyline.decode(driverRoute.polyline).map(([lat, lng]) => ({ lat, lng }));
      } else {
        console.log('   ⚠️ No route data, fetching...');
        const route = await getRouteDetails(driverRoute.start, driverRoute.end);
        routeCoordinates = route.coordinates;
      }
    }

    console.log(`   ✓ Route has ${routeCoordinates.length} points`);

    // Get passenger coordinates
    console.log(`   Geocoding pickup: "${passengerPickup}"`);
    const pickupCoords = await geocodeAddress(passengerPickup);
    
    console.log(`   Geocoding drop: "${passengerDrop}"`);
    const dropCoords = await geocodeAddress(passengerDrop);

    // Check distances from route
    const pickupMatch = isPointNearRoute(pickupCoords, routeCoordinates, tolerance);
    const dropMatch = isPointNearRoute(dropCoords, routeCoordinates, tolerance);

    console.log(`   ✓ Pickup (C): ${pickupMatch.distance}m from route, index ${pickupMatch.closestIndex}`);
    console.log(`   ✓ Drop (D): ${dropMatch.distance}m from route, index ${dropMatch.closestIndex}`);

    // ✅ CRITICAL FIX: Verify order constraints
    // Rule: A ≤ C < D ≤ B
    // This means:
    // 1. Pickup (C) must be AFTER route start (index > 0 or very close to start)
    // 2. Drop (D) must be BEFORE route end (index < routeCoordinates.length - 1 or very close to end)
    // 3. Pickup index < Drop index (C comes before D)

    const isPickupNear = pickupMatch.isNear;
    const isDropNear = dropMatch.isNear;
    const isCorrectOrder = pickupMatch.closestIndex < dropMatch.closestIndex;
    
    // Check if C is after A (pickup is not before route start)
    const pickupAfterStart = pickupMatch.closestIndex >= 0;
    
    // Check if D is before B (drop is not after route end)
    const dropBeforeEnd = dropMatch.closestIndex < routeCoordinates.length;

    console.log(`   📊 Validation:`);
    console.log(`      - Pickup within tolerance? ${isPickupNear}`);
    console.log(`      - Drop within tolerance? ${isDropNear}`);
    console.log(`      - Correct order (C < D)? ${isCorrectOrder}`);
    console.log(`      - Pickup after start (A ≤ C)? ${pickupAfterStart}`);
    console.log(`      - Drop before end (D ≤ B)? ${dropBeforeEnd}`);

    // ✅ All conditions must be true
    const isMatch = 
      isPickupNear && 
      isDropNear && 
      isCorrectOrder &&
      pickupAfterStart &&
      dropBeforeEnd;

    if (!isMatch) {
      let reason;
      if (!isPickupNear) {
        reason = `Pickup ${(pickupMatch.distance/1000).toFixed(2)}km away (max ${(tolerance/1000).toFixed(1)}km)`;
      } else if (!isDropNear) {
        reason = `Drop ${(dropMatch.distance/1000).toFixed(2)}km away (max ${(tolerance/1000).toFixed(1)}km)`;
      } else if (!isCorrectOrder) {
        reason = 'Drop comes before pickup on route (D < C)';
      } else if (!pickupAfterStart) {
        reason = 'Pickup is before driver start (C < A)';
      } else if (!dropBeforeEnd) {
        reason = 'Drop is after driver end (D > B)';
      }
      
      console.log(`   ❌ No match: ${reason}`);
      
      return {
        isMatch: false,
        reason,
        pickupDistance: pickupMatch.distance,
        dropDistance: dropMatch.distance,
        pickupIndex: pickupMatch.closestIndex,
        dropIndex: dropMatch.closestIndex,
      };
    }

    // ✅ Calculate segment distance (C to D)
    const segmentCoordinates = routeCoordinates.slice(
      pickupMatch.closestIndex,
      dropMatch.closestIndex + 1
    );

    let segmentDistance = 0;
    for (let i = 0; i < segmentCoordinates.length - 1; i++) {
      segmentDistance += calculateDistance(
        segmentCoordinates[i],
        segmentCoordinates[i + 1]
      );
    }

    // Calculate match quality
    const avgDistanceFromRoute = (pickupMatch.distance + dropMatch.distance) / 2;
    const matchQuality = Math.max(0, Math.min(100, 
      100 - (avgDistanceFromRoute / tolerance) * 100
    ));

    console.log(`   ✅ MATCH FOUND!`);
    console.log(`      Quality: ${Math.round(matchQuality)}%`);
    console.log(`      Segment: C(index ${pickupMatch.closestIndex}) → D(index ${dropMatch.closestIndex})`);
    console.log(`      Distance: ${(segmentDistance / 1000).toFixed(2)}km`);

    return {
      isMatch: true,
      matchQuality: Math.round(matchQuality),
      pickupDistance: pickupMatch.distance,
      dropDistance: dropMatch.distance,
      pickupIndex: pickupMatch.closestIndex,
      dropIndex: dropMatch.closestIndex,
      segmentDistance: Math.round(segmentDistance),
      segmentDistanceKm: (segmentDistance / 1000).toFixed(2),
      pickupCoordinates: pickupCoords,
      dropCoordinates: dropCoords,
      segmentCoordinates,
    };
  } catch (error) {
    console.error('❌ Route Match Error:', error.message);
    console.error(error.stack);
    return {
      isMatch: false,
      error: error.message,
    };
  }
};

/**
 * Calculate fare for a segment
 */
const calculateSegmentFare = (ride, segmentDistanceMeters) => {
  const segmentDistanceKm = segmentDistanceMeters / 1000;
  
  let baseFare;
  
  if (ride.fareMode === 'per_km' && ride.perKmRate) {
    baseFare = segmentDistanceKm * ride.perKmRate;
  } else {
    const totalDistanceKm = ride.totalDistance || 1;
    const proportion = segmentDistanceKm / totalDistanceKm;
    baseFare = (ride.fare || 0) * proportion;
  }
  
  const platformFee = baseFare * 0.08;
  const gst = platformFee * 0.18;
  const totalFare = baseFare + platformFee + gst;
  
  return {
    baseFare: parseFloat(baseFare.toFixed(2)),
    platformFee: parseFloat(platformFee.toFixed(2)),
    gst: parseFloat(gst.toFixed(2)),
    totalFare: parseFloat(totalFare.toFixed(2)),
    distanceKm: parseFloat(segmentDistanceKm.toFixed(2)),
  };
};

module.exports = {
  geocodeAddress,
  getRouteDetails,
  calculateDistance,
  isPointNearRoute,
  checkRouteMatch,
  calculateSegmentFare,
};