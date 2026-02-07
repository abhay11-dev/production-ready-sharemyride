// ============================================
// LeafletRideMap.jsx - Complete Leaflet Implementation
// Place this in: src/components/map/LeafletRideMap.jsx
// ============================================

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ============================================
// FIX LEAFLET DEFAULT MARKER ICONS
// ============================================
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ============================================
// CUSTOM MARKER ICONS
// ============================================
const createCustomIcon = (color, label) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        font-weight: bold;
        color: white;
        font-size: 18px;
      ">
        ${label}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

const greenIcon = createCustomIcon('#10B981', 'A');
const blueIcon = createCustomIcon('#3B82F6', 'B');
const smallGreenDot = createCustomIcon('#10B981', '•');
const smallPurpleDot = createCustomIcon('#8B5CF6', '•');

// ============================================
// AUTO FIT BOUNDS COMPONENT
// ============================================
const FitBounds = ({ bounds }) => {
  const map = useMap();
  
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      try {
        const leafletBounds = L.latLngBounds(bounds);
        map.fitBounds(leafletBounds, { padding: [50, 50] });
      } catch (error) {
        console.error('Error fitting bounds:', error);
      }
    }
  }, [bounds, map]);
  
  return null;
};

// ============================================
// MAP LEGEND COMPONENT
// ============================================
const MapLegend = ({ connectedRides, otherRides, showLegend, onClose }) => {
  if (!showLegend) return null;

  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: '10px', marginRight: '10px', zIndex: 1000 }}>
      <div className="leaflet-control leaflet-bar" style={{ background: 'white', padding: '12px', borderRadius: '8px', minWidth: '200px' }}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Legend
          </h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-2 text-xs">
          {/* User Route */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-blue-600" style={{
              backgroundImage: 'repeating-linear-gradient(90deg, #3B82F6 0, #3B82F6 8px, transparent 8px, transparent 16px)'
            }}></div>
            <span className="text-gray-700 font-medium">Your Route</span>
          </div>
          
          {/* Route Matched */}
          {connectedRides > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 bg-green-500 rounded"></div>
              <span className="text-gray-700">Matched ({connectedRides})</span>
            </div>
          )}
          
          {/* Other Rides */}
          {otherRides > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 bg-purple-500 rounded"></div>
              <span className="text-gray-700">Other ({otherRides})</span>
            </div>
          )}
          
          {/* Markers */}
          <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">A</div>
              <span className="text-gray-700">Your Pickup</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">B</div>
              <span className="text-gray-700">Your Drop</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAP STATS COMPONENT
// ============================================
const MapStats = ({ connectedRides, otherRides, total, showStats }) => {
  if (!showStats) return null;

  return (
    <div className="leaflet-bottom leaflet-left" style={{ marginBottom: '10px', marginLeft: '10px', zIndex: 1000 }}>
      <div className="leaflet-control leaflet-bar" style={{ background: 'white', padding: '12px', borderRadius: '8px' }}>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{connectedRides}</div>
            <div className="text-[10px] text-gray-600">Matched</div>
          </div>
          <div className="border-l border-gray-300 h-10"></div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-600">{otherRides}</div>
            <div className="text-[10px] text-gray-600">Other</div>
          </div>
          <div className="border-l border-gray-300 h-10"></div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{total}</div>
            <div className="text-[10px] text-gray-600">Total</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN LEAFLET MAP COMPONENT
// ============================================
const LeafletRideMap = ({
  startMarker,
  endMarker,
  userRoute,
  rideRoutes = [],
  connectedRides = [],
  rides = [],
  onRouteClick,
  hasSearched = false,
}) => {
  const [showLegend, setShowLegend] = useState(true);
  const [showStats, setShowStats] = useState(true);

  // Calculate bounds for auto-fit
  const allPoints = [];
  if (startMarker) allPoints.push([startMarker.lat, startMarker.lng]);
  if (endMarker) allPoints.push([endMarker.lat, endMarker.lng]);
  
  rideRoutes.forEach(route => {
    if (route.path && route.path.length > 0) {
      route.path.forEach(point => {
        allPoints.push([point.lat, point.lng]);
      });
    }
  });

  // Default center (India)
  const defaultCenter = [20.5937, 78.9629];
  const center = allPoints.length > 0 ? allPoints[0] : defaultCenter;

  const connectedCount = connectedRides.length;
  const otherCount = rides.length - connectedRides.length;

  return (
    <div className="relative">
      <MapContainer
        center={center}
        zoom={5}
        style={{ height: '600px', width: '100%', borderRadius: '16px', zIndex: 0 }}
        scrollWheelZoom={true}
      >
        {/* ========================================== */}
        {/* FREE OPENSTREETMAP TILES */}
        {/* ========================================== */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto-fit bounds */}
        <FitBounds bounds={allPoints} />

        {/* ========================================== */}
        {/* USER PICKUP MARKER (A) - GREEN */}
        {/* ========================================== */}
        {startMarker && (
          <Marker position={[startMarker.lat, startMarker.lng]} icon={greenIcon}>
            <Popup>
              <div className="font-semibold text-sm">
                🟢 Your Pickup
                <br />
                <span className="text-xs text-gray-600">Point A</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* ========================================== */}
        {/* USER DROP MARKER (B) - BLUE */}
        {/* ========================================== */}
        {endMarker && (
          <Marker position={[endMarker.lat, endMarker.lng]} icon={blueIcon}>
            <Popup>
              <div className="font-semibold text-sm">
                🔵 Your Drop
                <br />
                <span className="text-xs text-gray-600">Point B</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* ========================================== */}
        {/* USER SEARCHED ROUTE - BLUE DASHED LINE */}
        {/* ========================================== */}
        {userRoute && userRoute.length > 0 && (
          <Polyline
            positions={userRoute.map(p => [p.lat, p.lng])}
            pathOptions={{
              color: '#3B82F6',
              weight: 5,
              opacity: 0.9,
              dashArray: '10, 10',
            }}
          />
        )}

        {/* ========================================== */}
        {/* RIDE ROUTES - GREEN & PURPLE */}
        {/* ========================================== */}
        {rideRoutes.map((route) => {
          const ride = [...connectedRides, ...rides].find(r => r._id === route.id);
          const isConnected = route.color === '#10B981';
          
          return (
            <React.Fragment key={route.id}>
              <Polyline
                positions={route.path.map(p => [p.lat, p.lng])}
                pathOptions={{
                  color: route.color,
                  weight: route.strokeWeight || 5,
                  opacity: 0.8,
                }}
                eventHandlers={{
                  click: () => {
                    if (onRouteClick && ride) {
                      onRouteClick(ride);
                    }
                  },
                }}
              >
                {ride && (
                  <Popup>
                    <div className="text-sm">
                      <h3 className="font-bold text-gray-900 mb-2">
                        {ride.start} → {ride.end}
                      </h3>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Driver:</span>
                          <span className="font-semibold">{ride.driver?.name || ride.driverInfo?.name || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Seats:</span>
                          <span className="font-semibold">{ride.availableSeats || ride.seats}/{ride.seats}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Fare:</span>
                          <span className="font-semibold text-green-600">
                            {ride.fareMode === 'per_km' 
                              ? `₹${ride.perKmRate}/km`
                              : `₹${ride.fare}/seat`
                            }
                          </span>
                        </div>
                        {ride.matchQuality && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <span className="text-green-600 font-bold">{ride.matchQuality}% Match</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                )}
              </Polyline>

              {/* Start/End markers for routes */}
              {route.path && route.path.length >= 2 && (
                <>
                  <Marker 
                    position={[route.path[0].lat, route.path[0].lng]}
                    icon={isConnected ? smallGreenDot : smallPurpleDot}
                  >
                    <Popup>
                      <span className="text-xs font-semibold">{ride?.start} (Start)</span>
                    </Popup>
                  </Marker>
                  <Marker 
                    position={[route.path[route.path.length - 1].lat, route.path[route.path.length - 1].lng]}
                    icon={isConnected ? smallGreenDot : smallPurpleDot}
                  >
                    <Popup>
                      <span className="text-xs font-semibold">{ride?.end} (End)</span>
                    </Popup>
                  </Marker>
                </>
              )}
            </React.Fragment>
          );
        })}

        {/* ========================================== */}
        {/* MAP LEGEND */}
        {/* ========================================== */}
        {hasSearched && (connectedCount > 0 || otherCount > 0) && (
          <MapLegend 
            connectedRides={connectedCount}
            otherRides={otherCount}
            showLegend={showLegend}
            onClose={() => setShowLegend(false)}
          />
        )}

        {/* ========================================== */}
        {/* MAP STATS */}
        {/* ========================================== */}
        {hasSearched && (connectedCount > 0 || otherCount > 0) && (
          <MapStats 
            connectedRides={connectedCount}
            otherRides={otherCount}
            total={rides.length}
            showStats={showStats}
          />
        )}
      </MapContainer>

      {/* Legend toggle button when hidden */}
      {!showLegend && hasSearched && (connectedCount > 0 || otherCount > 0) && (
        <button
          onClick={() => setShowLegend(true)}
          className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 z-[1000] border border-gray-200 hover:bg-gray-50 transition-colors"
          title="Show Legend"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}

      {/* Help text */}
      {hasSearched && rides.length > 0 && (
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">
            💡 Click on route lines to see ride details • Green = Matched • Purple = Other
          </p>
        </div>
      )}
    </div>
  );
};

export default LeafletRideMap;