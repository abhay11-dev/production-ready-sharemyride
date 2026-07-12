// src/services/emergencyService.js


import api from '../config/api';

export const triggerSOS = async (rideId, location) => {
  const response = await api.post(`/emergency/${rideId}/sos`, location || {});
  return response.data.data;
};

export const acknowledgeSOS = async (rideId, emergencyEventId) => {
  const response = await api.post(`/emergency/${rideId}/${emergencyEventId}/acknowledge`);
  return response.data.data;
};

export const resolveSOS = async (rideId, emergencyEventId, outcome, notes) => {
  const response = await api.post(`/emergency/${rideId}/${emergencyEventId}/resolve`, { outcome, notes });
  return response.data.data;
};

export const getActiveEmergencies = async () => {
  const response = await api.get('/emergency/active');
  return response.data.data;
};

export default { triggerSOS, acknowledgeSOS, resolveSOS, getActiveEmergencies };