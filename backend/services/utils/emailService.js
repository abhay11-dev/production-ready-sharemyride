const nodemailer = require('nodemailer');

// Try to import Resend (optional dependency)
let Resend;
try {
  Resend = require('resend').Resend;
} catch (e) {
  console.log('Resend not installed, will use fallback methods');
}

// Send password reset email with multiple fallback strategies
const sendPasswordResetEmail = async (email, name, resetCode) => {
  try {
    // Validate inputs
    if (!email || !name || !resetCode) {
      throw new Error('Missing required parameters: email, name, or resetCode');
    }

    // Strategy 1: Try Resend (HTTP API - most reliable for hosting platforms)
    if (process.env.RESEND_API_KEY && Resend) {
      console.log('Attempting to send email via Resend...');
      return await sendViaResend(email, name, resetCode);
    }

    // Strategy 2: Try SendGrid (SMTP)
    if (process.env.SENDGRID_API_KEY) {
      console.log('Attempting to send email via SendGrid...');
      return await sendViaSendGrid(email, name, resetCode);
    }

    // Strategy 3: Try Gmail (for local development)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      console.log('Attempting to send email via Gmail...');
      return await sendViaGmail(email, name, resetCode);
    }

    // Strategy 4: Fallback - Log to console (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ NO EMAIL SERVICE CONFIGURED - CODE LOGGED BELOW ⚠️');
      console.log(`
========================================
PASSWORD RESET CODE FOR: ${email}
Name: ${name}
Code: ${resetCode}
========================================
      `);
      return { success: true, messageId: 'dev-mode-logged' };
    }

    throw new Error('No email service configured. Please set RESEND_API_KEY, SENDGRID_API_KEY, or EMAIL_USER/EMAIL_PASSWORD');

  } catch (error) {
    console.error('All email sending strategies failed:', error.message);
    throw error;
  }
};

// Method 1: Resend (HTTP API - Best for production)
const sendViaResend = async (email, name, resetCode) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { data, error } = await resend.emails.send({
      from: 'RideShare <onboarding@resend.dev>', // Use your verified domain or resend.dev
      to: email,
      subject: 'Password Reset Request - RideShare',
      html: getEmailHTML(name, resetCode),
      text: getEmailText(name, resetCode)
    });

    if (error) {
      throw new Error(`Resend API error: ${error.message}`);
    }

    console.log('Email sent via Resend:', data);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Resend error:', error);
    throw new Error(`Resend failed: ${error.message}`);
  }
};

// Method 2: SendGrid (SMTP)
const sendViaSendGrid = async (email, name, resetCode) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    });

    const info = await transporter.sendMail({
      from: `"RideShare" <${process.env.EMAIL_FROM || 'noreply@rideshare.com'}>`,
      to: email,
      subject: 'Password Reset Request - RideShare',
      html: getEmailHTML(name, resetCode),
      text: getEmailText(name, resetCode)
    });

    console.log('Email sent via SendGrid:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('SendGrid error:', error);
    throw new Error(`SendGrid failed: ${error.message}`);
  }
};

// Method 3: Gmail (Local development only)
const sendViaGmail = async (email, name, resetCode) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const info = await transporter.sendMail({
      from: `"RideShare" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request - RideShare',
      html: getEmailHTML(name, resetCode),
      text: getEmailText(name, resetCode)
    });

    console.log('Email sent via Gmail:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Gmail error:', error);
    throw new Error(`Gmail failed: ${error.message}`);
  }
};

// Email HTML template
const getEmailHTML = (name, resetCode) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #9333ea 0%, #a855f7 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          background: white;
          padding: 30px;
          border-radius: 0 0 10px 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .code-box {
          background: #f3e8ff;
          border: 2px dashed #9333ea;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
          border-radius: 8px;
        }
        .code {
          font-size: 32px;
          font-weight: bold;
          color: #9333ea;
          letter-spacing: 8px;
          font-family: 'Courier New', monospace;
        }
        .warning {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .warning strong {
          display: block;
          margin-bottom: 10px;
        }
        .warning ul {
          margin: 0;
          padding-left: 20px;
        }
        .warning li {
          margin: 5px 0;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          color: #666;
          font-size: 12px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${name}</strong>,</p>
          <p>We received a request to reset your password for your RideShare account.</p>
          
          <p style="margin-top: 20px;">Your verification code is:</p>
          
          <div class="code-box">
            <div class="code">${resetCode}</div>
          </div>
          
          <p>Enter this code in the password reset page to continue.</p>
          
          <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul>
              <li>This code will expire in 15 minutes</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>Never share this code with anyone</li>
            </ul>
          </div>
          
          <p>If you have any questions, feel free to contact our support team.</p>
          
          <p style="margin-top: 30px;">Best regards,<br><strong>The RideShare Team</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply.</p>
          <p>&copy; ${new Date().getFullYear()} RideShare. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Email plain text template
const getEmailText = (name, resetCode) => {
  return `
Hello ${name},

We received a request to reset your password for your RideShare account.

Your verification code is: ${resetCode}

Enter this code in the password reset page to continue.

Important:
• This code will expire in 15 minutes
• If you didn't request this reset, please ignore this email
• Never share this code with anyone

Best regards,
The RideShare Team

---
This is an automated email. Please do not reply.
© ${new Date().getFullYear()} RideShare. All rights reserved.
  `.trim();
};

module.exports = {
  sendPasswordResetEmail
};