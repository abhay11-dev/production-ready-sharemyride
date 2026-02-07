import { decode } from '@googlemaps/polyline-codec';
import haversine from 'haversine-distance';

/**
 * Calculate distance between two points using Haversine formula
 * @param {Object} point1 - {lat, lng}
 * @param {Object} point2 - {lat, lng}
 * @returns {number} Distance in meters
 */
export const calculateDistance = (point1, point2) => {
  return haversine(point1, point2);
};

/**
 * Check if a point lies within a certain distance of any point on a route
 * @param {Object} point - {lat, lng}
 * @param {Array} routePoints - Array of {lat, lng} points
 * @param {number} maxDistance - Maximum distance in meters (default 3000m = 3km)
 * @returns {Object|null} Closest point on route if within distance, null otherwise
 */
export const findClosestPointOnRoute = (point, routePoints, maxDistance = 3000) => {
  let closestPoint = null;
  let minDistance = Infinity;
  let closestIndex = -1;

  routePoints.forEach((routePoint, index) => {
    const distance = calculateDistance(point, routePoint);
    if (distance < minDistance && distance <= maxDistance) {
      minDistance = distance;
      closestPoint = routePoint;
      closestIndex = index;
    }
  });

  return closestPoint ? { point: closestPoint, distance: minDistance, index: closestIndex } : null;
};

/**
 * Check if a ride route connects two user points
 * @param {Object} userFrom - {lat, lng}
 * @param {Object} userTo - {lat, lng}
 * @param {string} ridePolyline - Encoded polyline string
 * @param {number} maxDistance - Maximum distance in meters
 * @returns {Object|null} Match details if connected, null otherwise
 */
export const checkRouteConnection = (userFrom, userTo, ridePolyline, maxDistance = 3000) => {
  try {
    // Decode the ride's polyline
    const routePoints = decode(ridePolyline, 5).map(([lat, lng]) => ({ lat, lng }));

    // Find closest points for both user locations
    const fromMatch = findClosestPointOnRoute(userFrom, routePoints, maxDistance);
    const toMatch = findClosestPointOnRoute(userTo, routePoints, maxDistance);

    // Check if both points are found and "from" comes before "to" on the route
    if (fromMatch && toMatch && fromMatch.index < toMatch.index) {
      return {
        connected: true,
        fromMatch,
        toMatch,
        routePoints,
        segmentPoints: routePoints.slice(fromMatch.index, toMatch.index + 1)
      };
    }

    return null;
  } catch (error) {
    console.error('Error checking route connection:', error);
    return null;
  }
};

/**
 * Encode coordinates to polyline string
 * @param {Array} coordinates - Array of {lat, lng} objects
 * @returns {string} Encoded polyline
 */
export const encodePolyline = (coordinates) => {
  const path = coordinates.map(coord => [coord.lat, coord.lng]);
  return encode(path, 5);
};

/**
 * Decode polyline to coordinates
 * @param {string} polyline - Encoded polyline string
 * @returns {Array} Array of {lat, lng} objects
 */
export const decodePolyline = (polyline) => {
  try {
    return decode(polyline, 5).map(([lat, lng]) => ({ lat, lng }));
  } catch (error) {
    console.error('Error decoding polyline:', error);
    return [];
  }
};

/**
 * Get geocoding for an address using Google Maps API
 * @param {string} address - Address to geocode
 * @param {Object} googleMaps - Google Maps API object
 * @returns {Promise<Object>} {lat, lng} coordinates
 */
export const geocodeAddress = async (address, googleMaps) => {
  return new Promise((resolve, reject) => {
    const geocoder = new googleMaps.Geocoder();
    
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        resolve({
          lat: location.lat(),
          lng: location.lng(),
          formattedAddress: results[0].formatted_address
        });
      } else {
        reject(new Error(`Geocoding failed: ${status}`));
      }
    });
  });
};

/**
 * Get directions between two points
 * @param {Object} from - {lat, lng}
 * @param {Object} to - {lat, lng}
 * @param {Object} googleMaps - Google Maps API object
 * @returns {Promise<Object>} Route details with polyline
 */
export const getDirections = async (from, to, googleMaps) => {
  return new Promise((resolve, reject) => {
    const directionsService = new googleMaps.DirectionsService();
    
    directionsService.route(
      {
        origin: from,
        destination: to,
        travelMode: googleMaps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK') {
          const route = result.routes[0];
          const leg = route.legs[0];
          
          resolve({
            polyline: route.overview_polyline,
            distance: leg.distance.text,
            duration: leg.duration.text,
            distanceValue: leg.distance.value,
            durationValue: leg.duration.value
          });
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      }
    );
  });
};