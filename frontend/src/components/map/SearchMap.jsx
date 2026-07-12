import React, { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  MarkerPopup,
  MarkerTooltip,
  MapRoute,
  MapControls,
  useMap
} from '../ui/map';
import { useNavigate } from 'react-router-dom';

function MapController({ allRides, startMarker, selectedRideId, setStart }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!isLoaded || !map) return;
    if (allRides.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      let hasPoints = false;
      allRides.forEach(r => {
        if (r.pickupCoordinates) { bounds.extend([r.pickupCoordinates.lng, r.pickupCoordinates.lat]); hasPoints = true; }
        if (r.dropCoordinates) { bounds.extend([r.dropCoordinates.lng, r.dropCoordinates.lat]); hasPoints = true; }
      });
      if (hasPoints) {
        map.fitBounds(bounds, { padding: 50, duration: 1000, maxZoom: 14 });
      }
    } else if (startMarker) {
      map.flyTo({ center: [startMarker.lng, startMarker.lat], zoom: 11, duration: 1000 });
    }
  }, [isLoaded, map, allRides, startMarker]);

  useEffect(() => {
    if (!isLoaded || !map || !selectedRideId) return;
    const ride = allRides.find(r => r._id === selectedRideId);
    if (ride?.pickupCoordinates) {
      map.flyTo({ center: [ride.pickupCoordinates.lng, ride.pickupCoordinates.lat], zoom: 13, duration: 800 });
    }
  }, [isLoaded, map, selectedRideId, allRides]);

  return (
    <MapControls 
      position="bottom-right" 
      showZoom 
      showCompass 
      showLocate 
      showFullscreen 
      onLocate={(coords) => {
        // reverse geocoding or just passing coords
        if (setStart) setStart(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
      }}
    />
  );
}

export default function SearchMap({ allRides, startMarker, selectedRideId, onRideSelect, hoveredRideId, setStart }) {
  const navigate = useNavigate();

  // Selected ride for route drawing
  const selectedRide = allRides.find(r => r._id === selectedRideId);

  return (
    <Map 
      className="w-full h-full bg-gray-50 rounded-2xl"
      viewport={startMarker ? { center: [startMarker.lng, startMarker.lat], zoom: 11 } : { center: [78.9629, 20.5937], zoom: 4 }}
    >
      <MapController 
        allRides={allRides} 
        startMarker={startMarker} 
        selectedRideId={selectedRideId} 
        setStart={setStart} 
      />

      {selectedRide && selectedRide.routeCoordinates?.length >= 2 && (
        <>
          <MapRoute
            coordinates={selectedRide.routeCoordinates.map(c => [c.lng, c.lat])}
            color="#2563eb"
            width={4}
            opacity={0.8}
            interactive={false}
          />
          {/* Destination marker for the route */}
          {selectedRide.dropCoordinates && (
            <MapMarker longitude={selectedRide.dropCoordinates.lng} latitude={selectedRide.dropCoordinates.lat}>
              <MarkerContent>
                <div className="relative h-5 w-5 rounded-sm border-2 border-white bg-green-500 shadow-lg flex items-center justify-center text-[10px] font-bold text-white">
                  D
                </div>
              </MarkerContent>
            </MapMarker>
          )}
        </>
      )}

      {allRides.map(ride => {
        if (!ride.pickupCoordinates) return null;
        const isSelected = selectedRideId === ride._id;
        const isHovered = hoveredRideId === ride._id;
        
        const formatTime = (isoString) => {
          if (!isoString) return '';
          return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };
        
        // Final total price calculation
        const fare = ride.segmentFare || ride.fare || 0;
        const platformFee = fare * 0.03;
        const gst = (fare + platformFee) * 0.05;
        const total = Math.round(fare + platformFee + gst);

        return (
          <MapMarker 
            key={ride._id}
            longitude={ride.pickupCoordinates.lng} 
            latitude={ride.pickupCoordinates.lat}
            onClick={() => onRideSelect?.(ride._id)}
          >
            <MarkerContent className={isSelected || isHovered ? 'scale-125 transition-transform z-20' : 'transition-transform z-10'}>
              <div className={`relative h-6 w-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600' : isHovered ? 'bg-blue-500' : 'bg-blue-400'}`}>
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </MarkerContent>
            
            <MarkerLabel position="top" className={isSelected ? 'font-bold' : ''}>
              {formatTime(ride.departureTime)}
            </MarkerLabel>
            
            <MarkerTooltip>
              {ride.pickupLocation?.name} → {ride.dropLocation?.name}
            </MarkerTooltip>

            {isSelected && (
              <MarkerPopup closeButton>
                <div className="min-w-[200px] flex flex-col gap-2 p-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm text-gray-900">{ride.driverInfo?.name || 'Driver'}</p>
                      <p className="text-xs text-gray-500">{ride.vehicle?.type || 'Vehicle'} • {ride.availableSeats || ride.seats} seats</p>
                      <p className="text-xs text-gray-500 mt-0.5">Departs: {formatTime(ride.departureTime)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-blue-600">₹{total}</p>
                      <p className="text-[10px] text-gray-400 uppercase">Per seat</p>
                    </div>
                  </div>
                  <div className="pt-2 mt-1 border-t border-gray-100">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const params = new URLSearchParams();
                        if (ride.start) params.set('start', ride.start);
                        if (ride.end) params.set('end', ride.end);
                        if (ride._id) params.set('selectedRideId', ride._id);
                        navigate(`/ride/search${params.toString() ? `?${params.toString()}` : ''}#search`);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                    >
                      View & Book
                    </button>
                  </div>
                </div>
              </MarkerPopup>
            )}
          </MapMarker>
        );
      })}
    </Map>
  );
}
