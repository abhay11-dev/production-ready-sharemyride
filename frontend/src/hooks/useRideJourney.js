// src/hooks/useRideJourney.js


import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocketContext } from '../contexts/SocketContext';
import { getRideJourney } from '../services/rideLifecycleService';

export function useRideJourney(rideId) {
  const { socket, connected } = useSocketContext();
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const joinedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!rideId) return;
    try {
      const data = await getRideJourney(rideId);
      setJourney(data);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load ride journey');
    } finally {
      setLoading(false);
    }
  }, [rideId]);

  // Initial REST load — independent of socket connection state, so the
  // dashboard still shows something useful even if the socket is slow to
  // connect or briefly drops.
  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  // Live sync — joins the ride room once connected, re-joins automatically
  // on reconnect (SocketContext creates a fresh socket per auth identity,
  // so this effect re-runs whenever `socket` itself changes).
  useEffect(() => {
    if (!rideId || !socket || !connected) return;
    let cancelled = false;

    socket.emit('ride:join', { rideId }, (ack) => {
      if (cancelled) return;
      if (ack?.success) {
        joinedRef.current = true;
      } else if (ack?.message) {
        // Non-fatal — REST refresh() still works; live updates just won't
        // arrive until join succeeds (e.g. once the journey exists after
        // the driver presses Start Ride).
        console.warn('⚠️ ride:join failed:', ack.message);
      }
    });

    // Every event carries the full new stage + the single new timeline
    // entry (see emitSync in rideLifecycleService.js) — merge rather than
    // replace so we don't need a full refetch on every update.
    const applyUpdate = (payload) => {
      if (cancelled || payload.rideId !== rideId) return;
      setJourney((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          stage: payload.stage,
          safetyStatus: payload.safetyStatus,
          updatedAt: payload.updatedAt,
          timeline: payload.timeline
            ? [...prev.timeline, payload.timeline]
            : prev.timeline
        };
      });
    };

    const onBoarded = (payload) => {
      applyUpdate(payload);
      // Passenger boarded-count/list isn't in the merged shape above —
      // just refetch for the authoritative per-passenger list, it's cheap
      // and boarding events are infrequent (once per passenger per ride).
      if (!cancelled) refresh();
    };

    socket.on('ride:started', applyUpdate);
    socket.on('ride:status', applyUpdate);
    socket.on('ride:passenger_boarded', onBoarded);
    socket.on('ride:completed', applyUpdate);

    return () => {
      cancelled = true;
      socket.off('ride:started', applyUpdate);
      socket.off('ride:status', applyUpdate);
      socket.off('ride:passenger_boarded', onBoarded);
      socket.off('ride:completed', applyUpdate);
      if (joinedRef.current) {
        socket.emit('ride:leave', { rideId });
        joinedRef.current = false;
      }
    };
  }, [rideId, socket, connected, refresh]);

  return { journey, loading, error, refresh };
}

export default useRideJourney;