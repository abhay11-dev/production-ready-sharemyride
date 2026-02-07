// services/receiptService.js
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import api from '../config/api';

/**
 * Receipt Service - Handles receipt generation and download
 */
class ReceiptService {
  
  /**
   * Download receipt for a booking
   * @param {string} bookingId - Booking ID
   * @param {Object} options - Options { showToast, format }
   */
  async downloadReceipt(bookingId, options = {}) {
    const { showToast = true, format = 'pdf' } = options;
    
    try {
      if (showToast) {
        toast.loading('Generating receipt...', {
          id: 'receipt-loading',
          position: 'top-center',
        });
      }

      // Fetch booking details from API
      const booking = await this.fetchBookingDetails(bookingId);
      
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Generate PDF
      if (format === 'pdf') {
        await this.generatePDFReceipt(booking);
      }

      if (showToast) {
        toast.success('Receipt downloaded successfully!', {
          id: 'receipt-loading',
          position: 'top-center',
          icon: '📄',
          duration: 3000,
        });
      }

      // Log download
      this.logReceiptDownload(bookingId);

    } catch (error) {
      console.error('❌ Receipt download error:', error);
      
      if (showToast) {
        toast.error(error.message || 'Failed to download receipt', {
          id: 'receipt-loading',
          position: 'top-center',
          duration: 4000,
        });
      }
      
      throw error;
    }
  }

  /**
   * Fetch booking details from API
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object>} Booking data
   */
  async fetchBookingDetails(bookingId) {
    try {
      const response = await api.get(`/bookings/${bookingId}`);
      return response.data.data || response.data.booking || response.data;
    } catch (error) {
      console.error('Failed to fetch booking:', error);
      throw new Error('Could not fetch booking details');
    }
  }

  /**
   * Generate PDF receipt
   * @param {Object} booking - Booking data
   */
  async generatePDFReceipt(booking) {
    const doc = new jsPDF();
    
    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // ============================================
    // HEADER - Company Logo & Title
    // ============================================
    
    // Company Name
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235); // Blue
    doc.text('ShareMyRide', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // Tagline
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Your Trusted Ride Sharing Partner', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Horizontal line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // ============================================
    // RECEIPT TITLE
    // ============================================
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('RIDE RECEIPT', pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;

    // ============================================
    // RECEIPT INFO (Booking ID, Date, Status)
    // ============================================
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    
    const receiptInfo = [
      `Receipt No: ${booking._id || 'N/A'}`,
      `Issue Date: ${new Date().toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      })}`,
      `Status: ${this.formatStatus(booking.status)}`
    ];
    
    receiptInfo.forEach(info => {
      doc.text(info, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
    });
    yPos += 5;

    // ============================================
    // RIDE DETAILS
    // ============================================
    
    doc.setFillColor(240, 248, 255); // Light blue background
    doc.rect(20, yPos, pageWidth - 40, 8, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('RIDE DETAILS', 25, yPos + 5);
    yPos += 12;

    // Ride information - MANUAL TABLE (no autoTable)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    
    const rideDetails = [
      ['Ride Date:', this.formatDate(booking.ride?.date)],
      ['Ride Time:', booking.ride?.time || 'N/A'],
      ['Pickup Location:', booking.pickupLocation || 'N/A'],
      ['Drop Location:', booking.dropLocation || 'N/A'],
      ['Seats Booked:', booking.seatsBooked?.toString() || '1'],
    ];

    // Check if segment booking
    const isSegmentBooking = booking.matchType === 'on_route' && booking.userSearchDistance;
    
    if (isSegmentBooking) {
      rideDetails.push(
        ['Booking Type:', '📏 Segment Ride'],
        ['Your Distance:', `${booking.userSearchDistance?.toFixed(1)} km`],
        ['Rate per KM:', `₹${booking.perKmRate?.toFixed(2)}`]
      );
    }

    // Draw table manually
    rideDetails.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 25, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 80, yPos);
      yPos += 6;
    });

    yPos += 5;

    // ============================================
    // CONTACT INFORMATION
    // ============================================
    
    doc.setFillColor(240, 248, 255);
    doc.rect(20, yPos, pageWidth - 40, 8, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTACT INFORMATION', 25, yPos + 5);
    yPos += 12;

    // Determine role (passenger or driver)
    const isPassenger = booking.passenger?._id || booking.passenger;
    const contactPerson = isPassenger ? 'Driver' : 'Passenger';
    const contactData = isPassenger 
      ? booking.ride?.driverId || booking.driver
      : booking.passenger;

    const contactDetails = [
      [contactPerson + ' Name:', contactData?.name || 'N/A'],
      ['Phone Number:', contactData?.phone || booking.ride?.phoneNumber || 'N/A'],
    ];

    if (isPassenger && booking.ride?.vehicleNumber) {
      contactDetails.push(['Vehicle Number:', booking.ride.vehicleNumber]);
    }

    if (!isPassenger && contactData?.email) {
      contactDetails.push(['Email:', contactData.email]);
    }

    // Draw contact details
    doc.setFontSize(10);
    contactDetails.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 25, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 80, yPos);
      yPos += 6;
    });

    yPos += 5;

    // ============================================
    // FARE BREAKDOWN
    // ============================================
    
    doc.setFillColor(240, 248, 255);
    doc.rect(20, yPos, pageWidth - 40, 8, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FARE BREAKDOWN', 25, yPos + 5);
    yPos += 12;

    // Calculate fare details
    const baseFare = booking.baseFare || 0;
    const serviceFee = booking.passengerServiceFee || booking.platformFee || 0;
    const gst = booking.passengerServiceFeeGST || booking.gst || 0;
    const totalFare = booking.totalFare || (baseFare + serviceFee + gst);

    let fareData = [];

    if (isPassenger) {
      // Passenger view
      fareData = [
        ['Base Fare', `₹${baseFare.toFixed(2)}`],
        ['Service Fee', `₹${serviceFee.toFixed(2)}`],
        ['GST (18% on Service)', `₹${gst.toFixed(2)}`],
      ];
    } else {
      // Driver view
      const platformFeeAmount = serviceFee;
      const platformFeeGST = gst;
      
      fareData = [
        ['Base Fare', `₹${baseFare.toFixed(2)}`],
        ['Platform Fee (8%)', `- ₹${platformFeeAmount.toFixed(2)}`],
        ['GST on Fee (18%)', `- ₹${platformFeeGST.toFixed(2)}`],
      ];
    }

    // Draw fare breakdown
    doc.setFontSize(10);
    fareData.forEach(([label, value]) => {
      doc.setFont('helvetica', 'normal');
      doc.text(label, 25, yPos);
      doc.text(value, pageWidth - 25, yPos, { align: 'right' });
      yPos += 6;
    });

    yPos += 2;

    // Total line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(25, yPos, pageWidth - 25, yPos);
    yPos += 7;

    // Total amount
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    
    if (isPassenger) {
      doc.text('TOTAL PAID', 25, yPos);
      doc.text(`₹${totalFare.toFixed(2)}`, pageWidth - 25, yPos, { align: 'right' });
    } else {
      const netEarnings = baseFare - serviceFee - gst;
      doc.text('NET EARNINGS', 25, yPos);
      doc.text(`₹${netEarnings.toFixed(2)}`, pageWidth - 25, yPos, { align: 'right' });
    }

    yPos += 10;

    // ============================================
    // PAYMENT STATUS
    // ============================================
    
    doc.setFillColor(220, 252, 231); // Light green
    doc.rect(20, yPos, pageWidth - 40, 10, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74); // Green
    doc.text('✓ PAYMENT COMPLETED', pageWidth / 2, yPos + 6, { align: 'center' });
    yPos += 15;

    if (booking.paymentDate || booking.paymentCompletedAt) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const paymentDate = new Date(booking.paymentDate || booking.paymentCompletedAt);
      doc.text(
        `Paid on: ${paymentDate.toLocaleDateString('en-IN')} at ${paymentDate.toLocaleTimeString('en-IN')}`,
        pageWidth / 2,
        yPos,
        { align: 'center' }
      );
      yPos += 10;
    }

    // ============================================
    // FOOTER
    // ============================================
    
    // Check if we need a new page
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 20;
    }

    yPos = pageHeight - 30;

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 7;

    // Footer text
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('Thank you for choosing ShareMyRide!', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.text('For support, contact us at support@sharemyride.com', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.text('This is a computer-generated receipt and does not require a signature.', pageWidth / 2, yPos, { align: 'center' });

    // ============================================
    // SAVE PDF
    // ============================================
    
    const fileName = `ShareMyRide_Receipt_${booking._id || Date.now()}.pdf`;
    doc.save(fileName);
  }

  /**
   * Format date for display
   */
  formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Format status for display
   */
  formatStatus(status) {
    const statusMap = {
      pending: 'Pending',
      accepted: 'Confirmed',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
      rejected: 'Rejected'
    };
    return statusMap[status] || status;
  }

  /**
   * Log receipt download (optional - for analytics)
   */
  async logReceiptDownload(bookingId) {
    try {
      await api.post(`/bookings/${bookingId}/receipt-download`, {
        downloadedAt: new Date(),
      });
    } catch (error) {
      // Silent fail - logging is not critical
      console.log('Could not log receipt download:', error.message);
    }
  }

  /**
   * Preview receipt in browser (optional feature)
   */
  async previewReceipt(bookingId) {
    try {
      const booking = await this.fetchBookingDetails(bookingId);
      
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Generate PDF in browser
      const doc = new jsPDF();
      await this.generatePDFReceipt(booking);
      
      // Open in new tab
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
      
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to preview receipt');
    }
  }
}

// Export singleton instance
const receiptService = new ReceiptService();
export default receiptService;