/**
 * Business Email Service
 * Handles professional HTML emails for business communications
 * - Admin/Founder notifications
 * - User confirmation emails
 * - Support ticket emails
 * - Report notifications
 */

const resend = require('../config/resend');
const crypto = require('crypto');

const BUSINESS_EMAIL = process.env.BUSINESS_EMAIL || 'sharemyride.contact@gmail.com';
const SENDER_EMAIL = process.env.EMAIL_USER || 'noreply@sharemyride.com';
const SENDER_NAME = process.env.EMAIL_FROM_NAME || 'ShareMyRide';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://sharemyride.com';

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const getCorrelationId = () => crypto.randomBytes(4).toString('hex').toUpperCase();

const getPriorityColor = (priority) => {
  const colors = {
    'low': '#10b981',
    'medium': '#f59e0b',
    'high': '#ef4444',
    'critical': '#dc2626',
    'urgent': '#7c3aed'
  };
  return colors[priority] || '#6366f1';
};

const getPriorityBgColor = (priority) => {
  const colors = {
    'low': '#d1fae5',
    'medium': '#fef3c7',
    'high': '#fee2e2',
    'critical': '#fecaca',
    'urgent': '#ede9fe'
  };
  return colors[priority] || '#e0e7ff';
};

const getTypeIcon = (inquiryType) => {
  const icons = {
    'contact': '💬',
    'support': '🆘',
    'help_request': '❓',
    'issue_report': '🐛',
    'partnership': '🤝',
    'corporate': '🏢',
    'sponsorship': '🎯',
    'media': '📰',
    'community_feedback': '💭',
    'feedback': '⭐',
    'feature_request': '✨',
    'blog_submission': '📝',
    'blog_report': '🚩',
    'comment_report': '💬',
    'user_report': '👤',
    'ride_report': '🚗',
    'safety_concern': '🚨',
    'fraud_report': '🔒',
    'security_issue': '🛡️',
    'guideline_violation': '⚖️',
    'account_request': '👤',
    'data_request': '📊',
    'deletion_request': '🗑️',
    'bug': '🐛',
    'technical_issue': '⚙️',
    'other': '📌'
  };
  return icons[inquiryType] || '📧';
};

// ═══════════════════════════════════════════════════════════════════════════════
// BUSINESS NOTIFICATION EMAIL - Admin/Founder
// ═══════════════════════════════════════════════════════════════════════════════

const createBusinessNotificationHTML = (inquiry, dashboardLink) => {
  const priorityColor = getPriorityColor(inquiry.priority);
  const priorityBgColor = getPriorityBgColor(inquiry.priority);
  const typeIcon = getTypeIcon(inquiry.inquiryType);
  
  const formattedDate = new Date(inquiry.createdAt).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Ticket: ${inquiry.ticketId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #f3f4f6; color: #1f2937; line-height: 1.5; }
    .wrapper { background: #f3f4f6; padding: 20px; }
    .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; color: white; text-align: center; }
    .header-title { font-size: 24px; font-weight: 700; margin-bottom: 5px; }
    .header-subtitle { font-size: 14px; opacity: 0.9; }
    
    .ticket-header { padding: 25px 30px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
    .ticket-id { font-size: 18px; font-weight: 600; color: #1f2937; }
    .ticket-badge { background: ${priorityBgColor}; color: ${priorityColor}; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    
    .content { padding: 30px; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
    .info-item { background: #f9fafb; padding: 12px; border-radius: 8px; border-left: 3px solid #667eea; }
    .info-label { font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 3px; }
    .info-value { font-size: 14px; color: #1f2937; font-weight: 500; word-break: break-all; }
    
    .message-box { background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; max-height: 300px; overflow-y: auto; }
    
    .metadata { background: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 13px; color: #6b7280; }
    .metadata-row { display: flex; justify-content: space-between; padding: 5px 0; }
    
    .action-buttons { display: flex; gap: 12px; margin-top: 25px; }
    .btn { display: inline-block; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; text-align: center; flex: 1; }
    .btn-primary { background: #667eea; color: white; }
    .btn-primary:hover { background: #5568d3; }
    .btn-secondary { background: #e5e7eb; color: #374151; }
    .btn-secondary:hover { background: #d1d5db; }
    
    .footer { background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
    .footer-link { color: #667eea; text-decoration: none; }
    
    @media (max-width: 600px) {
      .info-grid { grid-template-columns: 1fr; }
      .ticket-header { flex-direction: column; text-align: center; gap: 12px; }
      .action-buttons { flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <div class="header-title">🚗 New Business Notification</div>
        <div class="header-subtitle">ShareMyRide Operations Dashboard</div>
      </div>

      <!-- Ticket Header -->
      <div class="ticket-header">
        <div class="ticket-id">${inquiry.ticketId}</div>
        <div class="ticket-badge">${inquiry.priority.toUpperCase()}</div>
      </div>

      <!-- Content -->
      <div class="content">
        <!-- Submission Details -->
        <div class="section">
          <div class="section-title">${typeIcon} Submission Details</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Type</div>
              <div class="info-value">${inquiry.inquiryType.replace(/_/g, ' ').toUpperCase()}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Status</div>
              <div class="info-value">${inquiry.status.replace(/_/g, ' ').toUpperCase()}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Submitted</div>
              <div class="info-value">${formattedDate}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Reference</div>
              <div class="info-value">${inquiry.ticketId}</div>
            </div>
          </div>
        </div>

        <!-- User Information -->
        <div class="section">
          <div class="section-title">👤 From</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Name</div>
              <div class="info-value">${inquiry.name}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Email</div>
              <div class="info-value">${inquiry.email}</div>
            </div>
            ${inquiry.phone ? `
            <div class="info-item">
              <div class="info-label">Phone</div>
              <div class="info-value">${inquiry.phone}</div>
            </div>
            ` : ''}
            ${inquiry.userId ? `
            <div class="info-item">
              <div class="info-label">User ID</div>
              <div class="info-value">${inquiry.userId}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- Subject & Message -->
        <div class="section">
          <div class="section-title">📨 Message</div>
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
            <div style="font-size: 14px; font-weight: 600; color: #1f2937; margin-bottom: 10px;">Subject:</div>
            <div style="font-size: 14px; color: #374151;">${inquiry.subject}</div>
          </div>
          <div class="message-box">${inquiry.message}</div>
        </div>

        <!-- Metadata -->
        ${inquiry.metadata && (inquiry.metadata.userAgent || inquiry.metadata.ipAddress) ? `
        <div class="section">
          <div class="section-title">🔍 Metadata</div>
          <div class="metadata">
            ${inquiry.metadata.ipAddress ? `<div class="metadata-row"><span>IP Address:</span><span>${inquiry.metadata.ipAddress}</span></div>` : ''}
            ${inquiry.metadata.browser ? `<div class="metadata-row"><span>Browser:</span><span>${inquiry.metadata.browser}</span></div>` : ''}
            ${inquiry.metadata.osInfo ? `<div class="metadata-row"><span>OS:</span><span>${inquiry.metadata.osInfo}</span></div>` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Action Buttons -->
        <div class="action-buttons">
          <a href="${dashboardLink}" class="btn btn-primary">📊 View in Dashboard</a>
          <a href="mailto:${inquiry.email}?subject=Re: ${inquiry.ticketId}" class="btn btn-secondary">✉️ Reply</a>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>This is an automated notification from ShareMyRide operations system.</p>
        <p style="margin-top: 10px;">
          <a href="${FRONTEND_URL}/admin/inquiries" class="footer-link">Admin Dashboard</a> •
          <a href="${FRONTEND_URL}/founder/inbox" class="footer-link">Founder Inbox</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

// ═══════════════════════════════════════════════════════════════════════════════
// USER CONFIRMATION EMAIL
// ═══════════════════════════════════════════════════════════════════════════════

const createUserConfirmationHTML = (inquiry) => {
  const formattedDate = new Date(inquiry.createdAt).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });

  const typeDescriptions = {
    'contact': 'Your contact message has been received.',
    'support': 'Your support request has been received.',
    'help_request': 'Your help request has been received.',
    'issue_report': 'Your issue report has been received and our team will investigate.',
    'partnership': 'Your partnership inquiry has been received. Our business team will review it.',
    'corporate': 'Your corporate inquiry has been received.',
    'safety_concern': 'Your safety concern has been received and will be prioritized.',
    'fraud_report': 'Your fraud report has been received and will be investigated immediately.',
    'account_request': 'Your account request has been received.',
    'bug': 'Your bug report has been received.',
    'feedback': 'Thank you for your feedback!',
    'other': 'Your message has been received.'
  };

  const description = typeDescriptions[inquiry.inquiryType] || 'Your message has been received.';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>We Received Your Request</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #f3f4f6; color: #1f2937; }
    .wrapper { background: #f3f4f6; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; color: white; text-align: center; }
    .logo { font-size: 28px; font-weight: 800; margin-bottom: 10px; }
    .header-text { font-size: 18px; font-weight: 600; }
    
    .content { padding: 40px 30px; line-height: 1.6; }
    .greeting { font-size: 18px; font-weight: 600; margin-bottom: 15px; }
    .message { color: #374151; font-size: 15px; margin-bottom: 20px; }
    
    .ticket-box { background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center; }
    .ticket-label { font-size: 12px; color: #059669; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
    .ticket-id { font-family: 'Courier New', monospace; font-size: 20px; font-weight: 700; color: #047857; }
    
    .timeline { margin: 25px 0; }
    .timeline-item { display: flex; gap: 15px; margin-bottom: 15px; }
    .timeline-marker { flex-shrink: 0; width: 40px; height: 40px; background: #f0fdf4; border: 2px solid #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; }
    .timeline-content { flex: 1; }
    .timeline-title { font-weight: 600; color: #1f2937; }
    .timeline-text { font-size: 14px; color: #6b7280; margin-top: 3px; }
    
    .support-info { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 14px; color: #374151; }
    .support-title { font-weight: 600; margin-bottom: 8px; }
    .support-links { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
    .support-link { color: #667eea; text-decoration: none; font-weight: 500; }
    
    .footer { background: #f9fafb; padding: 25px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
    .footer-text { margin: 5px 0; }
    
    @media (max-width: 600px) {
      .timeline-item { gap: 12px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <div class="logo">🚗 ShareMyRide</div>
        <div class="header-text">Request Received</div>
      </div>

      <!-- Content -->
      <div class="content">
        <div class="greeting">Hello ${inquiry.name},</div>
        
        <div class="message">
          ${description} We appreciate you reaching out and will get back to you shortly.
        </div>

        <!-- Ticket Reference -->
        <div class="ticket-box">
          <div class="ticket-label">Your Reference Number</div>
          <div class="ticket-id">${inquiry.ticketId}</div>
        </div>

        <!-- Request Details -->
        <div class="section">
          <div style="font-weight: 600; color: #1f2937; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Request Details</div>
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; font-size: 14px; color: #374151; line-height: 1.6;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="color: #6b7280;">Type:</span>
              <span style="font-weight: 500;">${inquiry.inquiryType.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="color: #6b7280;">Subject:</span>
              <span style="font-weight: 500; text-align: right;">${inquiry.subject}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
              <span style="color: #6b7280;">Submitted:</span>
              <span style="font-weight: 500;">${formattedDate}</span>
            </div>
          </div>
        </div>

        <!-- What to expect -->
        <div class="timeline" style="margin-top: 30px;">
          <div style="font-weight: 600; color: #1f2937; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">What Happens Next</div>
          
          <div class="timeline-item">
            <div class="timeline-marker">1️⃣</div>
            <div class="timeline-content">
              <div class="timeline-title">Verification</div>
              <div class="timeline-text">Our team verifies and reviews your request immediately.</div>
            </div>
          </div>

          <div class="timeline-item">
            <div class="timeline-marker">2️⃣</div>
            <div class="timeline-content">
              <div class="timeline-title">Assignment</div>
              <div class="timeline-text">Your case is assigned to the appropriate specialist.</div>
            </div>
          </div>

          <div class="timeline-item">
            <div class="timeline-marker">3️⃣</div>
            <div class="timeline-content">
              <div class="timeline-title">Response</div>
              <div class="timeline-text">We'll respond within 24-48 hours with an update.</div>
            </div>
          </div>
        </div>

        <!-- Support Info -->
        <div class="support-info">
          <div class="support-title">📞 Need Immediate Help?</div>
          <div>Contact our support team anytime at <strong>${BUSINESS_EMAIL}</strong></div>
          <div class="support-links">
            <a href="${FRONTEND_URL}/help" class="support-link">Help Center</a>
            <a href="${FRONTEND_URL}/faq" class="support-link">FAQs</a>
            <a href="${FRONTEND_URL}/contact" class="support-link">Contact Us</a>
          </div>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280; line-height: 1.6;">
          <strong>Keep this reference number safe.</strong> Use <strong>${inquiry.ticketId}</strong> in any future communications about this request. This helps our team quickly locate your case.
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <div class="footer-text">© ${new Date().getFullYear()} ShareMyRide. All rights reserved.</div>
        <div class="footer-text" style="margin-top: 12px; font-size: 11px; color: #9ca3af;">
          This is an automated message. Please do not reply directly to this email. Use your reference number to track your request.
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

// ═══════════════════════════════════════════════════════════════════════════════
// SEND FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send business notification to admin/founder
 */
const sendBusinessNotificationEmail = async (inquiry, dashboardLink) => {
  const cid = getCorrelationId();
  try {
    console.log(`[${cid}] Sending business notification for ${inquiry.ticketId}`);

    const html = createBusinessNotificationHTML(inquiry, dashboardLink);
    
    const mailOptions = {
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: BUSINESS_EMAIL,
      subject: `[${inquiry.priority.toUpperCase()}] ${inquiry.ticketId}: ${inquiry.subject}`,
      html: html,
    };

    const result = await resend.emails.send(mailOptions);

    if (result.error) {
      throw new Error(`Failed to send business email: ${result.error.message}`);
    }

    console.log(`[${cid}] ✅ Business notification sent for ${inquiry.ticketId}`);
    return { success: true, emailId: result.data?.id, cid };
  } catch (error) {
    console.error(`[${cid}] ❌ Failed to send business notification:`, error);
    throw error;
  }
};

/**
 * Send user confirmation email
 */
const sendUserConfirmationEmail = async (inquiry) => {
  const cid = getCorrelationId();
  try {
    console.log(`[${cid}] Sending user confirmation for ${inquiry.ticketId} to ${inquiry.email}`);

    const html = createUserConfirmationHTML(inquiry);
    
    const mailOptions = {
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: inquiry.email,
      subject: `We received your request – Reference: ${inquiry.ticketId}`,
      html: html,
    };

    const result = await resend.emails.send(mailOptions);

    if (result.error) {
      throw new Error(`Failed to send user confirmation: ${result.error.message}`);
    }

    console.log(`[${cid}] ✅ User confirmation sent to ${inquiry.email}`);
    return { success: true, emailId: result.data?.id, cid };
  } catch (error) {
    console.error(`[${cid}] ❌ Failed to send user confirmation:`, error);
    throw error;
  }
};

/**
 * Send reply notification to user
 */
const sendReplyNotificationEmail = async (inquiry, replyMessage, senderName = 'ShareMyRide Support') => {
  const cid = getCorrelationId();
  try {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #f3f4f6; color: #1f2937; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; }
    .header { color: #667eea; margin-bottom: 20px; font-size: 18px; font-weight: 600; }
    .reply-box { background: #f9fafb; padding: 15px; border-left: 4px solid #667eea; border-radius: 4px; margin: 20px 0; white-space: pre-wrap; }
    .footer { font-size: 12px; color: #6b7280; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">📧 Response to your request (${inquiry.ticketId})</div>
    
    <p>Hello ${inquiry.name},</p>
    
    <p>Thank you for contacting ShareMyRide. We have a response to your request:</p>
    
    <div class="reply-box">${replyMessage}</div>
    
    <p>If you have any follow-up questions, please reply to this email with your reference number: <strong>${inquiry.ticketId}</strong></p>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} ShareMyRide. All rights reserved.</p>
      <p>This is an automated message. Please do not reply to this email. Use your reference number.</p>
    </div>
  </div>
</body>
</html>
    `;
    
    const mailOptions = {
      from: `${senderName} <${SENDER_EMAIL}>`,
      to: inquiry.email,
      subject: `Re: ${inquiry.subject} [${inquiry.ticketId}]`,
      html: html,
    };

    const result = await resend.emails.send(mailOptions);

    if (result.error) {
      throw new Error(`Failed to send reply notification: ${result.error.message}`);
    }

    console.log(`[${cid}] ✅ Reply notification sent to ${inquiry.email}`);
    return { success: true, emailId: result.data?.id, cid };
  } catch (error) {
    console.error(`[${cid}] ❌ Failed to send reply notification:`, error);
    throw error;
  }
};

/**
 * Send bulk digest email to founder
 */
const sendFounderDigestEmail = async (inquiries, summary) => {
  const cid = getCorrelationId();
  try {
    const itemsHtml = inquiries.map(inq => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          <strong>${inq.ticketId}</strong><br/>
          <small style="color: #6b7280;">${inq.inquiryType.replace(/_/g, ' ')}</small>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          ${inq.name}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          <span style="background: ${getPriorityBgColor(inq.priority)}; color: ${getPriorityColor(inq.priority)}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
            ${inq.priority.toUpperCase()}
          </span>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          <a href="${FRONTEND_URL}/founder/inbox/${inq._id}" style="color: #667eea; text-decoration: none; font-weight: 500;">View →</a>
        </td>
      </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #f3f4f6; }
    .container { max-width: 700px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; }
    .header { color: #667eea; margin-bottom: 20px; font-size: 20px; font-weight: 700; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin: 20px 0; }
    .summary-item { background: #f9fafb; padding: 15px; border-radius: 8px; text-align: center; }
    .summary-number { font-size: 28px; font-weight: 700; color: #667eea; }
    .summary-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .btn { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">🚗 ShareMyRide Founder Digest</div>
    
    <p>Hello Founder,</p>
    
    <p>Here's your daily digest of platform activity:</p>
    
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-number">${summary.new}</div>
        <div class="summary-label">New Submissions</div>
      </div>
      <div class="summary-item">
        <div class="summary-number">${summary.open}</div>
        <div class="summary-label">Open Issues</div>
      </div>
      <div class="summary-item">
        <div class="summary-number">${summary.critical}</div>
        <div class="summary-label">Critical</div>
      </div>
    </div>
    
    <h3>Recent Activity</h3>
    <table>
      <thead>
        <tr style="background: #f9fafb;">
          <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e5e7eb;">Ticket</th>
          <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e5e7eb;">From</th>
          <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e5e7eb;">Priority</th>
          <th style="text-align: right; padding: 10px; border-bottom: 2px solid #e5e7eb;">Action</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    
    <div style="text-align: center;">
      <a href="${FRONTEND_URL}/founder/inbox" class="btn">View Full Inbox</a>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: process.env.FOUNDER_EMAIL || BUSINESS_EMAIL,
      subject: `Daily Digest: ${summary.new} new submissions, ${summary.critical} critical`,
      html: html,
    };

    const result = await resend.emails.send(mailOptions);
    if (result.error) throw new Error(result.error.message);

    console.log(`[${cid}] ✅ Founder digest sent`);
    return { success: true, cid };
  } catch (error) {
    console.error(`[${cid}] ❌ Failed to send founder digest:`, error);
    throw error;
  }
};

module.exports = {
  sendBusinessNotificationEmail,
  sendUserConfirmationEmail,
  sendReplyNotificationEmail,
  sendFounderDigestEmail
};
