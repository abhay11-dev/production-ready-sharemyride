const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Send payment receipt to passenger
 */
exports.sendPaymentReceipt = async (transaction, booking, passenger, driver) => {
  const baseFare = booking.baseFare || 0;
  const passengerServiceFee = 10;
  const gstOnServiceFee = passengerServiceFee * 0.18;
  const totalPaid = baseFare + passengerServiceFee + gstOnServiceFee;

  const mailOptions = {
    from: `"RideShare" <${process.env.EMAIL_USER}>`,
    to: passenger.email,
    subject: '✅ Payment Successful - Your Ride is Confirmed | RideShare',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.6; 
            color: #1f2937; 
            background: #f3f4f6;
            padding: 20px;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
          }
          .header h1 { 
            font-size: 28px; 
            margin-bottom: 8px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          .header p { 
            font-size: 16px; 
            opacity: 0.95;
          }
          .content { 
            padding: 35px 30px; 
          }
          .greeting { 
            font-size: 20px; 
            font-weight: 600; 
            margin-bottom: 18px;
            color: #111827;
          }
          .intro-text { 
            color: #4b5563; 
            margin-bottom: 28px;
            font-size: 15px;
            line-height: 1.7;
          }
          .section { 
            background: #f9fafb; 
            padding: 24px; 
            border-radius: 12px; 
            margin: 24px 0; 
            border: 1px solid #e5e7eb;
          }
          .section-title { 
            font-size: 16px; 
            font-weight: 700; 
            margin-bottom: 20px;
            color: #111827;
            display: flex;
            align-items: center;
            gap: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-row { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start;
            padding: 14px 0; 
            border-bottom: 1px solid #e5e7eb;
            gap: 16px;
          }
          .info-row:last-child { 
            border-bottom: none; 
            padding-bottom: 0;
          }
          .info-row:first-child {
            padding-top: 0;
          }
          .info-label { 
            color: #6b7280; 
            font-weight: 500;
            font-size: 14px;
            min-width: 140px;
            flex-shrink: 0;
          }
          .info-value { 
            color: #111827; 
            font-weight: 600;
            text-align: right;
            font-size: 14px;
            word-break: break-word;
          }
          .total-section { 
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); 
            padding: 24px; 
            border-radius: 12px; 
            margin-top: 20px;
            border: 2px solid #3B82F6;
          }
          .total-row { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
          }
          .total-label { 
            font-size: 18px; 
            font-weight: 700;
            color: #1e40af;
            letter-spacing: 0.3px;
          }
          .total-amount { 
            font-size: 32px; 
            font-weight: 800;
            color: #3B82F6;
            letter-spacing: -0.5px;
          }
          .highlight-box { 
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); 
            padding: 20px; 
            border-radius: 10px; 
            margin: 24px 0;
            border-left: 4px solid #f59e0b;
          }
          .highlight-box strong { 
            color: #92400e;
            font-size: 15px;
            font-weight: 700;
          }
          .highlight-box ul { 
            margin: 12px 0 0 0; 
            padding-left: 20px;
            color: #78350f;
            font-size: 14px;
          }
          .highlight-box li { 
            margin: 8px 0;
            line-height: 1.6;
          }
          .info-card { 
            background: white; 
            padding: 18px; 
            border-radius: 10px; 
            margin: 18px 0;
            border: 1px solid #e5e7eb;
            font-size: 13px;
            line-height: 1.7;
          }
          .cta-button { 
            display: inline-block; 
            background: linear-gradient(135deg, #3B82F6 0%, #2563eb 100%); 
            color: white; 
            padding: 16px 36px; 
            text-decoration: none; 
            border-radius: 10px; 
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 28px 0;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            transition: all 0.3s ease;
          }
          .success-badge { 
            background: #d1fae5; 
            color: #065f46; 
            padding: 14px 20px; 
            border-radius: 10px; 
            text-align: center;
            font-weight: 600;
            border: 2px solid #10b981;
            margin: 24px 0;
            font-size: 14px;
          }
          .footer { 
            background: #f9fafb; 
            padding: 35px 30px; 
            text-align: center; 
            color: #6b7280; 
            font-size: 13px;
            border-top: 1px solid #e5e7eb;
          }
          .footer-links { 
            margin: 16px 0;
          }
          .footer-links a { 
            color: #3B82F6; 
            text-decoration: none;
            margin: 0 12px;
            font-weight: 600;
          }
          .divider { 
            height: 1px; 
            background: #e5e7eb; 
            margin: 28px 0;
          }
          .monospace { 
            font-family: 'Courier New', monospace; 
            font-size: 13px;
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
          }
          .uppercase { text-transform: uppercase; }
          
          @media only screen and (max-width: 600px) {
            body { padding: 10px; }
            .container { border-radius: 12px; }
            .header { padding: 30px 20px; }
            .header h1 { font-size: 24px; }
            .content { padding: 25px 20px; }
            .greeting { font-size: 18px; }
            .section { padding: 18px; }
            .info-row { 
              flex-direction: column; 
              gap: 6px;
              padding: 12px 0;
            }
            .info-label { min-width: auto; }
            .info-value { text-align: left; }
            .total-label { font-size: 16px; }
            .total-amount { font-size: 28px; }
            .cta-button { padding: 14px 28px; font-size: 15px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Payment Successful!</h1>
            <p>Your ride is confirmed and ready to go</p>
          </div>
          
          <div class="content">
            <div class="greeting">Hi ${passenger.name},</div>
            <p class="intro-text">
              Great news! Your payment has been successfully processed and your ride is now <strong>confirmed</strong>. 
              We've sent all the details you need for your upcoming journey.
            </p>
            
            <div class="success-badge">
              ✓ Booking Confirmed • Payment Completed • Driver Notified
            </div>

            <div class="section">
              <div class="section-title">🚗 Your Ride Details</div>
              <div class="info-row">
                <span class="info-label">Pickup Location</span>
                <span class="info-value">${booking.pickupLocation}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Drop Location</span>
                <span class="info-value">${booking.dropLocation}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Journey Date</span>
                <span class="info-value">${new Date(booking.rideId.date).toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Departure Time</span>
                <span class="info-value">${booking.rideId.time}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Seats Booked</span>
                <span class="info-value">${booking.seatsBooked} Seat(s)</span>
              </div>
              <div class="info-row">
                <span class="info-label">Booking ID</span>
                <span class="info-value monospace">#${booking._id.toString().slice(-8).toUpperCase()}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">💰 Payment Breakdown</div>
              <div class="info-row">
                <span class="info-label">Base Fare</span>
                <span class="info-value">₹${baseFare.toFixed(2)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Service Fee</span>
                <span class="info-value">₹${passengerServiceFee.toFixed(2)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">GST (18%)</span>
                <span class="info-value">₹${gstOnServiceFee.toFixed(2)}</span>
              </div>
              
              <div class="total-section">
                <div class="total-row">
                  <span class="total-label">Total Paid</span>
                  <span class="total-amount">₹${totalPaid.toFixed(2)}</span>
                </div>
              </div>

              <div class="info-card" style="background: #f0f9ff; border-color: #bfdbfe;">
                <strong style="color: #075985; display: block; margin-bottom: 8px;">💡 Payment Distribution:</strong>
                <div style="color: #075985;">
                  • <strong>₹${baseFare.toFixed(2)}</strong> goes directly to your driver<br>
                  • <strong>₹${passengerServiceFee.toFixed(2)}</strong> covers platform services<br>
                  • <strong>₹${gstOnServiceFee.toFixed(2)}</strong> is remitted as GST
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">👤 Your Driver</div>
              <div class="info-row">
                <span class="info-label">Driver Name</span>
                <span class="info-value">${driver.name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Contact Number</span>
                <span class="info-value">${booking.rideId.phoneNumber || driver.phone || 'Will be shared'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Vehicle Number</span>
                <span class="info-value uppercase">${booking.rideId.vehicleNumber}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Pickup Address</span>
                <span class="info-value">${booking.rideId.address || 'Will be confirmed'}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">📄 Transaction Details</div>
              <div class="info-row">
                <span class="info-label">Transaction ID</span>
                <span class="info-value monospace">${transaction._id}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Payment ID</span>
                <span class="info-value monospace">${transaction.razorpayPaymentId}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Payment Time</span>
                <span class="info-value">${new Date(transaction.paymentCapturedAt).toLocaleString('en-US', { 
                  dateStyle: 'medium', 
                  timeStyle: 'short' 
                })}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Payment Method</span>
                <span class="info-value uppercase">${transaction.paymentMethod}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status</span>
                <span class="info-value" style="color: #10b981;">✓ Completed</span>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/bookings/my-bookings" class="cta-button">
                View My Bookings
              </a>
            </div>

            <div class="highlight-box">
              <strong>📌 Important Reminders:</strong>
              <ul>
                <li>Be ready at pickup location <strong>10 minutes early</strong></li>
                <li>Driver will contact you if needed</li>
                <li>Save your booking ID: <strong>#${booking._id.toString().slice(-8).toUpperCase()}</strong></li>
                <li>Carry valid ID proof for verification</li>
                <li>For emergencies, contact support immediately</li>
              </ul>
            </div>

            <div class="divider"></div>

            <div style="text-align: center; color: #6b7280; font-size: 14px;">
              <p style="margin-bottom: 10px; font-weight: 600;">Need Help? We're Here for You!</p>
              <p>
                <a href="mailto:support@rideshare.com" style="color: #3B82F6; text-decoration: none; font-weight: 600;">
                  support@rideshare.com
                </a>
                <span style="margin: 0 10px;">•</span>
                <a href="tel:+911234567890" style="color: #3B82F6; text-decoration: none; font-weight: 600;">
                  +91 123-456-7890
                </a>
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p style="font-weight: 700; margin-bottom: 10px; font-size: 15px;">Have a Safe Journey! 🚗</p>
            <p style="margin-bottom: 20px;">Thank you for choosing RideShare</p>
            
         
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #9ca3af;">
                This is an automated email. Please do not reply.<br>
                © 2025 RideShare. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Receipt email sent successfully to:', passenger.email);
    return { success: true, message: 'Receipt email sent' };
  } catch (error) {
    console.error('❌ Error sending receipt email:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send payment notification to driver
 */
exports.sendDriverPaymentNotification = async (transaction, booking, passenger, driver) => {
  const baseFare = booking.baseFare || 0;
  const platformFee = baseFare * 0.08;
  const gstOnPlatformFee = platformFee * 0.18;
  const driverNetEarnings = baseFare - platformFee - gstOnPlatformFee;

  const passengerServiceFee = 10;
  const gstOnServiceFee = passengerServiceFee * 0.18;
  const totalPassengerPaid = baseFare + passengerServiceFee + gstOnServiceFee;

  const mailOptions = {
    from: `"RideShare" <${process.env.EMAIL_USER}>`,
    to: driver.email,
    subject: '💰 Payment Received - Passenger Confirmed | RideShare',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.6; 
            color: #1f2937; 
            background: #f3f4f6;
            padding: 20px;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #10B981 0%, #059669 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
          }
          .header h1 { 
            font-size: 28px; 
            margin-bottom: 8px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          .header p { 
            font-size: 16px; 
            opacity: 0.95;
          }
          .content { 
            padding: 35px 30px; 
          }
          .greeting { 
            font-size: 20px; 
            font-weight: 600; 
            margin-bottom: 18px;
            color: #111827;
          }
          .intro-text { 
            color: #4b5563; 
            margin-bottom: 28px;
            font-size: 15px;
            line-height: 1.7;
          }
          .earnings-banner { 
            background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); 
            padding: 32px; 
            border-radius: 16px; 
            text-align: center; 
            margin: 28px 0; 
            border: 3px solid #10B981;
            box-shadow: 0 6px 16px rgba(16, 185, 129, 0.2);
          }
          .earnings-label { 
            color: #065f46; 
            font-weight: 700; 
            font-size: 16px;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .earnings-amount { 
            font-size: 48px; 
            font-weight: 800; 
            color: #047857;
            margin: 12px 0;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            letter-spacing: -1px;
          }
          .earnings-note { 
            color: #059669; 
            font-size: 13px;
            margin-top: 10px;
            font-weight: 500;
          }
          .section { 
            background: #f9fafb; 
            padding: 24px; 
            border-radius: 12px; 
            margin: 24px 0; 
            border: 1px solid #e5e7eb;
          }
          .section-title { 
            font-size: 16px; 
            font-weight: 700; 
            margin-bottom: 20px;
            color: #111827;
            display: flex;
            align-items: center;
            gap: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-row { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start;
            padding: 14px 0; 
            border-bottom: 1px solid #e5e7eb;
            gap: 16px;
          }
          .info-row:last-child { 
            border-bottom: none; 
            padding-bottom: 0;
          }
          .info-row:first-child {
            padding-top: 0;
          }
          .info-label { 
            color: #6b7280; 
            font-weight: 500;
            font-size: 14px;
            min-width: 140px;
            flex-shrink: 0;
          }
          .info-value { 
            color: #111827; 
            font-weight: 600;
            text-align: right;
            font-size: 14px;
            word-break: break-word;
          }
          .deduction-box { 
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); 
            padding: 18px; 
            border-radius: 10px; 
            margin: 16px 0; 
            border-left: 4px solid #ef4444;
          }
          .deduction-row { 
            display: flex; 
            justify-content: space-between; 
            margin: 10px 0;
            font-size: 14px;
            align-items: center;
          }
          .deduction-label { 
            color: #991b1b;
            font-weight: 500;
          }
          .deduction-value { 
            color: #dc2626; 
            font-weight: 700;
          }
          .net-earnings-box { 
            background: #d1fae5; 
            padding: 20px; 
            border-radius: 12px; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-top: 18px;
            border: 2px solid #10B981;
          }
          .net-label { 
            color: #065f46; 
            font-weight: 700;
            font-size: 17px;
            letter-spacing: 0.3px;
          }
          .net-amount { 
            color: #10B981; 
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.5px;
          }
          .info-card { 
            background: #fffbeb; 
            padding: 18px; 
            border-radius: 10px; 
            margin: 18px 0;
            border-left: 4px solid #f59e0b;
            font-size: 13px;
            line-height: 1.7;
          }
          .cta-button { 
            display: inline-block; 
            background: linear-gradient(135deg, #10B981 0%, #059669 100%); 
            color: white; 
            padding: 16px 36px; 
            text-decoration: none; 
            border-radius: 10px; 
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 28px 0;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          }
          .highlight-box { 
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); 
            padding: 20px; 
            border-radius: 10px; 
            margin: 24px 0;
            border-left: 4px solid #f59e0b;
          }
          .highlight-box strong { 
            color: #92400e;
            font-size: 15px;
            font-weight: 700;
          }
          .highlight-box ul { 
            margin: 12px 0 0 0; 
            padding-left: 20px;
            color: #78350f;
            font-size: 14px;
          }
          .highlight-box li { 
            margin: 8px 0;
            line-height: 1.6;
          }
          .footer { 
            background: #f9fafb; 
            padding: 35px 30px; 
            text-align: center; 
            color: #6b7280; 
            font-size: 13px;
            border-top: 1px solid #e5e7eb;
          }
          .footer-links { 
            margin: 16px 0;
          }
          .footer-links a { 
            color: #10B981; 
            text-decoration: none;
            margin: 0 12px;
            font-weight: 600;
          }
          .divider { 
            height: 1px; 
            background: #e5e7eb; 
            margin: 28px 0;
          }
          .monospace { 
            font-family: 'Courier New', monospace; 
            font-size: 13px;
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
          }
          .uppercase { text-transform: uppercase; }
          
          @media only screen and (max-width: 600px) {
            body { padding: 10px; }
            .header { padding: 30px 20px; }
            .header h1 { font-size: 24px; }
            .content { padding: 25px 20px; }
            .earnings-amount { font-size: 40px; }
            .section { padding: 18px; }
            .info-row { 
              flex-direction: column; 
              gap: 6px;
              padding: 12px 0;
            }
            .info-label { min-width: auto; }
            .info-value { text-align: left; }
            .deduction-row {
              flex-direction: column;
              align-items: flex-start;
              gap: 4px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Payment Received!</h1>
            <p>Your passenger has confirmed the booking</p>
          </div>
          
          <div class="content">
            <div class="greeting">Hi ${driver.name},</div>
            <p class="intro-text">
              Excellent news! Payment for booking <strong>#${booking._id.toString().slice(-8).toUpperCase()}</strong> 
              has been successfully received. Your passenger is confirmed and ready for the ride.
            </p>
            
            <div class="earnings-banner">
              <div class="earnings-label">💵 Your Net Earnings</div>
              <div class="earnings-amount">₹${driverNetEarnings.toFixed(2)}</div>
              <div class="earnings-note">
                Payment will be transferred within 2-3 business days
              </div>
            </div>

            <div class="section">
              <div class="section-title">💳 Earnings Breakdown</div>
              <div class="info-row">
                <span class="info-label">Base Fare (Your Rate)</span>
                <span class="info-value" style="color: #059669;">₹${baseFare.toFixed(2)}</span>
              </div>
              
              <div class="deduction-box">
                <div style="font-weight: 700; color: #991b1b; margin-bottom: 12px; font-size: 14px;">Deductions:</div>
                <div class="deduction-row">
                  <span class="deduction-label">Platform Fee (8%)</span>
                  <span class="deduction-value">- ₹${platformFee.toFixed(2)}</span>
                </div>
                <div class="deduction-row">
                  <span class="deduction-label">GST on Platform Fee (18%)</span>
                  <span class="deduction-value">- ₹${gstOnPlatformFee.toFixed(2)}</span>
                </div>
              </div>
              
              <div class="net-earnings-box">
                <span class="net-label">You Receive</span>
                <span class="net-amount">₹${driverNetEarnings.toFixed(2)}</span>
              </div>
            </div>

            <div class="info-card">
              <strong style="color: #92400e; display: block; margin-bottom: 8px;">💡 Payment Breakdown:</strong>
              <div style="color: #92400e;">
                • Base fare you set: <strong>₹${baseFare.toFixed(2)}</strong><br>
                • Platform fee deducted: <strong>₹${(platformFee + gstOnPlatformFee).toFixed(2)}</strong><br>
                • Passenger paid total: <strong>₹${totalPassengerPaid.toFixed(2)}</strong><br>
                • Your net earning: <strong>₹${driverNetEarnings.toFixed(2)}</strong>
              </div>
            </div>

            <div class="section">
              <div class="section-title">🚗 Ride Details</div>
              <div class="info-row">
                <span class="info-label">Pickup Location</span>
                <span class="info-value">${booking.pickupLocation}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Drop Location</span>
                <span class="info-value">${booking.dropLocation}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Journey Date</span>
                <span class="info-value">${new Date(booking.rideId.date).toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Departure Time</span>
                <span class="info-value">${booking.rideId.time}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Seats Booked</span>
                <span class="info-value">${booking.seatsBooked} Seat(s)</span>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">👤 Passenger Information</div>
              <div class="info-row">
                <span class="info-label">Passenger Name</span>
                <span class="info-value">${passenger.name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Contact Number</span>
                <span class="info-value">${passenger.phone || 'Not provided'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Email Address</span>
                <span class="info-value">${passenger.email}</span>
              </div>
              ${booking.passengerNotes ? `
              <div class="info-row">
                <span class="info-label">Passenger Notes</span>
                <span class="info-value">${booking.passengerNotes}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="section">
              <div class="section-title">📄 Payment Details</div>
              <div class="info-row">
                <span class="info-label">Transaction ID</span>
                <span class="info-value monospace">${transaction._id}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Payment ID</span>
                <span class="info-value monospace">${transaction.razorpayPaymentId}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Payment Time</span>
                <span class="info-value">${new Date(transaction.paymentCapturedAt).toLocaleString('en-US', { 
                  dateStyle: 'medium', 
                  timeStyle: 'short' 
                })}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status</span>
                <span class="info-value" style="color: #10b981;">✓ Payment Captured</span>
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/upcoming-rides" class="cta-button">
                View My Upcoming Rides
              </a>
            </div>
            
            <div class="highlight-box">
              <strong>⚠️ Important Reminders:</strong>
              <ul>
                <li>Be at pickup location <strong>on time</strong></li>
                <li>Contact passenger 30 minutes before departure</li>
                <li>Verify passenger identity before starting</li>
                <li>Drive safely and follow traffic rules</li>
                <li>Maintain good ratings with excellent service</li>
                <li>Complete the ride to receive your payout</li>
              </ul>
            </div>

            <div style="background: #e0f2fe; padding: 18px; border-radius: 10px; border-left: 4px solid #3B82F6; margin-top: 24px;">
              <div style="font-size: 14px; color: #075985; line-height: 1.7;">
                <strong style="display: block; margin-bottom: 8px;">💼 Payout Information:</strong>
                <p style="margin: 0;">
                  Your earnings of <strong>₹${driverNetEarnings.toFixed(2)}</strong> will be transferred to your 
                  registered bank account within <strong>2-3 business days</strong> after ride completion.
                </p>
              </div>
            </div>

            <div class="divider"></div>

            <div style="text-align: center; color: #6b7280; font-size: 14px;">
              <p style="margin-bottom: 10px; font-weight: 600;">Need Assistance? We're Here to Help!</p>
              <p>
                <a href="mailto:support@rideshare.com" style="color: #10B981; text-decoration: none; font-weight: 600;">
                  support@rideshare.com
                </a>
                <span style="margin: 0 10px;">•</span>
                <a href="tel:+911234567890" style="color: #10B981; text-decoration: none; font-weight: 600;">
                  +91 123-456-7890
                </a>
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p style="font-weight: 700; margin-bottom: 10px; font-size: 15px;">Drive Safe and Have a Great Trip! 🚗</p>
            <p style="margin-bottom: 20px;">Thank you for being part of RideShare</p>
            
           
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #9ca3af;">
                This is an automated email. Please do not reply.<br>
                © 2025 RideShare. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Payment notification sent successfully to driver:', driver.email);
    return { success: true, message: 'Driver notification sent' };
  } catch (error) {
    console.error('❌ Error sending driver notification:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send ride reminder (1 day before)
 */
exports.sendRideReminder = async (booking, user, userType) => {
  const isDriver = userType === 'driver';
  
  const mailOptions = {
    from: `"RideShare" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `🔔 Ride Reminder - Tomorrow at ${booking.rideId.time} | RideShare`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.6; 
            color: #1f2937; 
            background: #f3f4f6;
            padding: 20px;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
          }
          .header h1 { 
            font-size: 28px; 
            margin-bottom: 8px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          .content { 
            padding: 35px 30px; 
          }
          .greeting { 
            font-size: 20px; 
            font-weight: 600; 
            margin-bottom: 18px;
            color: #111827;
          }
          .intro-text { 
            color: #4b5563; 
            margin-bottom: 28px;
            font-size: 15px;
            line-height: 1.7;
          }
          .time-banner { 
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); 
            padding: 32px; 
            text-align: center; 
            border-radius: 16px; 
            margin: 28px 0; 
            border: 3px solid #f59e0b;
            box-shadow: 0 6px 16px rgba(245, 158, 11, 0.2);
          }
          .time-label { 
            color: #92400e; 
            font-weight: 700; 
            font-size: 16px;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .time-value { 
            font-size: 48px; 
            font-weight: 800; 
            color: #78350f;
            margin: 12px 0;
            letter-spacing: -1px;
          }
          .date-value { 
            color: #92400e; 
            font-size: 16px;
            font-weight: 600;
            margin-top: 10px;
          }
          .section { 
            background: #f9fafb; 
            padding: 24px; 
            border-radius: 12px; 
            margin: 24px 0; 
            border: 1px solid #e5e7eb;
          }
          .section-title { 
            font-size: 16px; 
            font-weight: 700; 
            margin-bottom: 20px;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-row { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start;
            padding: 14px 0; 
            border-bottom: 1px solid #e5e7eb;
            gap: 16px;
          }
          .info-row:last-child { 
            border-bottom: none; 
            padding-bottom: 0;
          }
          .info-row:first-child {
            padding-top: 0;
          }
          .info-label { 
            color: #6b7280; 
            font-weight: 500;
            font-size: 14px;
            min-width: 140px;
            flex-shrink: 0;
          }
          .info-value { 
            color: #111827; 
            font-weight: 600;
            text-align: right;
            font-size: 14px;
            word-break: break-word;
          }
          .cta-button { 
            display: inline-block; 
            background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); 
            color: white; 
            padding: 16px 36px; 
            text-decoration: none; 
            border-radius: 10px; 
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 28px 0;
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
          }
          .highlight-box { 
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); 
            padding: 20px; 
            border-radius: 10px; 
            margin: 24px 0;
            border-left: 4px solid #3B82F6;
          }
          .highlight-box strong { 
            color: #1e40af;
            font-size: 15px;
            font-weight: 700;
          }
          .highlight-box ul { 
            margin: 12px 0 0 0; 
            padding-left: 20px;
            color: #1e3a8a;
            font-size: 14px;
          }
          .highlight-box li { 
            margin: 8px 0;
            line-height: 1.6;
          }
          .success-badge { 
            background: #d1fae5; 
            color: #065f46; 
            padding: 14px 20px; 
            border-radius: 10px; 
            text-align: center;
            font-weight: 600;
            border: 2px solid #10b981;
            margin: 24px 0;
            font-size: 14px;
          }
          .footer { 
            background: #f9fafb; 
            padding: 35px 30px; 
            text-align: center; 
            color: #6b7280; 
            font-size: 13px;
            border-top: 1px solid #e5e7eb;
          }
          .monospace { 
            font-family: 'Courier New', monospace; 
            font-size: 13px;
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
          }
          .uppercase { text-transform: uppercase; }
          
          @media only screen and (max-width: 600px) {
            body { padding: 10px; }
            .header { padding: 30px 20px; }
            .content { padding: 25px 20px; }
            .time-value { font-size: 40px; }
            .section { padding: 18px; }
            .info-row { 
              flex-direction: column; 
              gap: 6px;
              padding: 12px 0;
            }
            .info-label { min-width: auto; }
            .info-value { text-align: left; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Ride Reminder</h1>
            <p>Your ride is scheduled for tomorrow!</p>
          </div>
          
          <div class="content">
            <div class="greeting">Hi ${user.name},</div>
            <p class="intro-text">
              ${isDriver ? 
                'This is a friendly reminder that you have a confirmed ride scheduled for tomorrow. Please be prepared and on time.' : 
                'Just a reminder that your ride is confirmed and scheduled for tomorrow. Get ready for your journey!'
              }
            </p>
            
            <div class="time-banner">
              <div class="time-label">📅 Tomorrow at</div>
              <div class="time-value">${booking.rideId.time}</div>
              <div class="date-value">
                ${new Date(booking.rideId.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
            </div>

            <div class="success-badge">
              ✓ ${isDriver ? 'Ride Confirmed • Payment Received' : 'Booking Confirmed • Payment Completed'}
            </div>

            <div class="section">
              <div class="section-title">🚗 Ride Details</div>
              <div class="info-row">
                <span class="info-label">Pickup Location</span>
                <span class="info-value">${booking.pickupLocation}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Drop Location</span>
                <span class="info-value">${booking.dropLocation}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Seats Booked</span>
                <span class="info-value">${booking.seatsBooked} Seat(s)</span>
              </div>
              <div class="info-row">
                <span class="info-label">Booking ID</span>
                <span class="info-value monospace">#${booking._id.toString().slice(-8).toUpperCase()}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">${isDriver ? '👤 Passenger Information' : '🚗 Driver Information'}</div>
              ${isDriver ? `
                <div class="info-row">
                  <span class="info-label">Passenger Name</span>
                  <span class="info-value">${booking.passengerId.name}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Contact Number</span>
                  <span class="info-value">${booking.passengerId.phone || 'Not provided'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Email Address</span>
                  <span class="info-value">${booking.passengerId.email}</span>
                </div>
              ` : `
                <div class="info-row">
                  <span class="info-label">Driver Name</span>
                  <span class="info-value">${booking.rideId.driverId.name}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Contact Number</span>
                  <span class="info-value">${booking.rideId.phoneNumber}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Vehicle Number</span>
                  <span class="info-value uppercase">${booking.rideId.vehicleNumber}</span>
                </div>
              `}
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/upcoming-rides" class="cta-button">
                View Full Details
              </a>
            </div>
            
            <div class="highlight-box">
              <strong>💡 ${isDriver ? 'Driver' : 'Passenger'} Tips:</strong>
              <ul>
                ${isDriver ? `
                  <li>Be at pickup location <strong>on time</strong></li>
                  <li>Contact passenger to confirm details</li>
                  <li>Ensure vehicle is clean and fueled</li>
                  <li>Keep phone charged for navigation</li>
                  <li>Review route and check traffic updates</li>
                ` : `
                  <li>Be ready <strong>10 minutes early</strong></li>
                  <li>Save driver's contact number</li>
                  <li>Keep booking ID handy</li>
                  <li>Carry valid ID proof</li>
                  <li>Inform driver if running late</li>
                `}
              </ul>
            </div>

            <div style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 28px;">
              <p style="font-weight: 600; margin-bottom: 10px;">Questions or Need Changes?</p>
              <p>
                <a href="mailto:support@rideshare.com" style="color: #F59E0B; text-decoration: none; font-weight: 600;">
                  Contact Support
                </a>
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p style="font-weight: 700; margin-bottom: 20px; font-size: 15px;">
              ${isDriver ? 'Drive Safe and Have a Great Trip! 🚗' : 'Have a Safe and Pleasant Journey! 🚗'}
            </p>
            
            <div style="margin: 20px 0;">
            </div>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #9ca3af;">
                This is an automated reminder. Please do not reply.<br>
                © 2025 RideShare. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Ride reminder sent successfully to ${userType}:`, user.email);
    return { success: true, message: 'Reminder sent' };
  } catch (error) {
    console.error('❌ Error sending ride reminder:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = exports;