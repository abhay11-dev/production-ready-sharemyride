const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate PDF receipt for booking
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

      // Header
      doc.fontSize(28).fillColor('#3B82F6').text('🚗 RideShare', 50, 50);
      doc.fontSize(10).fillColor('#6B7280').text('Your trusted ridesharing partner', 50, 85);
      doc.fontSize(20).fillColor('#111827').text('PAYMENT RECEIPT', 50, 120);
      doc.fontSize(12).fillColor('#10B981').text('✓ PAYMENT SUCCESSFUL', 450, 125, { align: 'right' });
      doc.moveTo(50, 160).lineTo(545, 160).strokeColor('#E5E7EB').stroke();

      // Transaction Details
      let yPos = 180;
      doc.fontSize(14).fillColor('#111827').text('Transaction Details', 50, yPos);
      yPos += 25;
      doc.fontSize(10).fillColor('#6B7280');
      
      doc.text('Transaction ID:', 50, yPos).fillColor('#111827').text(transaction._id.toString(), 200, yPos);
      yPos += 20;
      doc.fillColor('#6B7280').text('Payment ID:', 50, yPos).fillColor('#111827').text(transaction.razorpayPaymentId || 'N/A', 200, yPos);
      yPos += 20;
      doc.fillColor('#6B7280').text('Payment Date:', 50, yPos).fillColor('#111827').text(new Date(transaction.paymentCapturedAt).toLocaleString(), 200, yPos);
      yPos += 20;
      doc.fillColor('#6B7280').text('Payment Method:', 50, yPos).fillColor('#111827').text(transaction.paymentMethod?.toUpperCase() || 'N/A', 200, yPos);
      yPos += 30;

      // Ride Details
      doc.fontSize(14).fillColor('#111827').text('Ride Details', 50, yPos);
      yPos += 25;
      doc.fontSize(10).fillColor('#6B7280');
      
      doc.text('Date:', 50, yPos).fillColor('#111827').text(new Date(booking.rideId.date).toLocaleDateString(), 200, yPos);
      yPos += 20;
      doc.fillColor('#6B7280').text('Time:', 50, yPos).fillColor('#111827').text(booking.rideId.time, 200, yPos);
      yPos += 20;
      doc.fillColor('#6B7280').text('From:', 50, yPos).fillColor('#111827').text(booking.pickupLocation, 200, yPos, { width: 300 });
      yPos += 20;
      doc.fillColor('#6B7280').text('To:', 50, yPos).fillColor('#111827').text(booking.dropLocation, 200, yPos, { width: 300 });
      yPos += 20;
      doc.fillColor('#6B7280').text('Seats:', 50, yPos).fillColor('#111827').text(booking.seatsBooked.toString(), 200, yPos);
      yPos += 30;

      // Passenger Details
      doc.fontSize(14).fillColor('#111827').text('Passenger Information', 50, yPos);
      yPos += 25;
      doc.fontSize(10).fillColor('#6B7280');
      
      doc.text('Name:', 50, yPos).fillColor('#111827').text(passenger.name, 200, yPos);
      yPos += 20;
      doc.fillColor('#6B7280').text('Email:', 50, yPos).fillColor('#111827').text(passenger.email, 200, yPos);
      yPos += 20;
      doc.fillColor('#6B7280').text('Phone:', 50, yPos).fillColor('#111827').text(passenger.phone || 'Not provided', 200, yPos);
      yPos += 30;

      // Driver Details
      doc.fontSize(14).fillColor('#111827').text('Driver Information', 50, yPos);
      yPos += 25;
      doc.fontSize(10).fillColor('#6B7280');
      
      doc.text('Name:', 50, yPos).fillColor('#111827').text(driver.name, 200, yPos);
      yPos += 20;
      doc.fillColor('#6B7280').text('Phone:', 50, yPos).fillColor('#111827').text(driver.phone || booking.rideId.phoneNumber, 200, yPos);
      yPos += 20;
      doc.fillColor('#6B7280').text('Vehicle:', 50, yPos).fillColor('#111827').text(booking.rideId.vehicleNumber, 200, yPos);
      yPos += 40;

      // Payment Breakdown
      doc.rect(50, yPos, 495, 180).fillAndStroke('#F3F4F6', '#E5E7EB');
      yPos += 15;
      doc.fontSize(14).fillColor('#111827').text('Payment Breakdown', 60, yPos);
      yPos += 30;
      doc.fontSize(10);
      
      doc.fillColor('#6B7280').text('Base Fare:', 60, yPos).fillColor('#111827').text(`₹${booking.baseFare.toFixed(2)}`, 480, yPos, { align: 'right' });
      yPos += 20;
      doc.fillColor('#6B7280').text('Platform Fee:', 60, yPos).fillColor('#111827').text(`₹${booking.platformFee.toFixed(2)}`, 480, yPos, { align: 'right' });
      yPos += 20;
      doc.fillColor('#6B7280').text('GST (18%):', 60, yPos).fillColor('#111827').text(`₹${booking.gst.toFixed(2)}`, 480, yPos, { align: 'right' });
      yPos += 25;
      
      doc.moveTo(60, yPos).lineTo(535, yPos).strokeColor('#D1D5DB').stroke();
      yPos += 15;
      
      doc.fontSize(14).fillColor('#111827').text('Total Amount Paid:', 60, yPos);
      doc.fontSize(16).fillColor('#10B981').text(`₹${booking.totalFare.toFixed(2)}`, 480, yPos, { align: 'right' });
      yPos += 40;
      
      doc.fontSize(9).fillColor('#6B7280').text(`Platform Commission (10%): ₹${transaction.baseCommissionAmount.toFixed(2)}`, 60, yPos);
      yPos += 15;
      doc.text(`GST on Commission: ₹${transaction.gstAmount.toFixed(2)}`, 60, yPos);
      yPos += 15;
      doc.fillColor('#10B981').text(`Driver Receives: ₹${transaction.driverNetAmount.toFixed(2)}`, 60, yPos);

      // Footer
      doc.fontSize(8).fillColor('#9CA3AF').text('Thank you for using RideShare!', 50, 750, { align: 'center', width: 495 });
      doc.text('For support, contact: support@rideshare.com', 50, 765, { align: 'center', width: 495 });
      doc.text('This is a computer-generated receipt. No signature required.', 50, 780, { align: 'center', width: 495 });

      doc.end();

      stream.on('finish', () => resolve({ filepath, filename }));
      stream.on('error', (error) => reject(error));

    } catch (error) {
      reject(error);
    }
  });
};

module.exports = exports;