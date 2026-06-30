const ical = require('ical-generator').default;
const moment = require('moment');
const crypto = require('crypto');

/**
 * STARTUP VALIDATION
 * Resend-specific vars removed. EmailJS is frontend-only, so the backend
 * no longer needs an email API key — it only needs to know where the
 * frontend lives (for links) and how to label outgoing "from" names.
 */
const requiredEnvVars = ['FRONTEND_URL', 'NODE_ENV'];
console.log('📧 [EmailService] Initializing Production Audit (EmailJS payload mode)...');

requiredEnvVars.forEach(varName => {
  const isSet = !!process.env[varName];
  console.log(`   - ${varName}: ${isSet ? 'OK ✅' : 'MISSING ❌'}`);
  if (!isSet && process.env.NODE_ENV === 'production') {
    throw new Error(`CRITICAL STARTUP ERROR: Missing environment variable ${varName}`);
  }
});

/**
 * UTILITY: Logging Helpers
 */
const getCorrelationId = () => crypto.randomBytes(4).toString('hex').toUpperCase();

const logEmailActionBuilt = (cid, template, to) => {
  console.log(`
===== [${cid}] EMAIL ACTION BUILT =====
Template:    ${template}
Recipient:   ${to}
Environment: ${process.env.NODE_ENV}
Correlation: ${cid}
========================================`);
};

/**
 * Generate calendar event (.ics) for a ride.
 * Kept as-is — EmailJS can't send binary attachments, so we return the
 * ICS content as a base64 string inside the payload. The frontend can
 * either attach it via a custom EmailJS variable, or offer it as a
 * "Add to calendar" download link/button next to the email send call.
 */
const generateCalendarEvent = (booking, ride, driver) => {
  console.log(`[EmailService] Generating ICS calendar event for Booking: ${booking._id}`);

  const calendar = ical({ name: 'ShareMyRide Trip' });

  const rideDateTime = moment(`${ride.date} ${ride.time}`, 'YYYY-MM-DD HH:mm');

  calendar.createEvent({
    start: rideDateTime.toDate(),
    end: moment(rideDateTime).add(2, 'hours').toDate(),
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
      email: process.env.EMAIL_USER || 'no-reply@sharemyride.app',
    },
    alarms: [
      { type: 'display', trigger: 24 * 60 },
      { type: 'display', trigger: 60 },
    ],
  });

  return calendar.toString();
};

/**
 * Helper: standard envelope every emailAction returns.
 */
const buildAction = (template, payload) => ({ template, payload });

/**
 * Send booking confirmation emails (passenger + driver)
 * Returns an emailAction with an `emails` array — one entry per recipient —
 * so the frontend can loop through and fire emailjs.send() for each.
 */
const sendBookingConfirmationEmails = async (booking, ride, driver, passenger) => {
  const cid = getCorrelationId();
  try {
    console.info(`[${cid}] Building booking confirmation emailAction for Booking: ${booking._id}`);

    const calendarEventContent = generateCalendarEvent(booking, ride, driver);
    const icsBase64 = Buffer.from(calendarEventContent).toString('base64');

    const baseFare = booking.baseFare || 0;
    const platformFee = baseFare * 0.08;
    const gst = platformFee * 0.18;
    const totalAmount = baseFare + platformFee + gst;
    const driverReceives = baseFare - platformFee - gst;

    const sharedFields = {
      bookingId: String(booking._id),
      pickupLocation: booking.pickupLocation,
      dropLocation: booking.dropLocation,
      seatsBooked: booking.seatsBooked,
      rideDate: moment(ride.date).format('dddd, MMMM D, YYYY'),
      rideTime: ride.time,
      vehicleModel: ride.vehicleModel || 'N/A',
      vehicleNumber: ride.vehicleNumber || 'N/A',
      fare: {
        baseFare: baseFare.toFixed(2),
        platformFee: platformFee.toFixed(2),
        gst: gst.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        driverReceives: driverReceives.toFixed(2),
      },
      payment: {
        method: 'Razorpay',
        transactionId: booking.razorpayPaymentId || 'N/A',
        paymentDate: moment(booking.paymentCompletedAt || new Date()).format('MMMM D, YYYY [at] h:mm A'),
        status: 'Success',
      },
      bookingUrl: `${process.env.FRONTEND_URL}/my-bookings`,
      supportUrl: `${process.env.FRONTEND_URL}/support`,
      icsAttachmentBase64: icsBase64,
      icsFilename: 'ride-calendar-invite.ics',
    };

    const passengerPayload = {
      ...sharedFields,
      recipientRole: 'passenger',
      to_email: passenger.email,
      to_name: passenger.name,
      driver: { name: driver.name, phone: driver.phone, email: driver.email },
    };

    const driverPayload = {
      ...sharedFields,
      recipientRole: 'driver',
      to_email: driver.email,
      to_name: driver.name,
      passenger: { name: passenger.name, phone: passenger.phone, email: passenger.email },
    };

    logEmailActionBuilt(cid + '-P', 'booking-confirmation-passenger', passenger.email);
    logEmailActionBuilt(cid + '-D', 'booking-confirmation-driver', driver.email);

    return {
      success: true,
      emailAction: {
        emails: [
          buildAction('booking-confirmation-passenger', passengerPayload),
          buildAction('booking-confirmation-driver', driverPayload),
        ],
      },
    };
  } catch (error) {
    console.error(`[${cid}] ❌ FAILURE building sendBookingConfirmationEmails action:`, error);
    throw error;
  }
};

/**
 * Verification email
 */
const sendVerificationEmail = async (email, name, verificationLink) => {
  const cid = getCorrelationId();
  try {
    logEmailActionBuilt(cid, 'verification', email);
    return {
      success: true,
      emailAction: buildAction('verification', {
        to_email: email,
        to_name: name || 'there',
        verificationLink,
        expiresInHours: 24,
      }),
    };
  } catch (error) {
    console.error(`[${cid}] ❌ FAILURE building sendVerificationEmail action:`, error);
    throw error;
  }
};

/**
 * Password reset email
 */
const sendPasswordResetEmail = async (email, name, resetToken) => {
  const cid = getCorrelationId();
  try {
    const resetLink = `${process.env.FRONTEND_URL || process.env.API_BASE_URL}/reset-password?email=${encodeURIComponent(email)}&code=${resetToken}`;

    logEmailActionBuilt(cid, 'password-reset', email);
    return {
      success: true,
      emailAction: buildAction('password-reset', {
        to_email: email,
        to_name: name || 'there',
        resetLink,
        resetCode: resetToken,
        expiresInMinutes: 15,
      }),
    };
  } catch (error) {
    console.error(`[${cid}] ❌ FAILURE building sendPasswordResetEmail action:`, error);
    throw error;
  }
};

/**
 * Welcome email
 */
const sendWelcomeEmail = async (email, name) => {
  const cid = getCorrelationId();
  try {
    logEmailActionBuilt(cid, 'welcome', email);
    return {
      success: true,
      emailAction: buildAction('welcome', {
        to_email: email,
        to_name: name || 'there',
      }),
    };
  } catch (error) {
    console.error(`[${cid}] ❌ FAILURE building sendWelcomeEmail action:`, error);
    throw error;
  }
};

/**
 * Diagnostic test "email" — now just returns the action payload
 * so you can verify the EmailJS wiring without hitting any provider.
 */
const sendTestEmail = async (toEmail) => {
  const cid = getCorrelationId();
  console.info(`[${cid}] Running EmailJS Diagnostic (payload-only)...`);

  const payload = {
    to_email: toEmail,
    correlationId: cid,
    timestamp: new Date().toISOString(),
  };

  logEmailActionBuilt(cid, 'diagnostic-test', toEmail);

  return {
    success: true,
    correlationId: cid,
    emailAction: buildAction('diagnostic-test', payload),
  };
};

/**
 * Inquiry received (user-facing acknowledgment)
 */
const sendInquiryReceivedEmail = async (inquiry) => {
  const cid = getCorrelationId();
  try {
    const isReport = ['report', 'bug', 'safety'].includes(inquiry.inquiryType);
    logEmailActionBuilt(cid, 'inquiry-received', inquiry.email);
    return {
      success: true,
      emailAction: buildAction('inquiry-received', {
        to_email: inquiry.email,
        to_name: inquiry.name,
        ticketId: inquiry.ticketId,
        subject: inquiry.subject,
        inquiryType: inquiry.inquiryType,
        label: isReport ? 'Report Received' : 'Inquiry Received',
      }),
    };
  } catch (error) {
    console.error(`[${cid}] Error building inquiry-received action:`, error);
  }
};

/**
 * Admin alert for high priority inquiries
 */
const sendInquiryNotificationToAdmin = async (inquiry) => {
  const cid = getCorrelationId();
  try {
    const adminEmail = process.env.EMAIL_USER || process.env.EMAIL_CONTACT;
    logEmailActionBuilt(cid, 'inquiry-admin-alert', adminEmail);
    return {
      success: true,
      emailAction: buildAction('inquiry-admin-alert', {
        to_email: adminEmail,
        ticketId: inquiry.ticketId,
        fromName: inquiry.name,
        fromEmail: inquiry.email,
        inquiryType: inquiry.inquiryType,
        subject: inquiry.subject,
        message: inquiry.message,
      }),
    };
  } catch (error) {
    console.error(`[${cid}] Error building inquiry-admin-alert action:`, error);
  }
};

/**
 * Reply email to user
 */
const sendInquiryReplyEmail = async (inquiry, replyMessage) => {
  const cid = getCorrelationId();
  try {
    logEmailActionBuilt(cid, 'inquiry-reply', inquiry.email);
    return {
      success: true,
      emailAction: buildAction('inquiry-reply', {
        to_email: inquiry.email,
        to_name: inquiry.name,
        ticketId: inquiry.ticketId,
        subject: inquiry.subject,
        originalMessage: inquiry.message,
        replyMessage,
      }),
    };
  } catch (error) {
    console.error(`[${cid}] Error building inquiry-reply action:`, error);
  }
};

/**
 * Blog moderation status notification
 */
const sendBlogStatusNotification = async (blogPost, status, remark) => {
  const cid = getCorrelationId();
  try {
    const isApproved = status === 'published';
    logEmailActionBuilt(cid, 'blog-status', blogPost.author?.email);
    return {
      success: true,
      emailAction: buildAction('blog-status', {
        to_email: blogPost.author?.email,
        to_name: blogPost.author?.name || 'Author',
        blogTitle: blogPost.title,
        status,
        remark: remark || null,
        isApproved,
      }),
    };
  } catch (error) {
    console.error(`[${cid}] Error building blog-status action:`, error);
  }
};

/**
 * Unified business/admin notification (founder inbox)
 */
const sendBusinessNotificationToAdmin = async (inquiry) => {
  const cid = getCorrelationId();
  try {
    const adminEmail = process.env.EMAIL_CONTACT || 'sharemyride.contact@gmail.com';
    const dashboardUrl = `${process.env.FRONTEND_URL}/admin/founder-inbox/${inquiry._id}`;

    logEmailActionBuilt(cid, 'business-notification', adminEmail);
    return {
      success: true,
      emailAction: buildAction('business-notification', {
        to_email: adminEmail,
        ticketId: inquiry.ticketId,
        fromName: inquiry.name,
        fromEmail: inquiry.email,
        fromPhone: inquiry.phone || null,
        inquiryType: inquiry.inquiryType,
        priority: inquiry.priority,
        subject: inquiry.subject,
        message: inquiry.message,
        submittedAt: moment(inquiry.createdAt).format('MMMM D, YYYY [at] h:mm A'),
        userId: inquiry.userId || null,
        additionalNotes: inquiry.metadata?.additionalNotes || null,
        dashboardUrl,
      }),
    };
  } catch (error) {
    console.error(`[${cid}] Error building business-notification action:`, error);
  }
};

/**
 * Standard acknowledgment email with ticket number
 */
const sendUserConfirmationEmail = async (inquiry) => {
  const cid = getCorrelationId();
  try {
    const inquiryTypeName = inquiry.inquiryType.replace(/_/g, ' ');
    const estimatedResponseTime =
      inquiry.priority === 'critical' ? '4-6 hours' :
      inquiry.priority === 'high' ? '12-24 hours' : '24-48 hours';

    logEmailActionBuilt(cid, 'user-confirmation', inquiry.email);

    const emailAction = buildAction('user-confirmation', {
      to_email: inquiry.email,
      to_name: inquiry.name,
      ticketId: inquiry.ticketId,
      subject: inquiry.subject,
      inquiryTypeName,
      messagePreview: inquiry.message.substring(0, 150) + (inquiry.message.length > 150 ? '...' : ''),
      estimatedResponseTime,
    });

    // Preserve original side-effect: mark confirmation email as "sent"
    // on the in-memory inquiry doc so the caller's existing .save() logic
    // (in the controller) continues to work unmodified.
    if (inquiry.emailsSent) {
      inquiry.emailsSent.confirmationEmail = true;
      inquiry.emailsSent.confirmationEmailAt = new Date();
    }

    return { success: true, emailAction };
  } catch (error) {
    console.error(`[${cid}] Error building user-confirmation action:`, error);
  }
};

// Export functions — same names, same shape, no Resend dependency
module.exports = {
  sendBookingConfirmationEmails,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendTestEmail,
  sendInquiryReceivedEmail,
  sendInquiryNotificationToAdmin,
  sendInquiryReplyEmail,
  sendBlogStatusNotification,
  sendBusinessNotificationToAdmin,
  sendUserConfirmationEmail,
};