// services/receiptService.js
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import api from '../config/api';
import { registerNotoSansFonts } from './fonts/notoSansFonts';

// ─── Brand palette (mirrors the blue/green ShareMyRide theme used across the app) ──
const BRAND = {
  blue: [37, 99, 235],       // blue-600
  blueDark: [29, 78, 216],   // blue-700
  blueLight: [239, 246, 255],// blue-50
  green: [22, 163, 74],      // green-600
  greenLight: [240, 253, 244], // green-50
  amber: [217, 119, 6],      // amber-600
  amberLight: [255, 251, 235],
  red: [220, 38, 38],        // red-600
  redLight: [254, 242, 242],
  gray900: [17, 24, 39],
  gray600: [75, 85, 99],
  gray400: [156, 163, 175],
  gray100: [243, 244, 246],
  border: [229, 231, 235],
  white: [255, 255, 255],
};

const STATUS_BADGE = {
  pending: { color: BRAND.amber, bg: BRAND.amberLight, label: 'Pending' },
  accepted: { color: BRAND.blue, bg: BRAND.blueLight, label: 'Confirmed' },
  confirmed: { color: BRAND.blue, bg: BRAND.blueLight, label: 'Confirmed' },
  completed: { color: BRAND.green, bg: BRAND.greenLight, label: 'Completed' },
  cancelled: { color: BRAND.gray600, bg: BRAND.gray100, label: 'Cancelled' },
  rejected: { color: BRAND.red, bg: BRAND.redLight, label: 'Rejected' },
};

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
        const doc = this.buildReceiptDocument(booking);
        const fileName = `ShareMyRide_Receipt_${booking._id || Date.now()}.pdf`;
        doc.save(fileName);
      }

      if (showToast) {
        // This emoji lives in the browser toast UI (rendered by the OS/browser
        // font, not by jsPDF), so it's unrelated to the PDF glyph issue and is
        // safe to keep here.
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

  // ────────────────────────────────────────────────────────────────────────
  // Vector icon helpers — no emoji anywhere in the PDF. Core PDF fonts (and
  // even our embedded Noto Sans subset) don't reliably cover emoji glyphs,
  // which is why the old receipt showed garbled bytes like "Ø=Þ—" instead
  // of icons. Each icon is drawn as a small vector shape inside a colored
  // circular badge instead.
  // ────────────────────────────────────────────────────────────────────────

  _iconBadge(doc, { x, y, r = 3.5, bg = BRAND.blueDark, type }) {
    doc.setFillColor(...bg);
    doc.circle(x, y, r, 'F');
    const s = r * 0.62;
    doc.setDrawColor(...BRAND.white);
    doc.setFillColor(...BRAND.white);

    switch (type) {
      case 'car': {
        const w = s * 1.7, h = s * 0.7;
        doc.roundedRect(x - w / 2, y - h * 0.1, w, h * 0.55, h * 0.25, h * 0.25, 'F');
        doc.roundedRect(x - w * 0.3, y - h * 0.7, w * 0.6, h * 0.6, h * 0.2, h * 0.2, 'F');
        doc.circle(x - w * 0.28, y + h * 0.45, h * 0.28, 'F');
        doc.circle(x + w * 0.28, y + h * 0.45, h * 0.28, 'F');
        break;
      }
      case 'person': {
        doc.circle(x, y - s * 0.32, s * 0.36, 'F');
        doc.ellipse(x, y + s * 0.42, s * 0.5, s * 0.42, 'F');
        break;
      }
      case 'rupee': {
        doc.setFont('NotoSans', 'bold');
        doc.setFontSize(r * 1.9);
        doc.setTextColor(...BRAND.white);
        doc.text('\u20B9', x, y + s * 0.35, { align: 'center' });
        break;
      }
      case 'check': {
        doc.setDrawColor(...BRAND.white);
        doc.setLineWidth(Math.max(0.5, r * 0.24));
        doc.setLineCap('round');
        doc.setLineJoin('round');
        doc.lines(
          [
            [s * 0.42, s * 0.4],
            [s * 0.68, -s * 0.85],
          ],
          x - s * 0.5,
          y
        );
        break;
      }
      default:
        break;
    }
  }

  _sectionHeader(doc, { x, y, width, title, icon }) {
    doc.setFillColor(...BRAND.blueLight);
    doc.roundedRect(x, y, width, 9, 2, 2, 'F');
    this._iconBadge(doc, { x: x + 5.5, y: y + 4.5, r: 3.2, bg: BRAND.blueDark, type: icon });
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.blueDark);
    doc.text(title, x + 11, y + 6.2);
    return y + 9 + 4; // next yPos, with a little breathing room
  }

  _kvRows(doc, { x, y, width, rows, valueColor = BRAND.gray900, labelWidth = 46 }) {
    doc.setFontSize(9.5);
    rows.forEach(([label, value]) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BRAND.gray600);
      doc.text(label, x, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...valueColor);
      doc.text(String(value), x + labelWidth, y);
      y += 6.2;
    });
    return y;
  }

  _statusBadge(doc, { x, y, status }) {
    const meta = STATUS_BADGE[status] || STATUS_BADGE.pending;
    const label = meta.label;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const textWidth = doc.getTextWidth(label);
    const padX = 4;
    const w = textWidth + padX * 2;
    const h = 6.5;
    doc.setFillColor(...meta.bg);
    doc.roundedRect(x - w, y - h + 2, w, h, 3, 3, 'F');
    doc.setTextColor(...meta.color);
    doc.text(label, x - w / 2, y - 0.3, { align: 'center' });
  }

  /**
   * Generate PDF receipt — builds and returns the jsPDF document.
   * (downloadReceipt() saves it; previewReceipt() opens it in a new tab.)
   * @param {Object} booking - Booking data
   */
  buildReceiptDocument(booking) {
    const doc = new jsPDF();
    registerNotoSansFonts(doc); // enables real ₹ rendering (font: 'NotoSans')
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 18;
    const contentWidth = pageWidth - marginX * 2;
    let yPos = 0;

    // ============================================
    // TOP BRAND BAND
    // ============================================
    doc.setFillColor(...BRAND.blue);
    doc.rect(0, 0, pageWidth, 34, 'F');
    // subtle darker accent strip at the very top edge
    doc.setFillColor(...BRAND.blueDark);
    doc.rect(0, 0, pageWidth, 2.2, 'F');

    // Logo chip
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(marginX, 8, 10, 10, 2.5, 2.5, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.blue);
    doc.text('S', marginX + 5, 15.2, { align: 'center' });

    // Brand name + tagline
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('ShareMyRide', marginX + 14, 14);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(219, 234, 254); // blue-100
    doc.text('Your trusted ride-sharing partner', marginX + 14, 19.5);

    // "RIDE RECEIPT" tag, right-aligned
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('RIDE RECEIPT', pageWidth - marginX, 14, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(219, 234, 254);
    doc.text(
      `#${(booking._id || 'N/A').toString().slice(-10).toUpperCase()}`,
      pageWidth - marginX,
      19.5,
      { align: 'right' }
    );

    yPos = 34 + 10;

    // ============================================
    // RECEIPT META ROW (date · status badge)
    // ============================================
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.gray600);
    doc.text(
      `Issued ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      marginX,
      yPos
    );
    this._statusBadge(doc, { x: pageWidth - marginX, y: yPos + 1.2, status: booking.status });
    yPos += 8;

    doc.setDrawColor(...BRAND.border);
    doc.setLineWidth(0.4);
    doc.line(marginX, yPos, pageWidth - marginX, yPos);
    yPos += 8;

    // ============================================
    // RIDE DETAILS
    // ============================================
    yPos = this._sectionHeader(doc, { x: marginX, y: yPos, width: contentWidth, title: 'RIDE DETAILS', icon: 'car' });

    const rideDetails = [
      ['Ride date', this.formatDate(booking.ride?.date)],
      ['Ride time', booking.ride?.time || 'N/A'],
      ['Pickup location', booking.pickupLocation || 'N/A'],
      ['Drop location', booking.dropLocation || 'N/A'],
      ['Seats booked', booking.seatsBooked?.toString() || '1'],
    ];

    const isSegmentBooking = booking.matchType === 'on_route' && booking.userSearchDistance;
    if (isSegmentBooking) {
      rideDetails.push(
        ['Booking type', 'Segment ride'],
        ['Your distance', `${booking.userSearchDistance?.toFixed(1)} km`],
        ['Rate per km', `\u20B9${booking.perKmRate?.toFixed(2)}`]
      );
    }

    // Route line visual (pickup → drop), sits above the key/value rows
    doc.setDrawColor(...BRAND.blue);
    doc.setFillColor(...BRAND.blue);
    doc.circle(marginX + 2, yPos - 1.3, 1.1, 'F');
    doc.setFillColor(...BRAND.green);
    doc.circle(marginX + 2, yPos + 5.7, 1.1, 'F');
    doc.setDrawColor(...BRAND.border);
    doc.setLineDashPattern([0.8, 0.8], 0);
    doc.line(marginX + 2, yPos - 0.2, marginX + 2, yPos + 4.6);
    doc.setLineDashPattern([], 0);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.gray900);
    doc.text(booking.pickupLocation || 'N/A', marginX + 6, yPos);
    doc.text(booking.dropLocation || 'N/A', marginX + 6, yPos + 7);
    yPos += 14;

    yPos = this._kvRows(doc, {
      x: marginX,
      y: yPos,
      width: contentWidth,
      rows: rideDetails.filter(([label]) => !['Pickup location', 'Drop location'].includes(label)),
    });
    yPos += 4;

    // ============================================
    // CONTACT INFORMATION
    // ============================================
    yPos = this._sectionHeader(doc, { x: marginX, y: yPos, width: contentWidth, title: 'CONTACT INFORMATION', icon: 'person' });

    const isPassenger = booking.passenger?._id || booking.passenger;
    const contactPerson = isPassenger ? 'Driver' : 'Passenger';
    const contactData = isPassenger
      ? booking.ride?.driverId || booking.driver
      : booking.passenger;

    const contactDetails = [
      [`${contactPerson} name`, contactData?.name || 'N/A'],
      ['Phone number', contactData?.phone || booking.ride?.phoneNumber || 'N/A'],
    ];
    if (isPassenger && booking.ride?.vehicleNumber) {
      contactDetails.push(['Vehicle number', booking.ride.vehicleNumber]);
    }
    if (!isPassenger && contactData?.email) {
      contactDetails.push(['Email', contactData.email]);
    }

    yPos = this._kvRows(doc, { x: marginX, y: yPos, width: contentWidth, rows: contactDetails });
    yPos += 4;

    // ============================================
    // FARE BREAKDOWN (autoTable — clean bordered table)
    // ============================================
    yPos = this._sectionHeader(doc, { x: marginX, y: yPos, width: contentWidth, title: 'FARE BREAKDOWN', icon: 'rupee' });

    const baseFare = booking.baseFare || 0;
    const serviceFee = booking.passengerServiceFee || booking.platformFee || 0;
    const gst = booking.passengerServiceFeeGST || booking.gst || 0;
    const totalFare = booking.totalFare || (baseFare + serviceFee + gst);

    const fareRows = isPassenger
      ? [
          ['Base fare', `\u20B9${baseFare.toFixed(2)}`],
          ['Platform fee (3%)', `\u20B9${serviceFee.toFixed(2)}`],
          ['GST (5% on fare + fee)', `\u20B9${gst.toFixed(2)}`],
        ]
      : [
          ['Base fare', `\u20B9${baseFare.toFixed(2)}`],
          ['Platform fee', 'No driver deduction'],
          ['GST', 'Passenger-side only'],
        ];

    autoTable(doc, {
      startY: yPos,
      margin: { left: marginX, right: marginX },
      head: [],
      body: fareRows,
      theme: 'plain',
      styles: {
        font: 'NotoSans',
        fontSize: 9.5,
        cellPadding: { top: 2, bottom: 2, left: 0, right: 0 },
        textColor: BRAND.gray600,
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.6 },
        1: { cellWidth: contentWidth * 0.4, halign: 'right', fontStyle: 'bold', textColor: BRAND.gray900 },
      },
      didDrawPage: () => {},
    });

    yPos = doc.lastAutoTable.finalY + 3;

    // Total row — highlighted block
    const totalLabel = isPassenger ? 'TOTAL PAID' : 'NET EARNINGS';
    const totalValue = isPassenger ? totalFare : baseFare;

    doc.setFillColor(...BRAND.blueLight);
    doc.roundedRect(marginX, yPos, contentWidth, 11, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.blueDark);
    doc.text(totalLabel, marginX + 4, yPos + 7.3);
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(13);
    doc.text(`\u20B9${totalValue.toFixed(2)}`, pageWidth - marginX - 4, yPos + 7.3, { align: 'right' });
    yPos += 11 + 8;

    // ============================================
    // PAYMENT STATUS BANNER
    // ============================================
    doc.setFillColor(...BRAND.greenLight);
    doc.roundedRect(marginX, yPos, contentWidth, 12, 2.5, 2.5, 'F');
    this._iconBadge(doc, { x: marginX + 9, y: yPos + 6, r: 3.6, bg: BRAND.green, type: 'check' });
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.green);
    doc.text('PAYMENT COMPLETED', pageWidth / 2 + 3, yPos + 7.5, { align: 'center' });
    yPos += 12 + 6;

    if (booking.paymentDate || booking.paymentCompletedAt) {
      const paymentDate = new Date(booking.paymentDate || booking.paymentCompletedAt);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BRAND.gray400);
      doc.text(
        `Paid on ${paymentDate.toLocaleDateString('en-IN')} at ${paymentDate.toLocaleTimeString('en-IN')}`,
        pageWidth / 2,
        yPos,
        { align: 'center' }
      );
      yPos += 8;
    }

    // ============================================
    // FOOTER — placed directly below the actual content, only pushed to a
    // new page if it genuinely doesn't fit (mirrors the backend generator).
    // ============================================
    let footerY = yPos + 10;
    if (footerY + 20 > pageHeight - 6) {
      doc.addPage();
      footerY = 20;
    }

    doc.setDrawColor(...BRAND.border);
    doc.setLineWidth(0.4);
    doc.line(marginX, footerY, pageWidth - marginX, footerY);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.gray600);
    doc.text('Thank you for choosing ShareMyRide!', pageWidth / 2, footerY + 6, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.gray400);
    doc.text('For support, contact us at support@sharemyride.com', pageWidth / 2, footerY + 11, { align: 'center' });
    doc.text(
      'This is a computer-generated receipt and does not require a signature.',
      pageWidth / 2,
      footerY + 15.5,
      { align: 'center' }
    );

    return doc;
  }

  /**
   * Generate PDF receipt and save to disk.
   * Kept for backward compatibility with any existing callers.
   * @param {Object} booking - Booking data
   */
  async generatePDFReceipt(booking) {
    const doc = this.buildReceiptDocument(booking);
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

      // Build the PDF once and open the exact same document in a new tab
      const doc = this.buildReceiptDocument(booking);
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