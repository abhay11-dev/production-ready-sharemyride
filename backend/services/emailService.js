const ical = require('ical-generator').default;
const moment = require('moment');
const crypto = require('crypto');

/**
 * SHAREMYRIDE EMAIL SERVICE — EmailJS payload mode
 *
 * No server-side email sending. Every function builds and returns an
 * { emailAction: { template, payload } } object (or, for combined flows,
 * { emailActions: { user, admin } }). The frontend caller is responsible
 * for firing emailjs.send(serviceId, templateId, payload).
 *
 * EmailJS templates required (configure in your EmailJS dashboard, see
 * /emailjs-templates/*.html in this delivery for ready-to-paste HTML):
 *
 *   VITE_EMAILJS_TEMPLATE_USER_CONFIRMATION
 *     Variables: to_email, to_name, ticketId, subject, inquiryTypeName,
 *                messagePreview, estimatedResponseTime, submittedAt, platformUrl
 *
 *   VITE_EMAILJS_TEMPLATE_ADMIN_ALERT
 *     Variables: to_email, ticketId, fromName, fromEmail, fromPhone,
 *                inquiryType, priority, subject, message, submittedAt,
 *                dashboardUrl, affectedPage, severity
 *
 *   VITE_EMAILJS_TEMPLATE_ADMIN_REPLY
 *     Variables: to_email, to_name, ticketId, subject, replyMessage,
 *                originalMessage, adminName, sentAt, platformUrl
 *
 *   VITE_EMAILJS_TEMPLATE_ADMIN_SYNC
 *     Sent to the admin inbox after ANY admin action on an inquiry/report
 *     (status change and/or reply). Confirms the loop closed and the
 *     user-facing email was actually dispatched.
 *     Variables: to_email, ticketId, userEmail, userName, oldStatus,
 *                newStatus, replyMessage, adminName, actionAt, dashboardUrl
 *
 *   VITE_EMAILJS_TEMPLATE_BOOKING_CONFIRMATION (passenger + driver)
 *     Variables: to_email, to_name, bookingId, pickupLocation,
 *                dropLocation, seatsBooked, rideDate, rideTime, ...
 */

const requiredEnvVars = ['FRONTEND_URL', 'NODE_ENV'];

requiredEnvVars.forEach(varName => {
  const isSet = !!process.env[varName];
  if (!isSet && process.env.NODE_ENV === 'production') {
    throw new Error(`CRITICAL: Missing environment variable ${varName}`);
  }
});

// ─── Utilities ────────────────────────────────────────────────────────────────

const getCorrelationId = () => crypto.randomBytes(4).toString('hex').toUpperCase();

const buildAction = (template, payload) => ({ template, payload });

const fmtIST = (date) =>
  moment(date || new Date()).utcOffset('+05:30').format('D MMM YYYY [at] h:mm A [IST]');

// ─── Calendar Event ───────────────────────────────────────────────────────────

const generateCalendarEvent = (booking, ride, driver) => {
  const calendar = ical({ name: 'ShareMyRide Trip' });
  const rideDateTime = moment(`${ride.date} ${ride.time}`, 'YYYY-MM-DD HH:mm');

  calendar.createEvent({
    start: rideDateTime.toDate(),
    end: moment(rideDateTime).add(2, 'hours').toDate(),
    summary: `Ride: ${booking.pickupLocation} → ${booking.dropLocation}`,
    description: [
      'ShareMyRide Trip Details',
      '',
      `Driver: ${driver.name}`,
      `Phone: ${driver.phone}`,
      `Vehicle: ${ride.vehicleModel || 'N/A'} (${ride.vehicleNumber || 'N/A'})`,
      '',
      `Pickup: ${booking.pickupLocation}`,
      `Drop: ${booking.dropLocation}`,
      `Seats: ${booking.seatsBooked}`,
      '',
      `Booking ID: ${booking._id}`,
      `Payment: ₹${(booking.finalAmount || booking.totalFare || booking.baseFare || 0).toFixed(2)} (Paid)`,
    ].join('\n'),
    location: booking.pickupLocation,
    url: `${process.env.FRONTEND_URL}/my-bookings`,
    organizer: {
      name: 'ShareMyRide',
      email: process.env.EMAIL_USER || 'no-reply@sharemyride.app',
    },
    alarms: [
      { type: 'display', trigger: 24 * 60 },
      { type: 'display', trigger: 60 },
    ],
  });

  return calendar.toString();
};

// ─── Booking Confirmation ─────────────────────────────────────────────────────

const sendBookingConfirmationEmails = async (booking, ride, driver, passenger) => {
  const cid = getCorrelationId();
  try {
    const calendarContent = generateCalendarEvent(booking, ride, driver);
    const icsBase64 = Buffer.from(calendarContent).toString('base64');

    const baseFare = booking.baseFare || 0;
    const platformFee = baseFare * 0.08;
    const gst = platformFee * 0.18;
    const totalAmount = baseFare + platformFee + gst;
    const driverGets = baseFare - platformFee - gst;

    const shared = {
      bookingId: String(booking._id),
      pickupLocation: booking.pickupLocation,
      dropLocation: booking.dropLocation,
      seatsBooked: booking.seatsBooked,
      rideDate: moment(ride.date).format('dddd, D MMMM YYYY'),
      rideTime: ride.time,
      vehicleModel: ride.vehicleModel || 'N/A',
      vehicleNumber: ride.vehicleNumber || 'N/A',
      baseFare: baseFare.toFixed(2),
      platformFee: platformFee.toFixed(2),
      gst: gst.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      driverReceives: driverGets.toFixed(2),
      paymentMethod: 'Razorpay',
      transactionId: booking.razorpayPaymentId || 'N/A',
      paymentDate: fmtIST(booking.paymentCompletedAt),
      bookingUrl: `${process.env.FRONTEND_URL}/my-bookings`,
      icsAttachmentBase64: icsBase64,
      icsFilename: 'ride-calendar-invite.ics',
    };

    return {
      success: true,
      emailAction: {
        emails: [
          buildAction('booking-confirmation-passenger', {
            ...shared,
            recipientRole: 'passenger',
            to_email: passenger.email,
            to_name: passenger.name,
            driver_name: driver.name,
            driver_phone: driver.phone,
          }),
          buildAction('booking-confirmation-driver', {
            ...shared,
            recipientRole: 'driver',
            to_email: driver.email,
            to_name: driver.name,
            passenger_name: passenger.name,
            passenger_phone: passenger.phone,
          }),
        ],
      },
    };
  } catch (error) {
    console.error(`[${cid}] sendBookingConfirmationEmails failed:`, error);
    throw error;
  }
};

// ─── Verification Email ───────────────────────────────────────────────────────

const sendVerificationEmail = async (email, name, verificationLink) => {
  const cid = getCorrelationId();
  try {
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
    console.error(`[${cid}] sendVerificationEmail failed:`, error);
    throw error;
  }
};

// ─── Password Reset ───────────────────────────────────────────────────────────

const sendPasswordResetEmail = async (email, name, resetToken) => {
  const cid = getCorrelationId();
  try {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?email=${encodeURIComponent(email)}&code=${resetToken}`;
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
    console.error(`[${cid}] sendPasswordResetEmail failed:`, error);
    throw error;
  }
};

// ─── Welcome Email ────────────────────────────────────────────────────────────

const sendWelcomeEmail = async (email, name) => {
  const cid = getCorrelationId();
  try {
    return {
      success: true,
      emailAction: buildAction('welcome', {
        to_email: email,
        to_name: name || 'there',
      }),
    };
  } catch (error) {
    console.error(`[${cid}] sendWelcomeEmail failed:`, error);
    throw error;
  }
};

// ─── Inquiry: User Confirmation ───────────────────────────────────────────────

/**
 * Returns emailAction for the user-facing ticket acknowledgment.
 * Template: VITE_EMAILJS_TEMPLATE_USER_CONFIRMATION
 */
const sendUserConfirmationEmail = async (inquiry) => {
  const cid = getCorrelationId();
  try {
    const typeName = (inquiry.type || inquiry.inquiryType || '').replace(/_/g, ' ');

    const etaMap = {
      critical: '4–6 hours',
      high: '12–24 hours',
      medium: '24–48 hours',
      low: '48–72 hours',
    };
    const estimatedResponseTime = etaMap[inquiry.priority] || '24–48 hours';

    const messagePreview = (inquiry.message || '').substring(0, 200) +
      ((inquiry.message || '').length > 200 ? '...' : '');

    const emailAction = buildAction('user-confirmation', {
      to_email: inquiry.email,
      to_name: inquiry.name,
      ticketId: inquiry.ticketNumber || inquiry.ticketId,
      subject: inquiry.subject,
      inquiryTypeName: typeName || 'General Inquiry',
      messagePreview,
      estimatedResponseTime,
      submittedAt: fmtIST(inquiry.createdAt || new Date()),
      platformUrl: process.env.FRONTEND_URL || 'https://sharemyride.in',
    });

    if (inquiry.emailsSent) {
      inquiry.emailsSent.confirmationEmail = true;
      inquiry.emailsSent.confirmationEmailAt = new Date();
    }

    return { success: true, emailAction };
  } catch (error) {
    console.error(`[${cid}] sendUserConfirmationEmail failed:`, error);
  }
};

// ─── Inquiry: Admin Alert (NEW inquiry notification to admin) ─────────────────

/**
 * Template: VITE_EMAILJS_TEMPLATE_ADMIN_ALERT
 */
const sendAdminNotificationEmail = async ({
  to,
  ticketNumber,
  type,
  priority,
  name,
  email,
  subject,
  message,
  meta,
}) => {
  const cid = getCorrelationId();
  try {
    const adminEmail = process.env.EMAIL_USER ||
      process.env.EMAIL_CONTACT ||
      'sharemyride.contact@gmail.com';

    const dashboardUrl = `${process.env.FRONTEND_URL || 'https://sharemyride.in'}/admin/dashboard`;

    const priorityLabel = {
      critical: 'CRITICAL',
      high: 'HIGH',
      urgent: 'URGENT',
      medium: 'MEDIUM',
      low: 'LOW',
    }[priority] || priority?.toUpperCase() || 'MEDIUM';

    const emailAction = buildAction('admin-alert', {
      to_email: to || adminEmail,
      ticketId: ticketNumber,
      fromName: name,
      fromEmail: email,
      fromPhone: meta?.phone || '',
      inquiryType: (type || '').replace(/_/g, ' '),
      priority: priorityLabel,
      subject,
      message: (message || '').substring(0, 500) + ((message || '').length > 500 ? '...' : ''),
      submittedAt: fmtIST(new Date()),
      dashboardUrl,
      affectedPage: meta?.affectedPage || '',
      severity: meta?.severity || '',
    });

    return { success: true, emailAction };
  } catch (error) {
    console.error(`[${cid}] sendAdminNotificationEmail failed:`, error);
  }
};

const sendBusinessNotificationToAdmin = async (inquiry) => {
  return sendAdminNotificationEmail({
    to: process.env.EMAIL_USER || 'sharemyride.contact@gmail.com',
    ticketNumber: inquiry.ticketNumber || inquiry.ticketId,
    type: inquiry.type || inquiry.inquiryType,
    priority: inquiry.priority,
    name: inquiry.name,
    email: inquiry.email,
    subject: inquiry.subject,
    message: inquiry.message,
    meta: inquiry.meta || {},
  });
};

// ─── Inquiry: Admin Reply to User ─────────────────────────────────────────────

/**
 * Template: VITE_EMAILJS_TEMPLATE_ADMIN_REPLY
 */
const sendInquiryReplyEmail = async (inquiry, replyMessage, adminName) => {
  const cid = getCorrelationId();
  try {
    const emailAction = buildAction('admin-reply', {
      to_email: inquiry.email,
      to_name: inquiry.name,
      ticketId: inquiry.ticketNumber || inquiry.ticketId,
      subject: inquiry.subject,
      replyMessage,
      originalMessage: (inquiry.message || '').substring(0, 300) +
        ((inquiry.message || '').length > 300 ? '...' : ''),
      adminName: adminName || 'ShareMyRide Support',
      sentAt: fmtIST(new Date()),
      platformUrl: process.env.FRONTEND_URL || 'https://sharemyride.in',
    });

    return { success: true, emailAction };
  } catch (error) {
    console.error(`[${cid}] sendInquiryReplyEmail failed:`, error);
  }
};

// ─── Inquiry/Report: Admin Sync Confirmation ──────────────────────────────────

/**
 * Template: VITE_EMAILJS_TEMPLATE_ADMIN_SYNC
 */
const sendAdminSyncNotification = async (inquiry, { oldStatus, newStatus, replyMessage, adminName } = {}) => {
  const cid = getCorrelationId();
  try {
    const adminEmail = process.env.EMAIL_USER ||
      process.env.EMAIL_CONTACT ||
      'sharemyride.contact@gmail.com';

    const emailAction = buildAction('admin-sync', {
      to_email: adminEmail,
      ticketId: inquiry.ticketNumber || inquiry.ticketId,
      userEmail: inquiry.email,
      userName: inquiry.name,
      oldStatus: oldStatus || '—',
      newStatus: newStatus || inquiry.status,
      replyMessage: replyMessage
        ? (replyMessage.substring(0, 300) + (replyMessage.length > 300 ? '...' : ''))
        : '(status change only — no reply text sent)',
      adminName: adminName || 'ShareMyRide Support',
      actionAt: fmtIST(new Date()),
      dashboardUrl: `${process.env.FRONTEND_URL || 'https://sharemyride.in'}/admin/dashboard`,
    });

    return { success: true, emailAction };
  } catch (error) {
    console.error(`[${cid}] sendAdminSyncNotification failed:`, error);
  }
};

// ─── Inquiry/Report: Combined Status + Reply Update ───────────────────────────  // NEW — fixes the missing export

/**
 * THIS IS THE FUNCTION adminController.updateEnquiry() calls. It previously
 * did not exist in this file, which meant every admin reply/status-change
 * silently threw inside the controller's try/catch — the inquiry saved to
 * the DB, but NO email ever fired (to user or admin), and no error surfaced
 * to the dashboard.
 *
 * It composes:
 *   - a user-facing reply email  (only if replyMessage was provided)  → 'admin-reply' template
 *   - an admin sync confirmation (always)                             → 'admin-sync' template
 *
 * Returns emailActions in the SHAPE the admin dashboard already expects:
 *   { emailActions: { user, admin } }
 * The controller maps these to { userNotification, adminSync } for the
 * frontend's fireEmailActions() helper.
 */
const sendStatusReplyUpdate = async (inquiry, { oldStatus, newStatus, replyMessage, adminName } = {}) => {
  const cid = getCorrelationId();
  try {
    let userAction = null;
    if (replyMessage && replyMessage.trim()) {
      const userResult = await sendInquiryReplyEmail(inquiry, replyMessage.trim(), adminName);
      userAction = userResult?.emailAction || null;
    }

    const adminResult = await sendAdminSyncNotification(inquiry, {
      oldStatus,
      newStatus,
      replyMessage,
      adminName,
    });
    const adminAction = adminResult?.emailAction || null;

    return {
      success: true,
      emailActions: {
        user: userAction,
        admin: adminAction,
      },
    };
  } catch (error) {
    console.error(`[${cid}] sendStatusReplyUpdate failed:`, error);
    return { success: false, emailActions: { user: null, admin: null } };
  }
};

// ─── Blog Status ──────────────────────────────────────────────────────────────

const sendBlogStatusNotification = async (blogPost, status, remark) => {
  const cid = getCorrelationId();
  try {
    return {
      success: true,
      emailAction: buildAction('blog-status', {
        to_email: blogPost.author?.email,
        to_name: blogPost.author?.name || 'Author',
        blogTitle: blogPost.title,
        status,
        remark: remark || null,
        isApproved: status === 'published',
      }),
    };
  } catch (error) {
    console.error(`[${cid}] sendBlogStatusNotification failed:`, error);
  }
};

// ─── Legacy / misc ────────────────────────────────────────────────────────────

const sendInquiryReceivedEmail = sendUserConfirmationEmail;
const sendInquiryNotificationToAdmin = sendAdminNotificationEmail;

const sendTestEmail = async (toEmail) => {
  const cid = getCorrelationId();
  return {
    success: true,
    correlationId: cid,
    emailAction: buildAction('diagnostic-test', {
      to_email: toEmail,
      correlationId: cid,
      timestamp: new Date().toISOString(),
    }),
  };
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  // Booking
  sendBookingConfirmationEmails,

  // Auth
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,

  // Inquiry — user submission flow
  sendUserConfirmationEmail,
  sendAdminNotificationEmail,
  sendBusinessNotificationToAdmin,

  // Inquiry — admin action flow
  sendInquiryReplyEmail,
  sendAdminSyncNotification,
  sendStatusReplyUpdate,       // NEW — required by adminController.updateEnquiry

  // Blog
  sendBlogStatusNotification,

  // Legacy / misc
  sendInquiryReceivedEmail,
  sendInquiryNotificationToAdmin,
  sendTestEmail,
};