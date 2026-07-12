// src/hooks/useLiveRideLocations.js


import { useEffect, useState } from 'react';
import { useSocketContext } from '../contexts/SocketContext';

export function useLiveRideLocations(rideId) {
  const { socket } = useSocketContext();
  const [locations, setLocations] = useState({}); // userId -> { role, lat, lng, speed, heading, at }
  const [routeDeviation, setRouteDeviation] = useState({ active: false });
  const [longStop, setLongStop] = useState({ active: false });

  useEffect(() => {
    if (!rideId || !socket) return;

    const onLocation = (payload) => {
      if (payload.rideId !== rideId) return;
      setLocations((prev) => ({
        ...prev,
        [payload.userId]: {
          role: payload.role,
          lat: payload.lat,
          lng: payload.lng,
          speed: payload.speed,
          heading: payload.heading,
          at: payload.at
        }
      }));
    };

    const onDeviation = (payload) => {
      if (payload.rideId !== rideId) return;
      setRouteDeviation({ active: true, distanceMeters: payload.distanceMeters, since: payload.since });
    };

    const onLongStop = (payload) => {
      if (payload.rideId !== rideId) return;
      setLongStop({ active: true, since: payload.since, lat: payload.lat, lng: payload.lng });
    };

    // `ride:status` updates also carry the latest routeDeviation/longStop
    // state implicitly via a full journey refetch elsewhere (useRideJourney)
    // — these two listeners only handle the "just became active" push so
    // the map can show an alert banner the instant it happens.
    socket.on('ride:location', onLocation);
    socket.on('ride:route_deviation', onDeviation);
    socket.on('ride:long_stop', onLongStop);

    return () => {
      socket.off('ride:location', onLocation);
      socket.off('ride:route_deviation', onDeviation);
      socket.off('ride:long_stop', onLongStop);
    };
  }, [rideId, socket]);

  return { locations, routeDeviation, longStop };
}

export default useLiveRideLocations;