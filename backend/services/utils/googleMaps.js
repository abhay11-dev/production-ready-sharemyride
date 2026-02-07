const { Client } = require('@googlemaps/google-maps-services-js');

const client = new Client({});

/**
 * Get route details between two locations
 * @param {string} origin - Starting location
 * @param {string} destination - Ending location
 * @returns {Promise<Object>} Route data with polyline and coordinates
 */
const getRouteDetails = async (origin, destination) => {
  try {
    const response = await client.directions({
      params: {
        origin,
        destination,
        mode: 'driving',
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });

    if (response.data.status !== 'OK' || !response.data.routes.length) {
      throw new Error('No route found');
    }

    const route = response.data.routes[0];
    const leg = route.legs[0];

    // Extract polyline
    const encodedPolyline = route.overview_polyline.points;

    // Decode polyline to get coordinates
    const coordinates = decodePolyline(encodedPolyline);

    return {
      polyline: encodedPolyline,
      coordinates,
      distance: leg.distance.value, // meters
      duration: leg.duration.value, // seconds
      distanceText: leg.distance.text,
      durationText: leg.duration.text,
    };
  } catch (error) {
    console.error('❌ Google Maps API Error:', error.message);
    throw new Error(`Failed to get route: ${error.message}`);
  }
};

/**
 * Decode Google Maps polyline to coordinates array
 * @param {string} encoded - Encoded polyline string
 * @returns {Array} Array of {lat, lng} objects
 */
const decodePolyline = (encoded) => {
  const coordinates = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return coordinates;
};

/**
 * Check if a point is near the route
 * @param {Object} point - {lat, lng}
 * @param {Array} routeCoordinates - Array of {lat, lng}
 * @param {number} maxDistanceMeters - Max distance in meters (default 5000m = 5km)
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
 * Geocode an address to get coordinates
 * @param {string} address - Address to geocode
 * @returns {Promise<Object>} {lat, lng, formattedAddress}
 */
const geocodeAddress = async (address) => {
  try {
    const response = await client.geocode({
      params: {
        address,
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });

    if (response.data.status !== 'OK' || !response.data.results.length) {
      throw new Error('Address not found');
    }

    const location = response.data.results[0].geometry.location;
    
    return {
      lat: location.lat,
      lng: location.lng,
      formattedAddress: response.data.results[0].formatted_address,
    };
  } catch (error) {
    console.error('❌ Geocoding Error:', error.message);
    throw new Error(`Failed to geocode address: ${error.message}`);
  }
};

/**
 * Check if passenger route (C→D) is on driver route (A→B)
 * @param {Object} driverRoute - {start, end, coordinates}
 * @param {string} passengerPickup - Passenger pickup location
 * @param {string} passengerDrop - Passenger drop location
 * @param {number} tolerance - Tolerance in meters (default 5000m)
 * @returns {Promise<Object>} Match details
 */
const checkRouteMatch = async (driverRoute, passengerPickup, passengerDrop, tolerance = 5000) => {
  try {
    // Get passenger coordinates
    const pickupCoords = await geocodeAddress(passengerPickup);
    const dropCoords = await geocodeAddress(passengerDrop);

    // Check if pickup is near driver's route
    const pickupMatch = isPointNearRoute(pickupCoords, driverRoute.coordinates, tolerance);
    
    // Check if drop is near driver's route
    const dropMatch = isPointNearRoute(dropCoords, driverRoute.coordinates, tolerance);

    // Both must be on route AND pickup must come before drop
    const isMatch = 
      pickupMatch.isNear && 
      dropMatch.isNear && 
      pickupMatch.closestIndex < dropMatch.closestIndex;

    if (!isMatch) {
      return {
        isMatch: false,
        reason: !pickupMatch.isNear 
          ? 'Pickup location not on route'
          : !dropMatch.isNear
          ? 'Drop location not on route'
          : 'Drop location comes before pickup on route',
        pickupDistance: pickupMatch.distance,
        dropDistance: dropMatch.distance,
      };
    }

    // Calculate actual passenger travel distance (C to D along the route)
    const segmentCoordinates = driverRoute.coordinates.slice(
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

    // Calculate match quality (0-100)
    const avgDistanceFromRoute = (pickupMatch.distance + dropMatch.distance) / 2;
    const matchQuality = Math.max(0, Math.min(100, 
      100 - (avgDistanceFromRoute / tolerance) * 100
    ));

    return {
      isMatch: true,
      matchQuality: Math.round(matchQuality),
      pickupDistance: pickupMatch.distance,
      dropDistance: dropMatch.distance,
      pickupIndex: pickupMatch.closestIndex,
      dropIndex: dropMatch.closestIndex,
      segmentDistance: Math.round(segmentDistance), // meters
      segmentDistanceKm: (segmentDistance / 1000).toFixed(2), // km
      pickupCoordinates: pickupCoords,
      dropCoordinates: dropCoords,
    };
  } catch (error) {
    console.error('❌ Route Match Error:', error.message);
    return {
      isMatch: false,
      error: error.message,
    };
  }
};

module.exports = {
  getRouteDetails,
  geocodeAddress,
  isPointNearRoute,
  checkRouteMatch,
  calculateDistance,
  decodePolyline,
};