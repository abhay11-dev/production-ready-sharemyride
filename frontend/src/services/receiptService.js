import api from '../config/api';
import { toast } from 'react-toastify'; // Assuming you use toast notifications

// ============================================
// CONFIGURATION & CONSTANTS
// ============================================

const RECEIPT_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  TIMEOUT: 30000, // 30 seconds
  SUPPORTED_FORMATS: ['pdf'],
  FILE_PREFIX: 'RideShare_Receipt'
};

const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  TIMEOUT: 'Request timeout. Please try again.',
  UNAUTHORIZED: 'You are not authorized to access this receipt.',
  NOT_FOUND: 'Receipt not found. Please verify the booking.',
  PAYMENT_INCOMPLETE: 'Payment not completed. Receipt cannot be generated.',
  SERVER_ERROR: 'Server error. Please try again later.',
  DOWNLOAD_FAILED: 'Failed to download receipt. Please try again.',
  INVALID_BOOKING_ID: 'Invalid booking ID provided.'
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Validates booking ID format
 * @param {String} bookingId - Booking ID to validate
 * @returns {Boolean} Is valid
 */
const isValidBookingId = (bookingId) => {
  return bookingId && /^[0-9a-fA-F]{24}$/.test(bookingId);
};

/**
 * Extracts error message from API error response
 * @param {Object} error - Error object
 * @returns {String} User-friendly error message
 */
const getErrorMessage = (error) => {
  if (error.response) {
    const status = error.response.status;
    const message = error.response.data?.message;

    switch (status) {
      case 400:
        return message || ERROR_MESSAGES.INVALID_BOOKING_ID;
      case 401:
        return ERROR_MESSAGES.UNAUTHORIZED;
      case 403:
        return ERROR_MESSAGES.UNAUTHORIZED;
      case 404:
        return message || ERROR_MESSAGES.NOT_FOUND;
      case 500:
        return ERROR_MESSAGES.SERVER_ERROR;
      default:
        return message || ERROR_MESSAGES.SERVER_ERROR;
    }
  } else if (error.request) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  } else if (error.code === 'ECONNABORTED') {
    return ERROR_MESSAGES.TIMEOUT;
  }
  return error.message || ERROR_MESSAGES.SERVER_ERROR;
};

/**
 * Creates and triggers file download
 * @param {Blob} blob - File blob
 * @param {String} filename - Download filename
 */
const triggerDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
};

/**
 * Generates download filename with timestamp
 * @param {String} bookingId - Booking ID
 * @returns {String} Formatted filename
 */
const generateFilename = (bookingId) => {
  const timestamp = new Date().getTime();
  return `${RECEIPT_CONFIG.FILE_PREFIX}_${bookingId}_${timestamp}.pdf`;
};

/**
 * Delay utility for retry logic
 * @param {Number} ms - Milliseconds to delay
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================
// RECEIPT SERVICE CLASS
// ============================================

class ReceiptService {
  /**
   * Download PDF receipt for a booking with retry logic
   * @param {String} bookingId - Booking ID
   * @param {Object} options - Download options
   * @returns {Promise<Object>} Success response
   */
  static async downloadReceipt(bookingId, options = {}) {
    const {
      showToast = true,
      onProgress = null,
      retries = RECEIPT_CONFIG.MAX_RETRIES
    } = options;

    // Validation
    if (!isValidBookingId(bookingId)) {
      const error = new Error(ERROR_MESSAGES.INVALID_BOOKING_ID);
      if (showToast) toast.error(error.message);
      throw error;
    }

    let lastError = null;

    // Retry loop
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (showToast && attempt === 1) {
          toast.info('Generating receipt...', { autoClose: 2000 });
        }

        const response = await api.get(`/receipts/download/${bookingId}`, {
          responseType: 'blob',
          timeout: RECEIPT_CONFIG.TIMEOUT,
          onDownloadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress(percentCompleted);
            }
          }
        });

        // Validate response
        if (!response.data || response.data.size === 0) {
          throw new Error('Empty file received');
        }

        // Check if response is actually a PDF
        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.includes('pdf')) {
          // Handle case where API returns JSON error as blob
          const text = await response.data.text();
          try {
            const errorData = JSON.parse(text);
            throw new Error(errorData.message || ERROR_MESSAGES.DOWNLOAD_FAILED);
          } catch {
            throw new Error('Invalid file format received');
          }
        }

        // Trigger download
        const filename = generateFilename(bookingId);
        triggerDownload(response.data, filename);

        if (showToast) {
          toast.success('Receipt downloaded successfully!');
        }

        return { 
          success: true, 
          filename,
          size: response.data.size 
        };

      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        const shouldRetry = error.response?.status >= 500 || 
                           error.code === 'ECONNABORTED';
        
        if (!shouldRetry || attempt === retries) {
          break;
        }

        // Wait before retry
        await delay(RECEIPT_CONFIG.RETRY_DELAY * attempt);
      }
    }

    // All retries failed
    const errorMessage = getErrorMessage(lastError);
    
    if (showToast) {
      toast.error(errorMessage);
    }

    throw new Error(errorMessage);
  }

  /**
   * Get receipt data in JSON format (preview)
   * @param {String} bookingId - Booking ID
   * @returns {Promise<Object>} Receipt data
   */
  static async getReceiptPreview(bookingId) {
    if (!isValidBookingId(bookingId)) {
      throw new Error(ERROR_MESSAGES.INVALID_BOOKING_ID);
    }

    try {
      const response = await api.get(`/receipts/preview/${bookingId}`, {
        timeout: RECEIPT_CONFIG.TIMEOUT
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to fetch receipt data');
      }

      return response.data.data;

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Check if receipt is available for a booking
   * @param {String} bookingId - Booking ID
   * @returns {Promise<Object>} Receipt status
   */
  static async checkReceiptStatus(bookingId) {
    if (!isValidBookingId(bookingId)) {
      throw new Error(ERROR_MESSAGES.INVALID_BOOKING_ID);
    }

    try {
      const response = await api.get(`/receipts/status/${bookingId}`, {
        timeout: 10000 // Shorter timeout for status check
      });

      if (!response.data?.success) {
        throw new Error('Failed to check receipt status');
      }

      return response.data.data;

    } catch (error) {
      console.error('Receipt status check failed:', error);
      // Return a default response instead of throwing
      return {
        receiptAvailable: false,
        bookingStatus: 'unknown',
        paymentStatus: 'unknown',
        paymentDate: null
      };
    }
  }

  /**
   * Batch download multiple receipts
   * @param {Array<String>} bookingIds - Array of booking IDs
   * @param {Object} options - Download options
   * @returns {Promise<Object>} Batch download results
   */
  static async downloadMultipleReceipts(bookingIds, options = {}) {
    const { showToast = true } = options;

    if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
      throw new Error('Invalid booking IDs array');
    }

    const results = {
      successful: [],
      failed: []
    };

    if (showToast) {
      toast.info(`Downloading ${bookingIds.length} receipts...`);
    }

    for (const bookingId of bookingIds) {
      try {
        await this.downloadReceipt(bookingId, { 
          showToast: false,
          retries: 1 
        });
        results.successful.push(bookingId);
      } catch (error) {
        results.failed.push({ 
          bookingId, 
          error: error.message 
        });
      }

      // Small delay between downloads
      await delay(500);
    }

    if (showToast) {
      if (results.failed.length === 0) {
        toast.success(`All ${bookingIds.length} receipts downloaded!`);
      } else {
        toast.warning(
          `Downloaded ${results.successful.length}/${bookingIds.length} receipts`
        );
      }
    }

    return results;
  }

  /**
   * Get receipt URL for viewing (if supported by backend)
   * @param {String} bookingId - Booking ID
   * @returns {String} Receipt URL
   */
  static getReceiptUrl(bookingId) {
    if (!isValidBookingId(bookingId)) {
      throw new Error(ERROR_MESSAGES.INVALID_BOOKING_ID);
    }
    return `/api/receipts/download/${bookingId}`;
  }
}

// ============================================
// EXPORTS
// ============================================

// Named exports for backwards compatibility
export const downloadReceipt = (bookingId, options) => 
  ReceiptService.downloadReceipt(bookingId, options);

export const getReceiptData = (bookingId) => 
  ReceiptService.getReceiptPreview(bookingId);

export const checkReceiptAvailability = (bookingId) =>
  ReceiptService.checkReceiptStatus(bookingId);

export const downloadMultipleReceipts = (bookingIds, options) =>
  ReceiptService.downloadMultipleReceipts(bookingIds, options);

// Default export
export default ReceiptService;