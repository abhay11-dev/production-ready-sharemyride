// Google Maps Configuration
export const GOOGLE_MAPS_CONFIG = {
  // For Vite projects
  apiKey: import.meta.env?.VITE_GOOGLE_MAPS_API_KEY || 
          // For Create React App projects
          (typeof process !== 'undefined' ? process.env?.REACT_APP_GOOGLE_MAPS_API_KEY : '') ||
          // Fallback (you should replace this with your actual key)
          'AIzaSyASeC8Y6vw872p8BVYAoIg8_VPBObJiYt8', // Replace with your key
  libraries: ['places'],
  mapOptions: {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
  },
  defaultCenter: {
    lat: 23.0225, // India center
    lng: 72.5714
  },
  defaultZoom: 5
};