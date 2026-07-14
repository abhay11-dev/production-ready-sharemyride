import emailjs from '@emailjs/browser';

// ─────────────────────────────────────────────────────────
// Config — all values come from frontend .env (see .env.example)
// ─────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'https://production-ready-sharemyride.onrender.com/api';

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const EMAILJS_TEMPLATE_SIGNUP_OTP = import.meta.env.VITE_EMAILJS_TEMPLATE_SIGNUP_OTP;
const EMAILJS_TEMPLATE_RESET_OTP = import.meta.env.VITE_EMAILJS_TEMPLATE_RESET_OTP;

const APP_NAME = import.meta.env.VITE_APP_NAME || 'ShareMyRide';
const OTP_EXPIRY_MINUTES = import.meta.env.VITE_OTP_EXPIRY_MINUTES || '10';

emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

// ─────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────
async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Something went wrong. Please try again.');
    err.status = res.status;
    err.retryAfter = data.retryAfter;
    throw err;
  }
  return data;
}

/**
 * Sends an OTP email via EmailJS.
 * Backend is expected to generate + persist the OTP and return it in the
 * response payload (field: `otp`) so the frontend can relay it through EmailJS.
 *
 * Template variables sent to EmailJS (map these in your EmailJS template):
 *   to_email        - recipient email address (bind to the "To email" field)
 *   to_name         - recipient's name
 *   otp_code        - the 6-digit code
 *   app_name        - product name shown in the email
 *   expiry_minutes  - how long the code is valid for
 */
async function sendOtpEmail({ templateId, toEmail, toName, otp }) {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_PUBLIC_KEY || !templateId) {
    console.warn('EmailJS is not fully configured — skipping client-side email send.');
    return;
  }
  await emailjs.send(EMAILJS_SERVICE_ID, templateId, {
    to_email: toEmail,
    to_name: toName || 'there',
    otp_code: otp,
    app_name: APP_NAME,
    expiry_minutes: OTP_EXPIRY_MINUTES,
  });
}

// ─────────────────────────────────────────────────────────
// Signup + email/OTP verification
// ─────────────────────────────────────────────────────────

/**
 * Creates the account and triggers a signup OTP.
 * Expected backend response: { name, email, otp, message? }
 */
export async function signupUser({ name, email, password }) {
  const data = await request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });

  if (data.otp) {
    await sendOtpEmail({
      templateId: EMAILJS_TEMPLATE_SIGNUP_OTP,
      toEmail: email,
      toName: name,
      otp: data.otp,
    });
  }

  return data;
}

/**
 * Re-sends a fresh signup OTP.
 * Expected backend response: { name, email, otp }
 */
export async function resendSignupOtp(email) {
  const data = await request('/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

  if (data.otp) {
    await sendOtpEmail({
      templateId: EMAILJS_TEMPLATE_SIGNUP_OTP,
      toEmail: email,
      toName: data.name,
      otp: data.otp,
    });
  }

  return data;
}

/**
 * Verifies the OTP the user typed in against what the backend stored.
 * On success, backend should mark the user as emailVerified / twoFAVerified: true.
 */
export async function verifySignupOtp(email, otp) {
  return request('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
}

export async function verifyEmail(token, email) {
  return request('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token, email }),
  });
}

// ─────────────────────────────────────────────────────────
// Login (unchanged — plain email + password)
// ─────────────────────────────────────────────────────────
export async function loginUser({ email, password }) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// ─────────────────────────────────────────────────────────
// Google Login
// ─────────────────────────────────────────────────────────
export async function googleLogin(token) {
  return request('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

// ─────────────────────────────────────────────────────────
// Forgot password — OTP request, OTP verify, then password reset
// ─────────────────────────────────────────────────────────

/**
 * Requests a password-reset OTP.
 * Expected backend response: { name, email, otp }
 */
export async function forgotPasswordSendOtp(email) {
  const data = await request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

  if (data.otp) {
    await sendOtpEmail({
      templateId: EMAILJS_TEMPLATE_RESET_OTP,
      toEmail: email,
      toName: data.name,
      otp: data.otp,
    });
  }

  return data;
}

/** Verifies the reset OTP before letting the user set a new password. */
export async function verifyResetOtp(email, otp) {
  return request('/auth/verify-reset-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
}

/** Sets the new password. No OTP email involved at this step. */
export async function resetPassword({ email, otp, newPassword }) {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, otp, newPassword }),
  });
}