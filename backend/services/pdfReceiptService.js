const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate PDF receipt for booking with enhanced UI and proper spacing
 */
exports.generateReceipt = async (transaction, booking, passenger, driver) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margins: { top: 50, bottom: 50, left: 50, right: 50 } 
      });

      const receiptsDir = path.join(__dirname, '../receipts');
      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
      }

      const filename = `receipt_${transaction._id}.pdf`;
      const filepath = path.join(receiptsDir, filename);
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Constants
      const pageWidth = 495;
      const leftMargin = 50;
      const rightMargin = 545;
      const primaryColor = '#3B82F6';
      const successColor = '#10B981';
      const darkGray = '#111827';
      const mediumGray = '#6B7280';
      const lightGray = '#F9FAFB';

      // ============================================
      // HEADER SECTION
      // ============================================
      doc.rect(50, 50, pageWidth, 90).fill('#EFF6FF');
      
      // Company Logo and Name
      doc.fontSize(36).fillColor(primaryColor).font('Helvetica-Bold')
         .text('🚗 RideShare', leftMargin + 15, 65);
      
      doc.fontSize(10).fillColor(mediumGray).font('Helvetica')
         .text('Your Trusted Ridesharing Partner', leftMargin + 15, 105);
      
      // Receipt Badge
      doc.rect(450, 65, 75, 28).fillAndStroke(successColor, successColor);
      doc.fontSize(11).fillColor('#FFFFFF').font('Helvetica-Bold')
         .text('✓ PAID', 450, 73, { width: 75, align: 'center' });
      
      // Receipt Title
      doc.fontSize(22).fillColor(darkGray).font('Helvetica-Bold')
         .text('PAYMENT RECEIPT', leftMargin + 15, 160);
      
      // Receipt Number
      doc.fontSize(9).fillColor(mediumGray).font('Helvetica')
         .text(`Receipt #${transaction._id.toString().slice(-8).toUpperCase()}`, leftMargin + 15, 185);

      // Decorative line
      doc.moveTo(50, 210).lineTo(545, 210).lineWidth(2).strokeColor(primaryColor).stroke();

      // ============================================
      // TRANSACTION INFORMATION
      // ============================================
      let yPos = 235;
      
      // Section header
      doc.rect(50, yPos, pageWidth, 22).fill(lightGray);
      doc.fontSize(12).fillColor(darkGray).font('Helvetica-Bold')
         .text('📋  TRANSACTION DETAILS', leftMargin + 10, yPos + 6);
      
      yPos += 35;
      
      // Transaction details with proper spacing
      const drawInfoRow = (label, value, yPosition) => {
        doc.fontSize(9).fillColor(mediumGray).font('Helvetica')
           .text(label, leftMargin + 10, yPosition, { width: 150 });
        doc.fontSize(9).fillColor(darkGray).font('Helvetica-Bold')
           .text(value, 220, yPosition, { width: 315, align: 'left' });
      };

      drawInfoRow('Transaction ID:', transaction._id.toString(), yPos);
      yPos += 18;
      
      drawInfoRow('Payment ID:', transaction.razorpayPaymentId || 'N/A', yPos);
      yPos += 18;
      
      drawInfoRow('Payment Date:', new Date(transaction.paymentCapturedAt).toLocaleString('en-IN', { 
        dateStyle: 'long', 
        timeStyle: 'short' 
      }), yPos);
      yPos += 18;
      
      drawInfoRow('Payment Method:', (transaction.paymentMethod?.toUpperCase() || 'ONLINE'), yPos);
      yPos += 25;

      // ============================================
      // RIDE INFORMATION
      // ============================================
      doc.rect(50, yPos, pageWidth, 22).fill(lightGray);
      doc.fontSize(12).fillColor(darkGray).font('Helvetica-Bold')
         .text('🚙  RIDE INFORMATION', leftMargin + 10, yPos + 6);
      
      yPos += 35;

      drawInfoRow('Journey Date:', new Date(booking.rideId.date).toLocaleDateString('en-IN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }), yPos);
      yPos += 18;
      
      drawInfoRow('Departure Time:', booking.rideId.time, yPos);
      yPos += 25;

      // Route box with proper spacing
      doc.rect(55, yPos, 485, 65).fillAndStroke('#ECFDF5', '#D1FAE5');
      
      doc.fontSize(8).fillColor(mediumGray).font('Helvetica')
         .text('FROM', 70, yPos + 10);
      doc.fontSize(10).fillColor('#059669').font('Helvetica-Bold')
         .text('📍  ' + booking.pickupLocation, 70, yPos + 22, { width: 455 });
      
      doc.fontSize(14).fillColor(mediumGray).text('↓', 70, yPos + 35);
      
      doc.fontSize(8).fillColor(mediumGray).font('Helvetica')
         .text('TO', 70, yPos + 43);
      doc.fontSize(10).fillColor('#DC2626').font('Helvetica-Bold')
         .text('📍  ' + booking.dropLocation, 70, yPos + 55, { width: 455 });
      
      yPos += 78;

      drawInfoRow('Seats Booked:', booking.seatsBooked.toString() + ' Seat(s)', yPos);
      yPos += 25;

      // ============================================
      // PASSENGER & DRIVER INFO
      // ============================================
      const boxWidth = (pageWidth - 15) / 2;
      
      // Passenger box
      doc.rect(50, yPos, boxWidth, 95).fillAndStroke('#FEF3C7', '#FDE68A');
      doc.fontSize(11).fillColor('#92400E').font('Helvetica-Bold')
         .text('👤  PASSENGER', 65, yPos + 12);
      
      doc.fontSize(8).fillColor(mediumGray).font('Helvetica')
         .text('Name:', 65, yPos + 32);
      doc.fontSize(9).fillColor(darkGray).font('Helvetica-Bold')
         .text(passenger.name, 65, yPos + 43, { width: boxWidth - 30 });
      
      doc.fontSize(8).fillColor(mediumGray).font('Helvetica')
         .text('Email:', 65, yPos + 57);
      doc.fontSize(8).fillColor(darkGray).font('Helvetica-Bold')
         .text(passenger.email, 65, yPos + 68, { width: boxWidth - 30 });

      // Driver box
      const driverX = 50 + boxWidth + 15;
      doc.rect(driverX, yPos, boxWidth, 95).fillAndStroke('#DBEAFE', '#BFDBFE');
      doc.fontSize(11).fillColor('#1E40AF').font('Helvetica-Bold')
         .text('👨‍✈️  DRIVER', driverX + 15, yPos + 12);
      
      doc.fontSize(8).fillColor(mediumGray).font('Helvetica')
         .text('Name:', driverX + 15, yPos + 32);
      doc.fontSize(9).fillColor(darkGray).font('Helvetica-Bold')
         .text(driver.name, driverX + 15, yPos + 43, { width: boxWidth - 30 });
      
      doc.fontSize(8).fillColor(mediumGray).font('Helvetica')
         .text('Vehicle:', driverX + 15, yPos + 57);
      doc.fontSize(9).fillColor(darkGray).font('Helvetica-Bold')
         .text(booking.rideId.vehicleNumber, driverX + 15, yPos + 68, { width: boxWidth - 30 });

      yPos += 110;

      // ============================================
      // PAYMENT BREAKDOWN
      // ============================================
      doc.rect(50, yPos, pageWidth, 22).fill('#F0FDF4');
      doc.fontSize(12).fillColor(successColor).font('Helvetica-Bold')
         .text('💰  PAYMENT BREAKDOWN', leftMargin + 10, yPos + 6);
      
      yPos += 35;

      // Breakdown box
      doc.rect(50, yPos, pageWidth, 130).fillAndStroke(lightGray, '#E5E7EB');
      yPos += 15;

      // Line items with proper alignment
      const drawPaymentRow = (label, amount, yPosition) => {
        doc.fontSize(10).fillColor(mediumGray).font('Helvetica')
           .text(label, leftMargin + 10, yPosition);
        doc.fontSize(10).fillColor(darkGray).font('Helvetica-Bold')
           .text(`₹${amount.toFixed(2)}`, 440, yPosition, { width: 95, align: 'right' });
      };

      drawPaymentRow('Base Fare', booking.baseFare, yPos);
      yPos += 20;
      
      drawPaymentRow('Platform Service Fee', booking.platformFee, yPos);
      yPos += 20;
      
      drawPaymentRow('GST (18% on Service Fee)', booking.gst, yPos);
      yPos += 25;

      // Divider
      doc.moveTo(60, yPos).lineTo(535, yPos).lineWidth(1).strokeColor('#E5E7EB').stroke();
      yPos += 15;

      // Total amount
      doc.rect(55, yPos - 5, 485, 30).fill('#ECFDF5');
      doc.fontSize(12).fillColor(darkGray).font('Helvetica-Bold')
         .text('TOTAL AMOUNT PAID', leftMargin + 15, yPos + 3);
      doc.fontSize(16).fillColor(successColor).font('Helvetica-Bold')
         .text(`₹${booking.totalFare.toFixed(2)}`, 440, yPos + 2, { width: 95, align: 'right' });

      yPos += 40;

      // Commission note
      doc.fontSize(7).fillColor(mediumGray).font('Helvetica')
         .text(`Platform Commission (10%): ₹${transaction.baseCommissionAmount.toFixed(2)}  |  GST: ₹${transaction.gstAmount.toFixed(2)}`, 
               leftMargin + 10, yPos, { width: 480 });
      
      yPos += 12;
      doc.fontSize(8).fillColor(successColor).font('Helvetica-Bold')
         .text(`💵  Driver Net Earnings: ₹${transaction.driverNetAmount.toFixed(2)}`, leftMargin + 10, yPos);

      // ============================================
      // FOOTER
      // ============================================
      const footerY = 750;
      
      doc.rect(50, footerY, pageWidth, 42).fill('#F9FAFB');
      
      doc.fontSize(10).fillColor(primaryColor).font('Helvetica-Bold')
         .text('Thank You for Choosing RideShare! 🙏', 50, footerY + 8, { width: pageWidth, align: 'center' });
      
      doc.fontSize(7).fillColor(mediumGray).font('Helvetica')
         .text('For support: support@rideshare.com  |  +91-1800-123-4567', 50, footerY + 24, { width: pageWidth, align: 'center' })
         .text('This is a computer-generated receipt. No signature required.', 50, footerY + 34, { width: pageWidth, align: 'center' });

      // Border
      doc.rect(45, 45, 505, 752).stroke('#E5E7EB');

      doc.end();

      stream.on('finish', () => resolve({ filepath, filename }));
      stream.on('error', (error) => reject(error));

    } catch (error) {
      reject(error);
    }
  });
};

module.exports = exports;