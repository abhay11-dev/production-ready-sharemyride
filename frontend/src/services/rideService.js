import api from '../config/api';

// Post a new ride
export const postRide = async (rideData) => {
  const response = await api.post('/rides', rideData);
  return response.data;
};

// Search for available rides
export const searchRides = async (start, end) => {
  const response = await api.get('/rides/search', {
    params: { start, end },
  });
  return response.data;
};

// Get all rides posted by the current user
export const getMyRides = async () => {
  const response = await api.get('/rides/my');
  return response.data;
};

// Delete a ride
export const deleteRide = async (rideId) => {
  const response = await api.delete(`/rides/${rideId}`);
  return response.data;
};
