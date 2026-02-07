// services/emailService.js
const nodemailer = require('nodemailer');
const ical = require('ical-generator').default;
const moment = require('moment');

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVICE === 'gmail' ? 'smtp.gmail.com' : process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Generate calendar event for the ride
 */
const generateCalendarEvent = (booking, ride, driver) => {
  const calendar = ical({ name: 'ShareMyRide Trip' });
  
  const rideDateTime = moment(`${ride.date} ${ride.time}`, 'YYYY-MM-DD HH:mm');
  
  calendar.createEvent({
    start: rideDateTime.toDate(),
    end: moment(rideDateTime).add(2, 'hours').toDate(), // Estimated 2hr trip
    summary: `Ride: ${booking.pickupLocation} → ${booking.dropLocation}`,
    description: `
ShareMyRide Trip Details

Driver: ${driver.name}
Phone: ${driver.phone}
Vehicle: ${ride.vehicleModel || 'N/A'} (${ride.vehicleNumber || 'N/A'})

Pickup: ${booking.pickupLocation}
Drop: ${booking.dropLocation}
Seats: ${booking.seatsBooked}

Booking ID: ${booking._id}
Payment: ₹${(booking.finalAmount || booking.totalFare || booking.baseFare).toFixed(2)} (Paid)

Safe travels!
    `.trim(),
    location: booking.pickupLocation,
    url: `${process.env.FRONTEND_URL}/my-bookings`,
    organizer: {
      name: process.env.EMAIL_FROM_NAME || 'ShareMyRide',
      email: process.env.EMAIL_USER,
    },
    alarms: [
      { type: 'display', trigger: 24 * 60 }, // 1 day before
      { type: 'display', trigger: 60 }, // 1 hour before
    ],
  });

  return calendar.toString();
};

/**
 * Generate professional email template
 */
const generateEmailTemplate = (booking, ride, driver, passenger, isDriver = false) => {
  const baseFare = booking.baseFare || 0;
  const platformFee = baseFare * 0.08;
  const gst = platformFee * 0.18;
  const totalAmount = baseFare + platformFee + gst;
  const driverReceives = baseFare - platformFee - gst;

  const rideDate = moment(ride.date).format('dddd, MMMM D, YYYY');
  const rideTime = ride.time;
  const paymentDate = moment(booking.paymentCompletedAt || new Date()).format('MMMM D, YYYY [at] h:mm A');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Successful – Ride Confirmed</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f7fa; color: #1a202c; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
    .logo { font-size: 28px; font-weight: 800; color: #ffffff; margin-bottom: 10px; }
    .header-text { color: #ffffff; font-size: 16px; opacity: 0.95; }
    .success-badge { background: #10b981; color: white; display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 50px; font-weight: 600; font-size: 15px; margin: 20px 0; }
    .content { padding: 30px; }
    .greeting { font-size: 20px; font-weight: 600; color: #1a202c; margin-bottom: 15px; }
    .message { color: #4a5568; font-size: 15px; margin-bottom: 25px; }
    .info-card { background: #f7fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .info-title { font-size: 14px; font-weight: 700; color: #2d3748; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #718096; font-size: 14px; }
    .info-value { color: #1a202c; font-weight: 600; font-size: 14px; text-align: right; }
    .route-card { background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border: 2px solid #667eea; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .location { display: flex; align-items: flex-start; gap: 12px; margin: 12px 0; }
    .location-icon { flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; }
    .pickup-icon { background: #10b981; color: white; }
    .drop-icon { background: #3b82f6; color: white; }
    .location-text { flex: 1; font-size: 15px; font-weight: 600; color: #1a202c; }
    .divider { text-align: center; color: #cbd5e0; margin: 8px 0; }
    .payment-summary { background: #f0fdf4; border: 2px solid #10b981; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .payment-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .payment-label { color: #065f46; }
    .payment-value { color: #047857; font-weight: 600; }
    .payment-indent { padding-left: 20px; font-size: 13px; color: #059669; }
    .payment-total { border-top: 2px solid #10b981; margin-top: 10px; padding-top: 12px; font-size: 18px; font-weight: 700; }
    .payment-total .payment-value { color: #10b981; font-size: 20px; }
    .id-badge { background: #edf2f7; border: 1px dashed #a0aec0; border-radius: 8px; padding: 12px; margin: 15px 0; text-align: center; }
    .id-label { font-size: 11px; text-transform: uppercase; color: #718096; margin-bottom: 4px; }
    .id-value { font-family: 'Courier New', monospace; font-size: 13px; font-weight: 600; color: #2d3748; word-break: break-all; }
    .cta-button { display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 10px 5px; text-align: center; }
    .cta-button:hover { background: #5568d3; }
    .cta-secondary { background: #48bb78; }
    .cta-secondary:hover { background: #38a169; }
    .footer { background: #2d3748; color: #e2e8f0; padding: 30px; text-align: center; font-size: 13px; }
    .footer-links { margin: 15px 0; }
    .footer-link { color: #a0aec0; text-decoration: none; margin: 0 10px; }
    .footer-link:hover { color: #e2e8f0; }
    .highlight { background: #fef3c7; padding: 2px 6px; border-radius: 3px; font-weight: 600; }
    @media only screen and (max-width: 600px) {
      .content { padding: 20px; }
      .info-row { flex-direction: column; gap: 5px; }
      .info-value { text-align: left; }
      .cta-button { display: block; margin: 10px 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🚗 ShareMyRide</div>
      <div class="header-text">Your trusted carpooling partner</div>
      <div class="success-badge">
        ✓ Payment Successful
      </div>
    </div>

    <div class="content">
      <h1 class="greeting">Hello ${isDriver ? driver.name : passenger.name}! 👋</h1>
      
      <p class="message">
        ${isDriver 
          ? `Great news! Your ride has been booked and paid for. You'll receive <span class="highlight">₹${driverReceives.toFixed(2)}</span> for this trip.`
          : `Your payment of <span class="highlight">₹${totalAmount.toFixed(2)}</span> has been successfully processed. Your ride is confirmed!`
        }
      </p>

      <div class="route-card">
        <div class="info-title">🗓️ RIDE SCHEDULE</div>
        <div class="location">
          <div class="location-icon pickup-icon">📍</div>
          <div>
            <div style="font-size: 12px; color: #059669; font-weight: 600; margin-bottom: 2px;">PICKUP</div>
            <div class="location-text">${booking.pickupLocation}</div>
          </div>
        </div>
        <div class="divider">⬇ ⬇ ⬇</div>
        <div class="location">
          <div class="location-icon drop-icon">🎯</div>
          <div>
            <div style="font-size: 12px; color: #2563eb; font-weight: 600; margin-bottom: 2px;">DROP-OFF</div>
            <div class="location-text">${booking.dropLocation}</div>
          </div>
        </div>
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #cbd5e0;">
          <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 120px;">
              <div style="font-size: 12px; color: #718096;">DATE</div>
              <div style="font-weight: 600; color: #1a202c;">${rideDate}</div>
            </div>
            <div style="flex: 1; min-width: 120px;">
              <div style="font-size: 12px; color: #718096;">TIME</div>
              <div style="font-weight: 600; color: #1a202c;">${rideTime}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="info-card">
        <div class="info-title">
          ${isDriver ? '👤 PASSENGER DETAILS' : '🚗 DRIVER DETAILS'}
        </div>
        <div class="info-row">
          <span class="info-label">Name</span>
          <span class="info-value">${isDriver ? passenger.name : driver.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Phone</span>
          <span class="info-value">${isDriver ? passenger.phone : driver.phone}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email</span>
          <span class="info-value">${isDriver ? passenger.email : driver.email}</span>
        </div>
        ${!isDriver ? `
        <div class="info-row">
          <span class="info-label">Vehicle</span>
          <span class="info-value">${ride.vehicleModel || 'N/A'} • ${ride.vehicleNumber || 'N/A'}</span>
        </div>
        ` : ''}
        <div class="info-row">
          <span class="info-label">Seats Booked</span>
          <span class="info-value">${booking.seatsBooked}</span>
        </div>
      </div>

      ${isDriver ? `
      <div class="payment-summary">
        <div class="info-title">💰 YOUR EARNINGS</div>
        <div class="payment-row">
          <span class="payment-label">Base Fare (Trip Cost)</span>
          <span class="payment-value">₹${baseFare.toFixed(2)}</span>
        </div>
        <div class="payment-row payment-indent">
          <span class="payment-label">− Platform Fee (8%)</span>
          <span class="payment-value">₹${platformFee.toFixed(2)}</span>
        </div>
        <div class="payment-row payment-indent">
          <span class="payment-label">− GST on Platform Fee (18%)</span>
          <span class="payment-value">₹${gst.toFixed(2)}</span>
        </div>
        <div class="payment-row payment-total">
          <span class="payment-label">You Receive</span>
          <span class="payment-value">₹${driverReceives.toFixed(2)}</span>
        </div>
      </div>
      ` : `
      <div class="payment-summary">
        <div class="info-title">💳 PAYMENT DETAILS</div>
        <div class="payment-row">
          <span class="payment-label">Base Fare</span>
          <span class="payment-value">₹${baseFare.toFixed(2)}</span>
        </div>
        <div class="payment-row payment-indent">
          <span class="payment-label">+ Platform Service Fee (8%)</span>
          <span class="payment-value">₹${platformFee.toFixed(2)}</span>
        </div>
        <div class="payment-row payment-indent">
          <span class="payment-label">+ GST (18% on service fee)</span>
          <span class="payment-value">₹${gst.toFixed(2)}</span>
        </div>
        <div class="payment-row payment-total">
          <span class="payment-label">Total Amount Paid</span>
          <span class="payment-value">₹${totalAmount.toFixed(2)}</span>
        </div>
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #10b981;">
          <div class="payment-row" style="padding: 4px 0;">
            <span class="payment-label">Payment Method</span>
            <span class="payment-value">Razorpay</span>
          </div>
          <div class="payment-row" style="padding: 4px 0;">
            <span class="payment-label">Transaction ID</span>
            <span class="payment-value" style="font-family: 'Courier New', monospace; font-size: 12px;">${booking.razorpayPaymentId || 'N/A'}</span>
          </div>
          <div class="payment-row" style="padding: 4px 0;">
            <span class="payment-label">Payment Date</span>
            <span class="payment-value">${paymentDate}</span>
          </div>
          <div class="payment-row" style="padding: 4px 0;">
            <span class="payment-label">Status</span>
            <span class="payment-value" style="color: #10b981;">✓ Success</span>
          </div>
        </div>
      </div>
      `}

      <div class="id-badge">
        <div class="id-label">Booking Reference ID</div>
        <div class="id-value">${booking._id}</div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/my-bookings" class="cta-button">
          View Booking Details
        </a>
        ${!isDriver ? `
        <a href="${process.env.FRONTEND_URL}/support" class="cta-button cta-secondary">
          Contact Support
        </a>
        ` : ''}
      </div>

      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <div style="font-weight: 600; color: #92400e; margin-bottom: 5px;">🔔 Automatic Reminders</div>
        <div style="font-size: 13px; color: #78350f;">
          You'll receive reminders 24 hours and 1 hour before your ride. Add this trip to your calendar using the attached file.
        </div>
      </div>

      <div style="background: #f7fafc; border-radius: 8px; padding: 15px; margin: 20px 0; font-size: 13px; color: #4a5568;">
        <div style="font-weight: 600; color: #2d3748; margin-bottom: 8px;">📋 Important Notes:</div>
        <ul style="margin-left: 20px;">
          <li style="margin: 5px 0;">Please arrive at the pickup location 5-10 minutes early</li>
          <li style="margin: 5px 0;">${isDriver ? 'Contact the passenger if there are any delays' : 'Contact the driver if you need to make changes'}</li>
          <li style="margin: 5px 0;">Keep your phone charged and accessible</li>
          <li style="margin: 5px 0;">Follow COVID-19 safety protocols if applicable</li>
        </ul>
      </div>
    </div>

    <div class="footer">
      <div style="font-size: 15px; font-weight: 600; margin-bottom: 10px;">Need Help?</div>
      <div class="footer-links">
        <a href="${process.env.FRONTEND_URL}/support" class="footer-link">Support Center</a>
        <a href="${process.env.FRONTEND_URL}/faq" class="footer-link">FAQs</a>
        <a href="${process.env.FRONTEND_URL}/terms" class="footer-link">Terms</a>
      </div>
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #4a5568;">
        <p>© ${new Date().getFullYear()} ShareMyRide. All rights reserved.</p>
        <p style="font-size: 12px; color: #a0aec0; margin-top: 8px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Send booking confirmation emails with calendar attachment
 */
const sendBookingConfirmationEmails = async (booking, ride, driver, passenger) => {
  try {
    console.log('📧 Preparing to send emails...');
    console.log('Passenger email:', passenger.email);
    console.log('Driver email:', driver.email);
    
    // Generate calendar event
    const calendarEvent = generateCalendarEvent(booking, ride, driver);

    // Prepare email data for passenger
    const passengerEmail = {
      from: `"${process.env.EMAIL_FROM_NAME || 'ShareMyRide'}" <${process.env.EMAIL_USER}>`,
      to: passenger.email,
      subject: `Payment Successful – Your Ride is Confirmed! 🎉`,
      html: generateEmailTemplate(booking, ride, driver, passenger, false),
      icalEvent: {
        filename: 'ride-calendar-invite.ics',
        method: 'REQUEST',
        content: calendarEvent,
      },
    };

    // Prepare email data for driver
    const driverEmail = {
      from: `"${process.env.EMAIL_FROM_NAME || 'ShareMyRide'}" <${process.env.EMAIL_USER}>`,
      to: driver.email,
      subject: `New Booking Confirmed – Ride on ${moment(ride.date).format('MMM D')}`,
      html: generateEmailTemplate(booking, ride, driver, passenger, true),
      icalEvent: {
        filename: 'ride-calendar-invite.ics',
        method: 'REQUEST',
        content: calendarEvent,
      },
    };

    // Send emails
    console.log('📤 Sending passenger email...');
    const passengerResult = await transporter.sendMail(passengerEmail);
    console.log('✅ Passenger email sent:', passengerResult.messageId);
    
    console.log('📤 Sending driver email...');
    const driverResult = await transporter.sendMail(driverEmail);
    console.log('✅ Driver email sent:', driverResult.messageId);

    return {
      success: true,
      passengerEmailId: passengerResult.messageId,
      driverEmailId: driverResult.messageId,
    };
  } catch (error) {
    console.error('❌ Error sending emails:', error);
    throw error;
  }
};

// Export functions
module.exports = {
  sendBookingConfirmationEmails,
  transporter, // Export for testing
};