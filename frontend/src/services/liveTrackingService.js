// src/services/liveTrackingService.js


import api from '../config/api';

export const reportLocation = async (rideId, points) => {
  const response = await api.post(`/ride-journey/${rideId}/location`, { points });
  return response.data.data;
};

export const getLocationHistory = async (rideId, { role, limit } = {}) => {
  const response = await api.get(`/ride-journey/${rideId}/location/history`, {
    params: { role, limit }
  });
  return response.data.data;
};

export default { reportLocation, getLocationHistory };