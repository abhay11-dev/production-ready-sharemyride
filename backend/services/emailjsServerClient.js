// services/emailjsServerClient.js
//
// EmailJS's browser SDK (`@emailjs/browser`) only works from a page load —
// there's no session to fire it from when a cron job wakes up at 3am to send
// a "ride in 1 hour" reminder. EmailJS's REST API supports this: pass your
// PRIVATE key as `accessToken` alongside the public key as `user_id`, and it
// will accept the request without an Origin header / strict-origin check.
//
// CRITICAL: EMAILJS_PRIVATE_KEY must only ever live in backend environment
// variables (no VITE_ prefix, never bundled into frontend code, never logged).
// Rotate it in the EmailJS dashboard if it's ever accidentally exposed.

const axios = require('axios');

const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';

const SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
const PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;

/**
 * Send a single email via EmailJS's REST API (server-side).
 * @param {string} templateId - EmailJS template ID (not the VITE_ env var name — the resolved ID)
 * @param {object} templateParams - key/value pairs matching the template's variables
 */
async function sendServerEmail(templateId, templateParams) {
    if (!SERVICE_ID || !PUBLIC_KEY || !PRIVATE_KEY) {
        throw new Error(
            'EmailJS server credentials missing — set EMAILJS_SERVICE_ID, EMAILJS_PUBLIC_KEY, and EMAILJS_PRIVATE_KEY in the backend .env'
        );
    }
    if (!templateId) {
        throw new Error('EmailJS templateId is required (check EMAILJS_TEMPLATE_RIDE_REMINDER env var is set)');
    }

    const response = await axios.post(
        EMAILJS_API_URL,
        {
            service_id: SERVICE_ID,
            template_id: templateId,
            user_id: PUBLIC_KEY,
            accessToken: PRIVATE_KEY,
            template_params: templateParams,
        },
        {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
        }
    );

    return response.data;
}

module.exports = { sendServerEmail };