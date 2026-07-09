// src/contexts/GoogleMapsContext.jsx
//
// Loads the Google Maps JS SDK exactly ONCE at the app root and exposes
// { isLoaded, loadError } to any descendant component via useGoogleMaps().
//
// Why this exists: Google's Places Autocomplete is a browser SDK (a
// <script> tag load), not a plain fetch() like Geoapify was. If
// LocationAutocomplete tried to load it itself, every From/To/waypoint
// field rendering simultaneously would each try to inject the script,
// causing duplicate-script warnings and race conditions. Loading it once
// here and having every autocomplete instance just check `isLoaded` avoids
// that entirely.

import React, { createContext, useContext } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

const GOOGLE_MAPS_LIBRARIES = ['places'];

const GoogleMapsContext = createContext({ isLoaded: false, loadError: null });
console.log('GoogleMapsProvider mounted, key:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
export function GoogleMapsProvider({ children }) {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: GOOGLE_MAPS_LIBRARIES,
    });

    return (
         <SocketProvider>
            <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
            {children}
        </GoogleMapsContext.Provider>
         </SocketProvider>
        
    );
}

export function useGoogleMaps() {
    return useContext(GoogleMapsContext);
}