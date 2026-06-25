// src/services/bookingService.js
// Uses the shared api.js axios instance (in-memory access token + HttpOnly refresh cookie).
// Never use localStorage for tokens here — api.js interceptors handle auth transparently.

import api from '../config/api.js';

// ─── Create Booking ───────────────────────────────────────────────────────────
export const createBooking = async (bookingData) => {
  const response = await api.post('/bookings', bookingData);
  return response.data?.data || response.data;
};

// ─── Get My Bookings (passenger) ─────────────────────────────────────────────
export const getMyBookings = async (params = {}) => {
  const response = await api.get('/bookings/my', { params });
  if (Array.isArray(response.data)) return response.data;
  return response.data?.bookings || response.data?.data || [];
};

// ─── Get Driver Bookings ──────────────────────────────────────────────────────
export const getDriverBookings = async (params = {}) => {
  const response = await api.get('/bookings/driver', { params });
  if (Array.isArray(response.data)) return response.data;
  return response.data?.bookings || response.data?.data || [];
};

// ─── Get Single Booking ───────────────────────────────────────────────────────
export const getBookingById = async (bookingId) => {
  const response = await api.get(`/bookings/${bookingId}`);
  return response.data?.data || response.data;
};

// ─── Update Booking Status (driver/passenger) ─────────────────────────────────
export const updateBookingStatus = async (bookingId, status, reason = '', message = '') => {
  const response = await api.patch(`/bookings/${bookingId}/status`, { status, reason, message });
  return response.data?.data || response.data;
};

// ─── Cancel Booking (passenger) ───────────────────────────────────────────────
export const cancelBooking = async (bookingId, reason = '') => {
  const response = await api.post(`/bookings/${bookingId}/cancel`, { reason });
  return response.data?.data || response.data;
};

// ─── Complete Payment ─────────────────────────────────────────────────────────
export const completePayment = async (bookingId, paymentDetails) => {
  const response = await api.post(`/bookings/${bookingId}/payment`, paymentDetails);
  return response.data?.data || response.data;
};

// ─── Add Rating ───────────────────────────────────────────────────────────────
export const addRating = async (bookingId, rating, review = '', categories = {}) => {
  const response = await api.post(`/bookings/${bookingId}/rating`, { rating, review, categories });
  return response.data;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const canCancelBooking = (booking) =>
  ['pending', 'accepted'].includes(booking.status);

export const canRateBooking = (booking) =>
  booking.status === 'completed' && !booking.driverRating;

export const calculateRefund = (rideDate, totalFare) => {
  const hoursUntil = (new Date(rideDate) - new Date()) / 3_600_000;
  return hoursUntil > 24 ? totalFare : totalFare * 0.97;
};

export const formatBookingStatus = (status) => {
  const map = {
    pending:   { label: 'Pending',   color: 'yellow', icon: '⏳' },
    accepted:  { label: 'Accepted',  color: 'green',  icon: '✅' },
    rejected:  { label: 'Rejected',  color: 'red',    icon: '❌' },
    cancelled: { label: 'Cancelled', color: 'gray',   icon: '🚫' },
    completed: { label: 'Completed', color: 'blue',   icon: '🎉' },
    no_show:   { label: 'No Show',   color: 'orange', icon: '⚠️' },
  };
  return map[status] || { label: status, color: 'gray', icon: '❓' };
};

export default {
  createBooking, getMyBookings, getDriverBookings, getBookingById,
  updateBookingStatus, cancelBooking, completePayment, addRating,
  calculateRefund, formatBookingStatus, canCancelBooking, canRateBooking,
};