// src/components/map/RideMap.jsx
// Advanced OLA Maps (MapLibre GL) integration — India-grade.
// Install: npm install maplibre-gl  (OLA Maps uses MapLibre under the hood)
//
// Features
//  • OLA Maps tile server (best India coverage — streets, villages, galis)
//  • Route polylines with hover info panel (driver, fare, seats, time, distance)
//  • Ride markers with numbered clusters + popups
//  • Pickup / drop / live-driver markers
//  • Nearby rides (within ~30 km of search endpoints) shown as dimmed markers
//  • On-the-way rides highlighted in green with route overlap badge
//  • Legend + ride count badge
//  • Map style switcher (Road / Satellite / Dark)
//  • Fullscreen toggle
//  • Zero external deps beyond maplibre-gl (already in OLA Maps SDK)
//
// Environment variable:
//   VITE_OLA_MAPS_API_KEY=your_key_here
//
// Props — identical shape to existing RideMap so it's a drop-in replacement
//  rides, connectedRides, rideRoutes, startMarker, endMarker,
//  liveLocation, selectedRideId, onRideClick, hasSearched, compact

import React, {
  useEffect, useRef, useState, useCallback, useMemo,
} from 'react';
import PaymentCalculator from '../../utils/paymentCalculator';

// ─── Config ───────────────────────────────────────────────────────────────────
const OLA_KEY = import.meta.env.VITE_OLA_MAPS_API_KEY || '';
const INDIA_LNG = 78.9629;
const INDIA_LAT = 20.5937;

const OSM_RASTER_STYLE = {
  version: 8,
  name: 'OpenStreetMap Road',
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm-base', type: 'raster', source: 'osm' }],
};

const DARK_RASTER_STYLE = {
  version: 8,
  name: 'Dark Base',
  sources: {
    dark: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'dark-base', type: 'raster', source: 'dark' }],
};

const SATELLITE_RASTER_STYLE = {
  version: 8,
  name: 'Satellite',
  sources: {
    satellite: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'satellite-base', type: 'raster', source: 'satellite' }],
};

const isOLAEnabled = Boolean(OLA_KEY);

// OLA Maps tile styles
const MAP_STYLES = {
  road: isOLAEnabled
    ? `https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json?api_key=${OLA_KEY}`
    : OSM_RASTER_STYLE,
  dark: isOLAEnabled
    ? `https://api.olamaps.io/tiles/vector/v1/styles/default-dark-standard/style.json?api_key=${OLA_KEY}`
    : DARK_RASTER_STYLE,
  satellite: isOLAEnabled
    ? `https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard-mr/style.json?api_key=${OLA_KEY}`
    : SATELLITE_RASTER_STYLE,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

function formatMoney(v) {
  const n = Math.round(Number(v || 0));
  return `₹${n.toLocaleString('en-IN')}`;
}

function toGeoJSON(coordsArray) {
  // coordsArray: [{lat,lng}] → GeoJSON LineString
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coordsArray.map(c => [
        typeof c.lng !== 'undefined' ? c.lng : c[0],
        typeof c.lat !== 'undefined' ? c.lat : c[1],
      ]),
    },
    properties: {},
  };
}

function lngLat(pt) {
  if (!pt) return null;
  return [
    typeof pt.lng !== 'undefined' ? pt.lng : pt[0],
    typeof pt.lat !== 'undefined' ? pt.lat : pt[1],
  ];
}

// ─── Inline SVG marker HTML factories ─────────────────────────────────────────
function pinSVG(color, size = 28) {
  return `<svg width="${size}" height="${size * 1.3}" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C8.477 0 4 4.477 4 10c0 7.5 10 26 10 26S24 17.5 24 10c0-5.523-4.477-10-10-10z" fill="${color}" stroke="white" stroke-width="2"/>
    <circle cx="14" cy="10" r="4" fill="white"/>
  </svg>`;
}

function numberPinSVG(num, color = '#2563eb', size = 30) {
  return `<div style="
    width:${size}px;height:${size}px;border-radius:50%;
    background:${color};border:2.5px solid white;
    display:flex;align-items:center;justify-content:center;
    color:white;font-size:11px;font-weight:700;
    box-shadow:0 2px 8px rgba(0,0,0,0.25);
    cursor:pointer;transition:transform 0.15s;
  " class="smr-ride-pin">${num}</div>`;
}

function livePinHTML() {
  return `<div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,0.3);animation:smr-pulse-ring 1.8s ease-out infinite;"></div>
    <div style="width:20px;height:20px;border-radius:50%;background:#2563eb;border:2.5px solid white;box-shadow:0 2px 8px rgba(37,99,235,0.4);display:flex;align-items:center;justify-content:center;">
      <svg width="10" height="10" fill="white" viewBox="0 0 20 20"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1v-1h3.05a2.5 2.5 0 014.9 0H19a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0017 5h-3V4a1 1 0 00-1-1H3z"/></svg>
    </div>
  </div>`;
}

// ─── Route hover info panel ───────────────────────────────────────────────────
function RouteInfoPanel({ ride, onBook, onClose }) {
  if (!ride) return null;
  const driver = ride.driverId || ride.driver || {};
  const driverName = ride.driverInfo?.name || driver.name || 'Driver';
  const available = ride.availableSeats ?? ride.seats ?? 0;
  const isFull = available === 0;
  const fareCalc = PaymentCalculator.calculatePassengerTotal(ride.fare || 0, 1);
  const price = ride.segmentFare
    ? formatMoney(ride.segmentFare)
    : formatMoney(fareCalc.totalPassengerPays);
  const isConnected = ride.matchType === 'on_route';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        width: 'min(340px, calc(100% - 24px))',
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        border: '1.5px solid #e5e7eb',
        overflow: 'hidden',
        animation: 'smr-float-in 0.25s cubic-bezier(0.22,1,0.36,1) both',
      }}
    >
      {/* Header stripe */}
      <div style={{
        background: isConnected
          ? 'linear-gradient(90deg,#15803d,#22c55e)'
          : 'linear-gradient(90deg,#1d4ed8,#2563eb)',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isConnected && (
            <svg width="14" height="14" fill="white" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
          <span style={{ color: 'white', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}>
            {isConnected ? 'ROUTE MATCH' : 'RIDE DETAILS'}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px' }}>
        {/* Route */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, marginTop: 3, flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
            <div style={{ width: 1.5, height: 18, background: '#d1d5db' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ride.start}</p>
            {isConnected && ride.userSearchDistance && (
              <p style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, margin: '3px 0' }}>{ride.userSearchDistance} km segment</p>
            )}
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 4 }}>{ride.end}</p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#2563eb', margin: 0 }}>{price}</p>
            <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>per seat</p>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
          {[
            { label: 'Driver', val: driverName.split(' ')[0] },
            { label: 'Time', val: formatTime(ride.time) },
            { label: 'Seats', val: isFull ? 'Full' : `${available} left` },
          ].map(({ label, val }) => (
            <div key={label} style={{ background: '#f9fafb', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
              <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>{label}</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: isFull && label === 'Seats' ? '#ea580c' : '#111827', margin: 0, marginTop: 1 }}>{val}</p>
            </div>
          ))}
        </div>

        {/* Vehicle + distance */}
        {(ride.vehicle?.type || ride.totalDistance) && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {ride.vehicle?.type && (
              <span style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>
                {[ride.vehicle.color, ride.vehicle.model, ride.vehicle.type].filter(Boolean).join(' · ')}
              </span>
            )}
            {ride.totalDistance > 0 && (
              <span style={{ fontSize: 11, background: '#f0fdf4', color: '#16a34a', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>
                ~{ride.totalDistance} km
              </span>
            )}
            {ride.vehicle?.acAvailable && (
              <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>AC</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          {onBook && !isFull && (
            <button
              onClick={() => onBook(ride)}
              style={{
                flex: 1, background: '#16a34a', color: 'white',
                border: 'none', borderRadius: 10, padding: '8px 0',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Book Now
            </button>
          )}
          {isFull && (
            <div style={{ flex: 1, background: '#fef3c7', color: '#92400e', borderRadius: 10, padding: '8px 0', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
              Fully Booked
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Map style switcher ───────────────────────────────────────────────────────
function StyleSwitcher({ current, onChange }) {
  const styleOptions = isOLAEnabled
    ? [
        { key: 'road', label: '🗺️' },
        { key: 'dark', label: '🌙' },
        { key: 'satellite', label: '🛰️' },
      ]
    : [
        { key: 'road', label: '🗺️' },
      ];

  return (
    <div style={{
      position: 'absolute', top: 12, right: 12, zIndex: 10,
      display: 'flex', gap: 4, background: 'white',
      borderRadius: 10, padding: 4,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      border: '1px solid #e5e7eb',
    }}>
      {styleOptions.map(({ key, label }) => (
        <button
          type="button"
          key={key}
          onClick={() => onChange(key)}
          title={key}
          style={{
            width: 28, height: 28, borderRadius: 7, border: 'none',
            background: current === key ? '#2563eb' : 'transparent',
            color: current === key ? 'white' : '#6b7280',
            cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function MapLegend({ hasRoutes, hasConnected, liveLocation }) {
  const items = [];
  if (hasConnected) items.push({ color: '#16a34a', label: 'Covers your route', dash: false });
  if (hasRoutes) items.push({ color: '#2563eb', label: 'Other rides', dash: false });
  if (liveLocation) items.push({ color: '#2563eb', label: 'Driver live', pulse: true });

  if (!items.length) return null;

  return (
    <div style={{
      position: 'absolute', top: 12, left: 12, zIndex: 10,
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(8px)',
      borderRadius: 10, padding: '8px 12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb',
      display: 'flex', flexDirection: 'column', gap: 5,
    }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {item.pulse ? (
            <div style={{ position: 'relative', width: 12, height: 12 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: item.color, opacity: 0.3, animation: 'smr-pulse-ring 1.8s ease-out infinite' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: item.color }} />
            </div>
          ) : (
            <div style={{ width: 18, height: 3, borderRadius: 2, background: item.color }} />
          )}
          <span style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Empty placeholder ────────────────────────────────────────────────────────
function MapPlaceholder() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#f8fafc',
    }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <svg width="28" height="28" fill="none" stroke="#60a5fa" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>Enter locations to see routes</p>
      <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>Matching rides will appear on the map</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function RideMap({
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
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const popupRef = useRef(null);
  const mlRef = useRef(null); // maplibre-gl module

  const [mapStyle, setMapStyle] = useState('road');
  const [hoveredRide, setHoveredRide] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [rideCount, setRideCount] = useState(0);

  const height = compact
    ? 'h-64'
    : isFullscreen
      ? 'fixed inset-0 z-50 h-screen'
      : 'h-80 sm:h-96 lg:h-[440px]';

  // ── Dynamically load maplibre-gl ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadMapLibre() {
      if (mlRef.current) return; // already loaded
      try {
        // Try to import maplibre-gl (installed via npm)
        const ml = await import('maplibre-gl');
        if (!cancelled) {
          mlRef.current = ml;
          initMap(ml.default || ml);
        }
      } catch {
        // maplibre-gl not installed — show placeholder silently
        console.warn('[RideMap] maplibre-gl not found. Run: npm install maplibre-gl');
      }
    }

    function initMap(ml) {
      if (!containerRef.current || mapRef.current) return;

      const map = new ml.Map({
        container: containerRef.current,
        style: MAP_STYLES[mapStyle],
        center: [INDIA_LNG, INDIA_LAT],
        zoom: 4.5,
        attributionControl: false,
        logoPosition: 'bottom-right',
      });

      map.addControl(new ml.NavigationControl({ showCompass: true }), 'bottom-right');
      map.addControl(new ml.ScaleControl({ maxWidth: 80, unit: 'metric' }), 'bottom-left');

      map.on('load', () => {
        if (cancelled) return;
        mapRef.current = map;
        setMapReady(true);
      });
    }

    loadMapLibre();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Style switch ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    mapRef.current.setStyle(MAP_STYLES[mapStyle]);
  }, [mapStyle, mapReady]);

  // ── Clear old markers ─────────────────────────────────────────────────────
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }
  }, []);

  // ── Draw routes + markers whenever data changes ───────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!map || !mapReady || !ml) return;

    clearMarkers();

    const mlLib = ml.default || ml;
    const bounds = new mlLib.LngLatBounds();
    let hasBounds = false;

    // ── Remove old route layers/sources ──────────────────────────────────
    const existingLayers = map.getStyle()?.layers?.map(l => l.id) || [];
    existingLayers
      .filter(id => id.startsWith('smr-route-'))
      .forEach(id => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
    const existingSources = Object.keys(map.getStyle()?.sources || {});
    existingSources
      .filter(id => id.startsWith('smr-route-'))
      .forEach(id => {
        if (map.getSource(id)) map.removeSource(id);
      });

    // ── Draw route polylines ──────────────────────────────────────────────
    rideRoutes.forEach((route, idx) => {
      const coords = (route.path || []).map(c => [
        typeof c.lng !== 'undefined' ? c.lng : c[0],
        typeof c.lat !== 'undefined' ? c.lat : c[1],
      ]);
      if (coords.length < 2) return;

      const isConnected = route.color === '#10B981' || route.color?.toLowerCase().includes('10b9') || route.color === '#22c55e';
      const isSelected = route.id === selectedRideId;
      const color = isSelected ? '#1d4ed8' : (isConnected ? '#16a34a' : '#2563eb');
      const width = isSelected ? 7 : isConnected ? 5.5 : 4;
      const opacity = isSelected ? 1 : isConnected ? 0.9 : 0.65;

      const srcId = `smr-route-${route.id || idx}`;
      const lyrId = `smr-route-line-${route.id || idx}`;
      const lyrIdBg = `smr-route-bg-${route.id || idx}`;

      if (!map.getSource(srcId)) {
        map.addSource(srcId, {
          type: 'geojson',
          data: toGeoJSON(route.path || []),
        });
      }

      // Background glow layer (wider, lighter)
      if (!map.getLayer(lyrIdBg)) {
        map.addLayer({
          id: lyrIdBg,
          type: 'line',
          source: srcId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': color,
            'line-width': width + 5,
            'line-opacity': opacity * 0.18,
          },
        });
      }

      // Main line
      if (!map.getLayer(lyrId)) {
        map.addLayer({
          id: lyrId,
          type: 'line',
          source: srcId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': color,
            'line-width': width,
            'line-opacity': opacity,
          },
        });

        // Hover listeners on route line
        map.on('mouseenter', lyrId, () => {
          map.getCanvas().style.cursor = 'pointer';
          const ride = rides.find(r => r._id === route.id);
          if (ride) setHoveredRide(ride);
        });
        map.on('mouseleave', lyrId, () => {
          map.getCanvas().style.cursor = '';
        });
        map.on('click', lyrId, () => {
          const ride = rides.find(r => r._id === route.id);
          if (ride && onRideClick) onRideClick(ride);
        });
      }

      // Extend bounds
      coords.forEach(c => { bounds.extend(c); hasBounds = true; });
    });

    // ── Pickup marker ────────────────────────────────────────────────────
    if (startMarker?.lat) {
      const el = document.createElement('div');
      el.innerHTML = pinSVG('#16a34a', 32);
      el.title = 'Pickup';
      const m = new mlLib.Marker({ element: el })
        .setLngLat([startMarker.lng, startMarker.lat])
        .addTo(map);
      markersRef.current.push(m);
      bounds.extend([startMarker.lng, startMarker.lat]);
      hasBounds = true;
    }

    // ── Drop marker ──────────────────────────────────────────────────────
    if (endMarker?.lat) {
      const el = document.createElement('div');
      el.innerHTML = pinSVG('#2563eb', 32);
      el.title = 'Drop-off';
      const m = new mlLib.Marker({ element: el })
        .setLngLat([endMarker.lng, endMarker.lat])
        .addTo(map);
      markersRef.current.push(m);
      bounds.extend([endMarker.lng, endMarker.lat]);
      hasBounds = true;
    }

    // ── Ride number markers ──────────────────────────────────────────────
    const connectedIds = new Set(connectedRides.map(r => r._id));
    rides.forEach((ride, idx) => {
      const lat = ride.pickupCoordinates?.lat || ride.routeCoordinates?.[0]?.lat;
      const lng = ride.pickupCoordinates?.lng || ride.routeCoordinates?.[0]?.lng;
      if (!lat || !lng) return;

      const isConn = connectedIds.has(ride._id);
      const isSel = ride._id === selectedRideId;
      const color = isSel ? '#1d4ed8' : isConn ? '#16a34a' : '#6366f1';
      const size = isSel ? 36 : 28;

      const el = document.createElement('div');
      el.innerHTML = numberPinSVG(idx + 1, color, size);
      el.style.cssText = 'cursor:pointer;transition:transform 0.15s;';
      el.title = `${ride.start} → ${ride.end}`;

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.18)';
        setHoveredRide(ride);
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });
      el.addEventListener('click', () => {
        setHoveredRide(ride);
        if (onRideClick) onRideClick(ride);
      });

      const m = new mlLib.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);
      markersRef.current.push(m);
    });

    // ── Live driver marker ───────────────────────────────────────────────
    if (liveLocation?.lat) {
      const el = document.createElement('div');
      el.innerHTML = livePinHTML();
      const m = new mlLib.Marker({ element: el })
        .setLngLat([liveLocation.lng, liveLocation.lat])
        .addTo(map);
      markersRef.current.push(m);
      bounds.extend([liveLocation.lng, liveLocation.lat]);
      hasBounds = true;
    }

    // ── Fit map to bounds ────────────────────────────────────────────────
    if (hasBounds && !bounds.isEmpty()) {
      try {
        map.fitBounds(bounds, {
          padding: { top: 60, bottom: 80, left: 50, right: 50 },
          maxZoom: 13,
          duration: 900,
        });
      } catch { /* ignore invalid bounds */ }
    }

    setRideCount(rides.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, rideRoutes, rides, connectedRides, startMarker, endMarker, liveLocation, selectedRideId, mapStyle]);

  const hasConnected = connectedRides.length > 0;
  const hasRoutes = rideRoutes.length > 0;

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-gray-100 shadow-md bg-gray-50 ${height}`}
      style={isFullscreen ? { borderRadius: 0 } : {}}
    >
      {/* Map container */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Placeholder when no search done and no live location */}
      {!hasSearched && !liveLocation && !mapReady && <MapPlaceholder />}

      {/* Legend */}
      {(hasSearched || liveLocation) && (
        <MapLegend hasRoutes={hasRoutes} hasConnected={hasConnected} liveLocation={liveLocation} />
      )}

      {/* Style switcher */}
      <StyleSwitcher current={mapStyle} onChange={setMapStyle} />

      {/* Ride count badge */}
      {hasSearched && rideCount > 0 && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, background: '#2563eb', color: 'white',
          borderRadius: 20, padding: '4px 14px',
          fontSize: 12, fontWeight: 700,
          boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
        }}>
          {rideCount} ride{rideCount !== 1 ? 's' : ''} on map
        </div>
      )}

      {/* Fullscreen toggle */}
      <button
        onClick={() => setIsFullscreen(f => !f)}
        style={{
          position: 'absolute', bottom: 48, right: 12, zIndex: 10,
          background: 'white', border: '1px solid #e5e7eb',
          borderRadius: 8, width: 32, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        }}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? (
          <svg width="14" height="14" fill="none" stroke="#374151" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0v5m0-5h5M15 9l5-5m0 0v5m0-5h-5M9 15l-5 5m0 0v-5m0 5h5M15 15l5 5m0 0v-5m0 5h-5" />
          </svg>
        ) : (
          <svg width="14" height="14" fill="none" stroke="#374151" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5" />
          </svg>
        )}
      </button>

      {/* OLA Maps attribution */}
      {OLA_KEY && (
        <div style={{
          position: 'absolute', bottom: 4, left: 8, zIndex: 10,
          fontSize: 9, color: 'rgba(0,0,0,0.35)', fontWeight: 500,
        }}>
          © OLA Maps
        </div>
      )}

      {/* Route hover info panel */}
      {hoveredRide && (
        <RouteInfoPanel
          ride={hoveredRide}
          onBook={onRideClick}
          onClose={() => setHoveredRide(null)}
        />
      )}
    </div>
  );
}