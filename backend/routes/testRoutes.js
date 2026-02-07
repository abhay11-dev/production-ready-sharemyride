// routes/testRoutes.js (create this file)
const express = require('express');
const router = express.Router();
const { sendBookingConfirmationEmails } = require('../services/emailService');

router.post('/test-email', async (req, res) => {
  try {
    // Mock data for testing
    const mockBooking = {
      _id: 'TEST123456789',
      pickupLocation: 'Indore Railway Station',
      dropLocation: 'Vijay Nagar Square',
      seatsBooked: 2,
      baseFare: 500,
      finalAmount: 562.80,
      totalFare: 562.80,
      razorpayPaymentId: 'pay_test_123456',
      paymentCompletedAt: new Date(),
      createdAt: new Date(),
    };

    const mockRide = {
      date: new Date('2025-11-25'),
      time: '10:00 AM',
      vehicleModel: 'Honda City',
      vehicleNumber: 'MP09AB1234',
    };

    const mockDriver = {
      name: 'Rajesh Kumar',
      email: 'your-test-email@example.com', // Change this to your test email
      phone: '+919876543210',
    };

    const mockPassenger = {
      name: 'Amit Sharma',
      email: 'your-test-email@example.com', // Change this to your test email
      phone: '+919123456789',
    };

    const result = await sendBookingConfirmationEmails(
      mockBooking,
      mockRide,
      mockDriver,
      mockPassenger
    );

    res.json({ 
      success: true, 
      message: 'Test emails sent successfully!',
      passengerEmailId: result.passengerEmailId,
      driverEmailId: result.driverEmailId
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.stack
    });
  }
});

module.exports = router;