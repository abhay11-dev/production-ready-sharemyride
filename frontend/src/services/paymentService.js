import api from '../config/api';

// services/paymentService.js

export const createPaymentOrder = async (bookingId, rideId) => {
  const response = await api.post('/payments/create-order', { 
    bookingId,
    rideId 
  });
  return response.data;
};

export const verifyPayment = async (paymentData) => {
  const response = await api.post('/payments/verify', paymentData);
  return response.data;
};

export const getTransaction = async (transactionId) => {
  const response = await api.get(`/payments/transaction/${transactionId}`);
  return response.data;
};

export const getPassengerTransactions = async () => {
  const response = await api.get('/payments/passenger/transactions');
  return response.data;
};

// Add this missing function
export const getBookingPaymentDetails = async (bookingId) => {
  const response = await api.get(`/payments/booking/${bookingId}`);
  return response.data;
};