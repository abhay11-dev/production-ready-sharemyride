// src/hooks/useLocationReporter.js


import { useEffect, useRef } from 'react';
import { reportLocation } from '../services/liveTrackingService';

const FLUSH_INTERVAL_MS = 10000; // normal conditions
const FLUSH_INTERVAL_MS_LOW_BATTERY = 20000;
const MAX_BUFFER_BEFORE_FORCE_FLUSH = 50;

export function useLocationReporter(rideId, { enabled = true } = {}) {
  const bufferRef = useRef([]);
  const watchIdRef = useRef(null);
  const flushTimerRef = useRef(null);
  const lowBatteryRef = useRef(false);

  useEffect(() => {
    if (!enabled || !rideId || !('geolocation' in navigator)) return;
    let cancelled = false;

    // Best-effort battery awareness — silently no-ops on unsupported
    // browsers (Safari, most non-Chromium browsers).
    if (navigator.getBattery) {
      navigator.getBattery().then((battery) => {
        const update = () => {
          lowBatteryRef.current = battery.level <= 0.2 && !battery.charging;
        };
        update();
        battery.addEventListener('levelchange', update);
        battery.addEventListener('chargingchange', update);
      }).catch(() => {});
    }

    const flush = async () => {
      if (bufferRef.current.length === 0) return;
      if (!navigator.onLine) return; // stay buffered until connectivity returns

      const toSend = bufferRef.current;
      bufferRef.current = [];
      try {
        await reportLocation(rideId, toSend);
      } catch (err) {
        // Put the points back so they aren't lost — next successful flush
        // will include them (server dedupes purely by timestamp ordering,
        // duplicates are harmless for anomaly detection).
        if (!cancelled) bufferRef.current = [...toSend, ...bufferRef.current];
        console.warn('⚠️ Location report failed, will retry:', err?.message);
      }
    };

    const onPosition = (position) => {
      const point = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        speed: position.coords.speed ?? undefined,
        heading: position.coords.heading ?? undefined,
        accuracy: position.coords.accuracy ?? undefined,
        at: new Date(position.timestamp).toISOString()
      };
      bufferRef.current.push(point);
      if (bufferRef.current.length >= MAX_BUFFER_BEFORE_FORCE_FLUSH) flush();
    };

    const onPositionError = (err) => {
      // GPS signal loss — don't tear anything down, just wait for the
      // next successful fix. Nothing to buffer, nothing to send.
      console.warn('⚠️ Geolocation error:', err.message);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(onPosition, onPositionError, {
      enableHighAccuracy: !lowBatteryRef.current,
      maximumAge: 5000,
      timeout: 15000
    });

    const scheduleFlush = () => {
      const interval = lowBatteryRef.current ? FLUSH_INTERVAL_MS_LOW_BATTERY : FLUSH_INTERVAL_MS;
      flushTimerRef.current = setTimeout(async () => {
        await flush();
        if (!cancelled) scheduleFlush();
      }, interval);
    };
    scheduleFlush();

    const onOnline = () => flush();
    window.addEventListener('online', onOnline);

    return () => {
      cancelled = true;
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      window.removeEventListener('online', onOnline);
      // Best-effort final flush on unmount (e.g. ride completed screen
      // change) — fire and forget, nothing to await into on a teardown.
      flush();
    };
  }, [rideId, enabled]);
}

export default useLocationReporter;