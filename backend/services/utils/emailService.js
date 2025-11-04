const nodemailer = require('nodemailer');

// Create transporter with better error handling
const createTransporter = () => {
  // Validate environment variables
  if (!process.env.EMAIL_USER) {
    throw new Error('EMAIL_USER environment variable is not set');
  }
  
  if (!process.env.EMAIL_PASSWORD) {
    throw new Error('EMAIL_PASSWORD environment variable is not set');
  }

  // Log configuration (without sensitive data) for debugging
  console.log('Email service configuration:', {
    user: process.env.EMAIL_USER,
    service: 'gmail',
    hasPassword: !!process.env.EMAIL_PASSWORD
  });

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    // Add these options for better reliability
    pool: true,
    maxConnections: 1,
    maxMessages: 3,
    rateDelta: 1000,
    rateLimit: 3
  });
};

// Send password reset email
const sendPasswordResetEmail = async (email, name, resetCode) => {
  try {
    // Validate inputs
    if (!email || !name || !resetCode) {
      throw new Error('Missing required parameters: email, name, or resetCode');
    }

    const transporter = createTransporter();

    // Verify transporter configuration
    try {
      await transporter.verify();
      console.log('Email server connection verified');
    } catch (verifyError) {
      console.error('Email server verification failed:', verifyError.message);
      throw new Error(`Email server connection failed: ${verifyError.message}`);
    }

    const mailOptions = {
      from: `"RideShare" <${process.env.EMAIL_USER}>`,
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
            }
            .warning {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello ${name},</p>
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
              
              <p>Best regards,<br>The RideShare Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>&copy; 2024 RideShare. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      // Add plain text fallback
      text: `
        Hello ${name},
        
        We received a request to reset your password for your RideShare account.
        
        Your verification code is: ${resetCode}
        
        Enter this code in the password reset page to continue.
        
        Important:
        - This code will expire in 15 minutes
        - If you didn't request this reset, please ignore this email
        - Never share this code with anyone
        
        Best regards,
        The RideShare Team
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', {
      messageId: info.messageId,
      to: email,
      accepted: info.accepted,
      response: info.response
    });
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Detailed email error:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    
    // Throw more specific error messages
    if (error.message.includes('Invalid login')) {
      throw new Error('Email authentication failed. Please check EMAIL_USER and EMAIL_PASSWORD');
    } else if (error.message.includes('ECONNECTION') || error.message.includes('ETIMEDOUT')) {
      throw new Error('Cannot connect to email server. Check your network connection');
    } else if (error.code === 'EAUTH') {
      throw new Error('Email authentication failed. Make sure you are using an App Password for Gmail');
    } else {
      throw new Error(error.message || 'Failed to send email');
    }
  }
};

module.exports = {
  sendPasswordResetEmail
};