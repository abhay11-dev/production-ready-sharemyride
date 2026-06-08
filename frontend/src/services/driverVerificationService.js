// src/services/driverVerificationService.js
import api from '../config/api';

/**
 * Get current driver verification status and step completion
 */
export const getVerificationStatus = async () => {
  const response = await api.get('/driver-verification/status');
  return response.data;
};

/**
 * Upload profile photo
 * @param {File} photoFile
 */
export const uploadProfilePhoto = async (photoFile) => {
  const formData = new FormData();
  formData.append('photo', photoFile);
  const response = await api.post('/driver-verification/profile-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

/**
 * Upload Aadhaar card
 * @param {string} aadhaarNumber  - 12-digit number
 * @param {File}   frontFile
 * @param {File}   backFile
 */
export const uploadAadhaar = async (aadhaarNumber, frontFile, backFile) => {
  const formData = new FormData();
  formData.append('aadhaarNumber', aadhaarNumber.replace(/\D/g, ''));
  formData.append('frontImage', frontFile);
  formData.append('backImage', backFile);
  const response = await api.post('/driver-verification/aadhaar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

/**
 * Upload Driving License
 * @param {string} dlNumber    - e.g. PB0120200012345
 * @param {string} expiryDate  - ISO date string
 * @param {File}   frontFile
 * @param {File}   backFile
 */
export const uploadDrivingLicense = async (dlNumber, expiryDate, frontFile, backFile) => {
  const formData = new FormData();
  formData.append('licenseNumber', dlNumber.replace(/[\s-]/g, '').toUpperCase());
  formData.append('expiryDate', expiryDate);
  formData.append('frontImage', frontFile);
  formData.append('backImage', backFile);
  const response = await api.post('/driver-verification/driving-license', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

/**
 * Submit all documents for admin review
 */
export const submitForReview = async () => {
  const response = await api.post('/driver-verification/submit');
  return response.data;
};
