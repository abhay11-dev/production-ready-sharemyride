import api from '../config/api';

export const createPaymentOrder = async (bookingId) => {
  try {
    const response = await api.post('/payments/create-order', { bookingId });
    return response.data;
  } catch (error) {
    console.error('Error creating payment order:', error);
    throw error;
  }
};

export const verifyPayment = async (paymentData) => {
  try {
    const response = await api.post('/payments/verify-payment', paymentData);
    return response.data;
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};

export default {
  createPaymentOrder,
  verifyPayment
};