// src/components/map/RideMap.jsx
// Replaces LeafletRideMap. Built on mapcn (MapLibre GL via shadcn).
// Install once: npx shadcn@latest add @mapcn/map
//
// Props:
//  rides          - full rides array (for marker clusters)
//  connectedRides - route-matched rides (green routes)
//  rideRoutes     - [{id, path:[{lat,lng}], color}] from search results
//  startMarker    - {lat, lng} pickup point
//  endMarker      - {lat, lng} drop point
//  liveLocation   - {lat, lng} live driver position (for upcoming rides)
//  selectedRideId - highlight one route
//  onRideClick    - (ride) callback when marker popup "Book" clicked
//  hasSearched    - bool: show placeholder when false
//  compact        - bool: smaller height variant

import React, { useMemo, useState } from 'react';
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  MarkerPopup,
  MarkerTooltip,
  MapRoute,
} from '@/components/ui/map';
import PaymentCalculator from '../../utils/paymentCalculator';

// ─── Coordinate helpers ───────────────────────────────────────────────────────
// Backend/Leaflet stores as {lat, lng}; mapcn MapRoute needs [lng, lat]
const toLngLat = (coords) => {
  if (!coords?.length) return [];
  return coords.map(c => [
    typeof c.lng !== 'undefined' ? c.lng : c[0],
    typeof c.lat !== 'undefined' ? c.lat : c[1],
  ]);
};

const INDIA_CENTER = [78.9629, 20.5937]; // [lng, lat] - India centre

// ─── Formatted helpers ────────────────────────────────────────────────────────
function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

// ─── Marker: Pickup / Drop pin ────────────────────────────────────────────────
function LocationPin({ color = '#2563eb', label, size = 14 }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="rounded-full border-2 border-white shadow-lg"
        style={{ width: size, height: size, backgroundColor: color }}
      />
      {label && (
        <span className="mt-1 text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded-full whitespace-nowrap">
          {label}
        </span>
      )}
    </div>
  );
}

// ─── Marker: Live driver location ─────────────────────────────────────────────
function LivePin() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping" />
      <div className="relative w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-xl flex items-center justify-center">
        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
          <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1v-1h3.05a2.5 2.5 0 014.9 0H19a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0017 5h-3V4a1 1 0 00-1-1H3z" />
        </svg>
      </div>
    </div>
  );
}

// ─── Marker: Ride pin (numbered) ──────────────────────────────────────────────
function RidePin({ index, isConnected, isSelected }) {
  const bg = isSelected
    ? '#1d4ed8'
    : isConnected
    ? '#16a34a'
    : '#2563eb';

  return (
    <div
      className="flex items-center justify-center rounded-full border-2 border-white shadow-lg text-white font-bold text-[10px] transition-transform hover:scale-110"
      style={{ width: 22, height: 22, backgroundColor: bg }}
    >
      {index + 1}
    </div>
  );
}

// ─── Popup content for a ride ─────────────────────────────────────────────────
function RidePopupContent({ ride, onBook }) {
  const driver = ride.driverId || ride.driver || {};
  const driverName = ride.driverInfo?.name || driver.name || 'Driver';
  const available = ride.availableSeats ?? ride.seats ?? 0;
  const fareCalc = PaymentCalculator.calculatePassengerTotal(ride.fare || 0, 1);
  const price = ride.segmentFare
    ? `₹${Number(ride.segmentFare).toFixed(0)}`
    : `₹${fareCalc.totalPassengerPays.toFixed(0)}`;

  return (
    <div className="w-52 p-0">
      {/* Route */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-start gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
          <span className="text-xs font-semibold text-gray-900 truncate">{ride.start}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 mt-1.5" />
          <span className="text-xs font-semibold text-gray-900 truncate">{ride.end}</span>
        </div>
      </div>

      {/* Meta */}
      <div className="p-3 space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Driver</span>
          <span className="text-xs font-semibold text-gray-900">{driverName.split(' ')[0]}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Time</span>
          <span className="text-xs font-semibold text-gray-900">{formatTime(ride.time)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Seats</span>
          <span className={`text-xs font-semibold ${available === 0 ? 'text-orange-600' : 'text-green-600'}`}>
            {available === 0 ? 'Full' : `${available} left`}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Price</span>
          <span className="text-sm font-bold text-blue-600">{price}/seat</span>
        </div>

        {ride.matchType === 'on_route' && (
          <div className="flex items-center gap-1 mt-1">
            <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-green-700 font-semibold">Route match</span>
          </div>
        )}

        {onBook && available > 0 && (
          <button
            onClick={() => onBook(ride)}
            className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 rounded-lg transition-colors"
          >
            Book Now
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Empty / placeholder ──────────────────────────────────────────────────────
function MapPlaceholder() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 rounded-2xl">
      <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-3">
        <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-gray-700">Enter locations to search rides</p>
      <p className="text-xs text-gray-400 mt-1">Routes will appear on the map</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function RideMap({
  rides = [],
  connectedRides = [],
  rideRoutes = [],
  startMarker = null,
  endMarker = null,
  liveLocation = null,
  selectedRideId = null,
  onRideClick = null,
  hasSearched = false,
  compact = false,
}) {
  const [hoveredRouteId, setHoveredRouteId] = useState(null);

  // Compute map center and zoom from search markers or default to India
  const { center, zoom } = useMemo(() => {
    if (startMarker && endMarker) {
      const midLng = (startMarker.lng + endMarker.lng) / 2;
      const midLat = (startMarker.lat + endMarker.lat) / 2;
      const distDeg = Math.sqrt(
        Math.pow(startMarker.lng - endMarker.lng, 2) +
        Math.pow(startMarker.lat - endMarker.lat, 2),
      );
      const zoom = distDeg < 1 ? 9 : distDeg < 3 ? 7 : distDeg < 8 ? 6 : 5;
      return { center: [midLng, midLat], zoom };
    }
    if (startMarker) return { center: [startMarker.lng, startMarker.lat], zoom: 8 };
    if (liveLocation) return { center: [liveLocation.lng, liveLocation.lat], zoom: 12 };
    return { center: INDIA_CENTER, zoom: 4.5 };
  }, [startMarker, endMarker, liveLocation]);

  const height = compact ? 'h-64' : 'h-80 sm:h-96 lg:h-[440px]';

  // Separate connected vs other rides for display
  const connectedIds = new Set(connectedRides.map(r => r._id));

  // Legend items
  const legend = [];
  if (rideRoutes.some(r => r.color === '#10B981' || r.color?.toLowerCase().includes('green'))) {
    legend.push({ color: '#10B981', label: 'Covers your route' });
  }
  if (rideRoutes.some(r => r.color !== '#10B981')) {
    legend.push({ color: '#2563eb', label: 'Other rides' });
  }
  if (liveLocation) {
    legend.push({ color: '#2563eb', label: 'Driver location', pulse: true });
  }

  return (
    <div className={`relative ${height} w-full rounded-2xl overflow-hidden border border-gray-100 shadow-md`}>
      {!hasSearched && !liveLocation && <MapPlaceholder />}

      <Map
        center={center}
        zoom={zoom}
        className="w-full h-full"
      >
        <MapControls position="bottom-right" showZoom showCompass />

        {/* ── Ride routes ────────────────────────────────────────────────── */}
        {rideRoutes.map(route => {
          const coords = toLngLat(route.path || []);
          if (coords.length < 2) return null;
          const isConnected = route.color === '#10B981' || route.color === '#22c55e';
          const isSelected = route.id === selectedRideId;
          const isHovered = route.id === hoveredRouteId;

          return (
            <MapRoute
              key={route.id}
              id={`route-${route.id}`}
              coordinates={coords}
              color={isSelected ? '#1d4ed8' : route.color || '#2563eb'}
              width={isSelected || isHovered ? 6 : isConnected ? 5 : 4}
              opacity={isSelected ? 1 : isHovered ? 0.9 : isConnected ? 0.85 : 0.6}
              interactive
              onMouseEnter={() => setHoveredRouteId(route.id)}
              onMouseLeave={() => setHoveredRouteId(null)}
              onClick={() => {
                const ride = rides.find(r => r._id === route.id);
                if (ride && onRideClick) onRideClick(ride);
              }}
            />
          );
        })}

        {/* ── Pickup marker ─────────────────────────────────────────────── */}
        {startMarker?.lat && startMarker?.lng && (
          <MapMarker latitude={startMarker.lat} longitude={startMarker.lng}>
            <MarkerContent>
              <LocationPin color="#16a34a" size={16} />
            </MarkerContent>
            <MarkerTooltip>
              <span className="text-xs font-semibold">Pickup</span>
            </MarkerTooltip>
          </MapMarker>
        )}

        {/* ── Drop marker ───────────────────────────────────────────────── */}
        {endMarker?.lat && endMarker?.lng && (
          <MapMarker latitude={endMarker.lat} longitude={endMarker.lng}>
            <MarkerContent>
              <LocationPin color="#2563eb" size={16} />
            </MarkerContent>
            <MarkerTooltip>
              <span className="text-xs font-semibold">Drop-off</span>
            </MarkerTooltip>
          </MapMarker>
        )}

        {/* ── Ride markers ──────────────────────────────────────────────── */}
        {rides.map((ride, idx) => {
          // Use pickup coordinates if this is a route-matched ride, else route start
          const lat = ride.pickupCoordinates?.lat || ride.routeCoordinates?.[0]?.lat;
          const lng = ride.pickupCoordinates?.lng || ride.routeCoordinates?.[0]?.lng;
          if (!lat || !lng) return null;

          const isConnected = connectedIds.has(ride._id);
          const isSelected = ride._id === selectedRideId;

          return (
            <MapMarker key={ride._id} latitude={lat} longitude={lng}>
              <MarkerContent>
                <RidePin index={idx} isConnected={isConnected} isSelected={isSelected} />
              </MarkerContent>
              <MarkerTooltip>
                <span className="text-xs font-semibold">{ride.start} → {ride.end}</span>
              </MarkerTooltip>
              <MarkerPopup className="p-0 overflow-hidden rounded-xl shadow-xl">
                <RidePopupContent ride={ride} onBook={onRideClick} />
              </MarkerPopup>
            </MapMarker>
          );
        })}

        {/* ── Live driver location ──────────────────────────────────────── */}
        {liveLocation?.lat && liveLocation?.lng && (
          <MapMarker latitude={liveLocation.lat} longitude={liveLocation.lng}>
            <MarkerContent>
              <LivePin />
            </MarkerContent>
            <MarkerTooltip>
              <span className="text-xs font-semibold">Driver is here</span>
            </MarkerTooltip>
          </MapMarker>
        )}
      </Map>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      {(hasSearched || liveLocation) && legend.length > 0 && (
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-md border border-gray-100 space-y-1.5">
          {legend.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              {l.pulse ? (
                <div className="relative w-3 h-3">
                  <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: l.color, opacity: 0.4 }} />
                  <div className="relative w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                </div>
              ) : (
                <div className="w-4 h-1.5 rounded-full" style={{ backgroundColor: l.color }} />
              )}
              <span className="text-xs text-gray-600 font-medium">{l.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Result count badge ────────────────────────────────────────────── */}
      {hasSearched && rides.length > 0 && (
        <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
          {rides.length} ride{rides.length !== 1 ? 's' : ''} on map
        </div>
      )}
    </div>
  );
}

export default RideMap;