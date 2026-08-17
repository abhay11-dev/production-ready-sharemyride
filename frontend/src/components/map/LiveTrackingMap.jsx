// src/components/map/LiveTrackingMap.jsx
// Live driver tracking map — uses OLA Maps (MapLibre GL), same tile stack
// as RideMap / RideSearch. Zero Google Maps dependency.
//
// Props:
//   driverLocation  — { lat, lng, heading?, speed? } | null
//   routePath       — [{ lat, lng }, ...]  — breadcrumb polyline history
//   isDriver        — bool (controls label text)
//   locationSharingActive — bool (drives "Live" pill)

import React, { useEffect, useRef, useState } from 'react';

const OLA_KEY = import.meta.env.VITE_OLA_MAPS_API_KEY || '';

const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

const MAP_STYLE = OLA_KEY
  ? `https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json?api_key=${OLA_KEY}`
  : OSM_STYLE;

// Default fallback centre — Bangalore
const DEFAULT_CENTER = [77.5946, 12.9716];

const PULSE_CSS = `
@keyframes smr-live-pulse {
  0%   { transform: scale(1); opacity: 0.7; }
  70%  { transform: scale(2.2); opacity: 0; }
  100% { opacity: 0; }
}
`;

function livePinHTML(heading = 0) {
  return `<div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,0.25);animation:smr-live-pulse 1.8s ease-out infinite;"></div>
    <div style="width:22px;height:22px;border-radius:50%;background:#2563eb;border:2.5px solid white;box-shadow:0 2px 10px rgba(37,99,235,0.5);display:flex;align-items:center;justify-content:center;transform:rotate(${heading}deg);transition:transform 0.4s;">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M12 2l4.5 13.5-4.5-3-4.5 3z"/></svg>
    </div>
  </div>`;
}

export default function LiveTrackingMap({
  driverLocation = null,
  routePath = [],
  isDriver = false,
  locationSharingActive = false,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const mlRef = useRef(null);
  const markerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // Inject pulse keyframes once
  useEffect(() => {
    if (document.getElementById('smr-live-pulse-style')) return;
    const style = document.createElement('style');
    style.id = 'smr-live-pulse-style';
    style.textContent = PULSE_CSS;
    document.head.appendChild(style);
  }, []);

  // Init MapLibre map
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (mlRef.current || !containerRef.current) return;
      try {
        const ml = await import('maplibre-gl');
        if (cancelled) return;
        mlRef.current = ml;
        const MapLib = ml.default || ml;

        const center = driverLocation
          ? [driverLocation.lng, driverLocation.lat]
          : DEFAULT_CENTER;

        const map = new MapLib.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          center,
          zoom: driverLocation ? 15 : 5,
          attributionControl: false,
        });

        map.addControl(new MapLib.NavigationControl({ showCompass: false }), 'bottom-right');

        map.on('load', () => {
          if (cancelled) return;
          mapRef.current = map;

          map.addSource('live-route', {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} },
          });
          map.addLayer({
            id: 'live-route-glow',
            type: 'line',
            source: 'live-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#2563eb', 'line-width': 9, 'line-opacity': 0.15 },
          });
          map.addLayer({
            id: 'live-route-line',
            type: 'line',
            source: 'live-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#2563eb', 'line-width': 4, 'line-opacity': 0.85 },
          });

          setMapReady(true);
        });
      } catch (err) {
        console.warn('[LiveTrackingMap] maplibre-gl load error:', err);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        setMapReady(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update driver marker
  useEffect(() => {
    if (!mapReady || !mapRef.current || !mlRef.current || !driverLocation) return;
    const MapLib = mlRef.current.default || mlRef.current;
    const map = mapRef.current;
    const { lat, lng, heading = 0 } = driverLocation;

    if (!markerRef.current) {
      const el = document.createElement('div');
      el.innerHTML = livePinHTML(heading);
      markerRef.current = new MapLib.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
    } else {
      markerRef.current.setLngLat([lng, lat]);
      const arrow = markerRef.current.getElement().querySelector('div > div:last-child');
      if (arrow) arrow.style.transform = `rotate(${heading}deg)`;
    }

    map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 14), duration: 800 });
  }, [mapReady, driverLocation]);

  // Update breadcrumb polyline
  useEffect(() => {
    if (!mapReady || !mapRef.current || routePath.length < 2) return;
    const src = mapRef.current.getSource('live-route');
    if (!src) return;
    src.setData({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: routePath.map(p => [p.lng, p.lat]) },
      properties: {},
    });
  }, [mapReady, routePath]);

  const showWaiting = !driverLocation;
  const showLive = isDriver ? locationSharingActive : !!driverLocation;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 260 }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Live pill */}
      {showLive && (
        <div style={{
          position: 'absolute', top: 10, left: 10, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.95)', border: '1px solid #d1fae5',
          borderRadius: 20, padding: '4px 10px',
          fontSize: 11, fontWeight: 700, color: '#15803d',
          boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: '#22c55e',
            boxShadow: '0 0 0 2px rgba(34,197,94,0.3)',
            animation: 'smr-live-pulse 1.8s ease-out infinite',
            display: 'inline-block',
          }} />
          {isDriver ? 'Broadcasting Location (Live)' : 'Driver Location (Live)'}
        </div>
      )}

      {/* Speed pill */}
      {driverLocation?.speed != null && (
        <div style={{
          position: 'absolute', top: 10, right: 10, zIndex: 10,
          background: 'rgba(255,255,255,0.95)', border: '1px solid #e5e7eb',
          borderRadius: 20, padding: '4px 10px',
          fontSize: 11, fontWeight: 700, color: '#374151',
          boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
        }}>
          {Math.max(0, Math.round((driverLocation.speed || 0) * 3.6))} km/h
        </div>
      )}

      {/* Waiting overlay */}
      {showWaiting && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(248,250,252,0.88)',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: '#eff6ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
          }}>
            <svg width="24" height="24" fill="none" stroke="#60a5fa" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>
            {isDriver ? 'Waiting for GPS signal…' : "Waiting for driver's location…"}
          </p>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>
            {isDriver ? 'Make sure location permissions are enabled on your device' : 'Live updates will display automatically as driver moves'}
          </p>
        </div>
      )}

      {OLA_KEY && (
        <div style={{
          position: 'absolute', bottom: 4, left: 8, zIndex: 10,
          fontSize: 9, color: 'rgba(0,0,0,0.3)', fontWeight: 500,
        }}>
          © OLA Maps
        </div>
      )}
    </div>
  );
}
