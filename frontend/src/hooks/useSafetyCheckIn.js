// src/hooks/useSafetyCheckIn.js


import { useEffect, useState, useCallback } from 'react';
import { useSocketContext } from '../contexts/SocketContext';
import { useAuth } from './useAuth';
import { respondToSafetyCheck } from '../services/rideLifecycleService';

export function useSafetyCheckIn(rideId) {
  const { socket } = useSocketContext();
  const { user } = useAuth();
  const [pendingCheck, setPendingCheck] = useState(null);
  const [alertBanner, setAlertBanner] = useState(null);
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    if (!rideId || !socket) return;

    const onCheck = (payload) => {
      if (payload.rideId !== rideId) return;
      if (payload.passengerId !== user?._id) return; // only ever mine
      setPendingCheck(payload);
    };

    const onResolved = (payload) => {
      if (payload.rideId !== rideId) return;
      if (payload.passengerId === user?._id) setPendingCheck(null);
    };

    const onAlert = (payload) => {
      if (payload.rideId !== rideId) return;
      setAlertBanner(payload);
    };

    socket.on('ride:safety_check', onCheck);
    socket.on('ride:safety_check_resolved', onResolved);
    socket.on('ride:passenger_alert', onAlert);

    return () => {
      socket.off('ride:safety_check', onCheck);
      socket.off('ride:safety_check_resolved', onResolved);
      socket.off('ride:passenger_alert', onAlert);
    };
  }, [rideId, socket, user?._id]);

  const respond = useCallback(
    async (response) => {
      setResponding(true);
      try {
        await respondToSafetyCheck(rideId, response);
        setPendingCheck(null);
      } finally {
        setResponding(false);
      }
    },
    [rideId]
  );

  const dismissAlertBanner = useCallback(() => setAlertBanner(null), []);

  return { pendingCheck, respond, responding, alertBanner, dismissAlertBanner };
}

export default useSafetyCheckIn;