// src/hooks/useEmergency.js


import { useEffect, useState, useCallback } from 'react';
import { useSocketContext } from '../contexts/SocketContext';
import * as emergencyService from '../services/emergencyService';

function getBestEffortLocation() {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null), // fall back to server-side last-known-location — never block SOS on GPS
      { timeout: 3000, maximumAge: 10000 }
    );
  });
}

export function useEmergency(rideId) {
  const { socket } = useSocketContext();
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState(null); // { contacts, platformSupportNumber }
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!rideId || !socket) return;

    const onTriggered = (payload) => {
      if (payload.rideId !== rideId) return;
      setActiveEmergency(payload);
    };
    const onAcknowledged = (payload) => {
      if (payload.rideId !== rideId) return;
      setActiveEmergency((prev) => (prev ? { ...prev, acknowledged: true } : prev));
    };
    const onResolved = (payload) => {
      if (payload.rideId !== rideId) return;
      setActiveEmergency(null);
    };

    socket.on('ride:sos_triggered', onTriggered);
    socket.on('ride:sos_acknowledged', onAcknowledged);
    socket.on('ride:sos_resolved', onResolved);

    return () => {
      socket.off('ride:sos_triggered', onTriggered);
      socket.off('ride:sos_acknowledged', onAcknowledged);
      socket.off('ride:sos_resolved', onResolved);
    };
  }, [rideId, socket]);

  const trigger = useCallback(async () => {
    setTriggering(true);
    setError(null);
    try {
      const location = await getBestEffortLocation();
      const result = await emergencyService.triggerSOS(rideId, location);
      setTriggerResult(result);

      // Best-effort click-to-call — browsers require a user gesture for
      // this to reliably work, which the SOS button press itself
      // provides. Only the highest-priority contact is auto-dialed to
      // avoid stacking multiple tel: navigations; the rest are shown in
      // the UI for the user to tap manually if needed.
      const primary = result.contacts?.[0];
      if (primary?.phone) {
        window.location.href = `tel:${primary.phone}`;
      }

      return result;
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not trigger SOS — please call emergency services directly');
      throw err;
    } finally {
      setTriggering(false);
    }
  }, [rideId]);

  return { activeEmergency, trigger, triggering, triggerResult, error };
}

export default useEmergency;