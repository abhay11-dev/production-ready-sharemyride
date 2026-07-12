// src/services/rideLifecycleService.js


import api from '../config/api';

export const getRideJourney = async (rideId) => {
  const response = await api.get(`/ride-journey/${rideId}`);
  return response.data.data;
};

export const startRide = async (rideId) => {
  const response = await api.post(`/ride-journey/${rideId}/start`);
  return response.data.data;
};

export const confirmBoarding = async (rideId) => {
  const response = await api.post(`/ride-journey/${rideId}/board`);
  return response.data.data;
};

export const beginActiveLeg = async (rideId) => {
  const response = await api.post(`/ride-journey/${rideId}/begin-active`);
  return response.data.data;
};

export const markDestinationReached = async (rideId) => {
  const response = await api.post(`/ride-journey/${rideId}/destination-reached`);
  return response.data.data;
};

export const completeRide = async (rideId) => {
  const response = await api.post(`/ride-journey/${rideId}/complete`);
  return response.data.data;
};

export const archiveRideJourney = async (rideId) => {
  const response = await api.post(`/ride-journey/${rideId}/archive`);
  return response.data.data;
};

export const cancelRideJourney = async (rideId, reason) => {
  const response = await api.post(`/ride-journey/${rideId}/cancel`, { reason });
  return response.data.data;
};

// Phase 3 — Intelligent Safety Check-ins
export const respondToSafetyCheck = async (rideId, response) => {
  const res = await api.post(`/ride-journey/${rideId}/safety-check/respond`, { response });
  return res.data.data;
};

// Phase 5 — Privacy & Consent
export const setLocationConsent = async (rideId, granted) => {
  const res = await api.post(`/ride-journey/${rideId}/location/consent`, { granted });
  return res.data.data;
};

export default {
  getRideJourney,
  startRide,
  confirmBoarding,
  beginActiveLeg,
  markDestinationReached,
  completeRide,
  archiveRideJourney,
  cancelRideJourney,
  respondToSafetyCheck,
  setLocationConsent
};