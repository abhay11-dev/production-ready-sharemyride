import api from '../config/api';

/**
 * Download PDF receipt for a booking
 */
export const downloadReceipt = async (bookingId) => {
  try {
    const response = await api.get(`/receipts/download/${bookingId}`, {
      responseType: 'blob' // Important for file download
    });

    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `RideShare_Receipt_${bookingId}.pdf`);
    
    // Append to html link element page
    document.body.appendChild(link);
    
    // Start download
    link.click();
    
    // Clean up and remove the link
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error('Error downloading receipt:', error);
    throw error;
  }
};

/**
 * Get receipt data in JSON format
 */
export const getReceiptData = async (bookingId) => {
  try {
    const response = await api.get(`/receipts/view/${bookingId}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching receipt data:', error);
    throw error;
  }
};