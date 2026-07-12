// src/hooks/useAdminEmergencyFeed.js


import { useEffect, useState, useCallback } from 'react';
import { useSocketContext } from '../contexts/SocketContext';
import * as emergencyService from '../services/emergencyService';

export function useAdminEmergencyFeed() {
  const { socket } = useSocketContext();
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await emergencyService.getActiveEmergencies();
      setEmergencies(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!socket) return;

    const onTriggered = (payload) => {
      setEmergencies((prev) => [payload, ...prev.filter((e) => e.rideId !== payload.rideId)]);
    };
    const onResolved = (payload) => {
      setEmergencies((prev) => prev.filter((e) => e.emergencyEventId !== payload.emergencyEventId));
    };
    const onAcknowledged = (payload) => {
      setEmergencies((prev) =>
        prev.map((e) =>
          e.emergencyEventId === payload.emergencyEventId ? { ...e, acknowledged: true } : e
        )
      );
    };

    socket.on('ride:sos_triggered', onTriggered);
    socket.on('ride:sos_resolved', onResolved);
    socket.on('ride:sos_acknowledged', onAcknowledged);

    return () => {
      socket.off('ride:sos_triggered', onTriggered);
      socket.off('ride:sos_resolved', onResolved);
      socket.off('ride:sos_acknowledged', onAcknowledged);
    };
  }, [socket]);

  return { emergencies, loading, refresh };
}

export default useAdminEmergencyFeed;