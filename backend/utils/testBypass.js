/**
 * TEST BYPASS UTILITY
 * ─────────────────────────────────────────────────────────────────────────────
 * Allows the two designated test accounts to skip ALL verification gates:
 *  - Email verification
 *  - Driver verification / document upload
 *  - Account lockout
 *
 * This file reads TEST_USER_EMAIL and TEST_USER_2_EMAIL from .env.
 * It NEVER executes in production (NODE_ENV === 'production').
 *
 * Usage:
 *   const { isTestUser } = require('../utils/testBypass');
 *   if (isTestUser(email)) { // skip verification }
 */

const TEST_EMAILS = new Set(
  [
    process.env.TEST_USER_EMAIL,
    process.env.TEST_USER_2_EMAIL,
  ]
    .filter(Boolean)
    .map((e) => e.toLowerCase().trim())
);

/**
 * Returns true if the given email belongs to a test account AND we are NOT
 * in a production environment.
 *
 * @param {string} email
 * @returns {boolean}
 */
const isTestUser = (email) => {
  if (process.env.NODE_ENV === 'production') return false;
  if (!email) return false;
  return TEST_EMAILS.has(email.toLowerCase().trim());
};

module.exports = { isTestUser, TEST_EMAILS };
