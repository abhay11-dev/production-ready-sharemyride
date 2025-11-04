const nodemailer = require('nodemailer');

// Create transporter - works with both Gmail (local) and SendGrid (production)
const createTransporter = () => {
  // Check if SendGrid API key is available (production)
  if (process.env.SENDGRID_API_KEY) {
    console.log('Using SendGrid for email service');
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      },
      // Connection options for better reliability
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 10000
    });
  }
  
  // Fallback to Gmail (for local development)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    console.log('Using Gmail for email service');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      pool: true,
      maxConnections: 1
    });
  }

  throw new Error('Email service not configured. Set either SENDGRID_API_KEY or EMAIL_USER/EMAIL_PASSWORD');
};

// Send password reset email
const sendPasswordResetEmail = async (email, name, resetCode) => {
  try {
    // Validate inputs
    if (!email || !name || !resetCode) {
      throw new Error('Missing required parameters: email, name, or resetCode');
    }

    const transporter = createTransporter();
    
    // Determine sender email
    const fromEmail = process.env.EMAIL_FROM || 
                      process.env.EMAIL_USER || 
                      'noreply@rideshare.com';

    const mailOptions = {
      from: `"RideShare" <${fromEmail}>`,
      to: email,
      subject: 'Password Reset Request - RideShare',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
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
              font-family: monospace;
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
              
              <p>Your verification code is:</p>
              
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
              
              <p>Best regards,<br><strong>The RideShare Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>&copy; ${new Date().getFullYear()} RideShare. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      // Plain text fallback for email clients that don't support HTML
      text: `
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
      `.trim()
    };

    console.log(`Attempting to send email to: ${email}`);
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', {
      messageId: info.messageId,
      to: email,
      accepted: info.accepted
    });
    
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Email send error:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Provide helpful error messages
    if (error.message.includes('timeout') || error.code === 'ETIMEDOUT') {
      throw new Error('Email server connection timeout. Please ensure SENDGRID_API_KEY is set.');
    } else if (error.message.includes('Authentication failed') || error.code === 'EAUTH') {
      throw new Error('Email authentication failed. Check your API key or credentials.');
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to email server. SMTP may be blocked on this hosting platform.');
    } else {
      throw new Error(error.message || 'Failed to send email');
    }
  }
};

module.exports = {
  sendPasswordResetEmail
};