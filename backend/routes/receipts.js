const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');  // ✅ Changed from 'auth'
const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');
const { generateReceipt } = require('../services/pdfReceiptService');

/**
 * @route   GET /api/receipts/download/:bookingId
 * @desc    Generate and download PDF receipt
 * @access  Private
 */
router.get('/download/:bookingId', protect, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    console.log('=== GENERATE RECEIPT ===');
    console.log('Booking ID:', bookingId);
    console.log('User ID:', userId);

    // Get booking with all details
    const booking = await Booking.findById(bookingId)
      .populate('passengerId')
      .populate({
        path: 'rideId',
        populate: { path: 'driverId' }
      });

    if (!booking) {
      console.log('❌ Booking not found');
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }

    console.log('✅ Booking found');

    // Check authorization
    const isPassenger = booking.passengerId._id.toString() === userId.toString();
    const isDriver = booking.rideId.driverId._id.toString() === userId.toString();

    if (!isPassenger && !isDriver) {
      console.log('❌ Unauthorized access');
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized to download this receipt' 
      });
    }

    console.log('✅ Authorization passed');

    // Get transaction
    const transaction = await Transaction.findOne({ 
      bookingId, 
      paymentStatus: 'captured' 
    });

    if (!transaction) {
      console.log('❌ Transaction not found');
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found or payment not completed' 
      });
    }

    console.log('✅ Transaction found:', transaction._id);
    console.log('📄 Generating PDF...');

    // Generate PDF
    const { filepath } = await generateReceipt(
      transaction, 
      booking, 
      booking.passengerId, 
      booking.rideId.driverId
    );

    console.log('✅ PDF generated:', filepath);

    // Send file
    res.download(filepath, `RideShare_Receipt_${booking._id}.pdf`, (err) => {
      if (err) {
        console.error('❌ Error sending file:', err);
      } else {
        console.log('✅ File sent successfully');
      }
      
      // Delete file after sending
      const fs = require('fs');
      fs.unlink(filepath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('❌ Error deleting file:', unlinkErr);
        } else {
          console.log('✅ Temporary file deleted');
        }
      });
    });

    console.log('=== RECEIPT DOWNLOAD SUCCESS ===');

  } catch (error) {
    console.error('=== RECEIPT ERROR ===');
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate receipt',
      error: error.message 
    });
  }
});

module.exports = router;