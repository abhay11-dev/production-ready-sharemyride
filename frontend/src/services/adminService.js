import axios from 'axios';

/**
 * ADMIN SERVICE
 *
 * ⚠️ RECONSTRUCTION NOTE:
 * I don't have your actual original adminService.js file — only the exports
 * your codebase visibly imports from it (`fetchRequests`, `updateRequestStatus`,
 * `adminAxios` in AdminDashboard.jsx). This file rebuilds those plus the NEW
 * additions needed for the enquiry/report reply + email-sync flow.
 *
 * If your real file has more exports than this (it likely does — things like
 * fetchVerificationDocument per the build guide, or other admin helpers),
 * copy this file's NEW section (marked below) into your actual file instead
 * of replacing it wholesale.
 */

const API_URL = import.meta.env.VITE_API_URL;

// ─── Admin axios instance — attaches adminToken from localStorage ─────────────
const adminAxios = axios.create({ baseURL: `${API_URL}/admin` });

adminAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminAxios.interceptors.response.use(
  (res) => res,
  (err) => {
    // Admin auth is separate from user auth — expired/invalid admin token
    // means re-login, there's no refresh flow for it.
    if (err.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('isAdminAuthenticated');
    }
    return Promise.reject(err);
  }
);

// ─── Auth ───────────────────────────────────────────────────────────────────

export const loginAdmin = (username, password) =>
  axios.post(`${API_URL}/admin/login`, { username, password }).then((r) => r.data);

// ─── Driver verification ────────────────────────────────────────────────────

export const fetchRequests = () =>
  adminAxios.get('/verifications').then((r) => r.data.data);

export const updateRequestStatus = (id, status, remark) =>
  adminAxios.put(`/verifications/${id}`, { status, remark }).then((r) => r.data);

export const fetchVerificationDocument = (id, documentType) =>
  adminAxios
    .get(`/verifications/${id}/document/${documentType}`, { responseType: 'blob' })
    .then((r) => ({ blob: r.data, contentType: r.headers['content-type'] || r.data.type }));

// ─── Enquiries / Reports — NEW ──────────────────────────────────────────────
// Both `contact_*` (Enquiries tab) and `report_*` (Reports tab) inquiry types
// live in the same Inquiry model and go through the same backend handler
// (adminController.updateEnquiry, aliased as updateReport). These two helpers
// call the same shape of endpoint so both tabs can share one UI component.
//
// Response shape from the backend:
//   {
//     success: true,
//     data: <updated Inquiry doc>,
//     message: '...',
//     emailActions: {
//       userNotification: { template, payload } | null,  // only if `reply` was sent
//       adminSync:        { template, payload },          // always present
//     }
//   }
// The caller (AdminDashboard.jsx) is responsible for firing emailjs.send()
// for each non-null entry in emailActions.

/**
 * Update an enquiry: change status and/or send a reply to the user.
 * @param {string} id - Inquiry _id
 * @param {{status?: string, reply?: string, adminName?: string}} payload
 */
export const updateEnquiryAction = (id, { status, reply, adminName } = {}) =>
  adminAxios.put(`/enquiries/${id}`, { status, reply, adminName }).then((r) => r.data);

/**
 * Update a report: change status and/or send a reply to the user.
 * Reports are Inquiry docs (type: report_*) — same backend handler as enquiries.
 * @param {string} id - Inquiry _id
 * @param {{status?: string, reply?: string, adminName?: string}} payload
 */
export const updateReportAction = (id, { status, reply, adminName } = {}) =>
  adminAxios.put(`/reports/${id}`, { status, reply, adminName }).then((r) => r.data);

// ─── Upcoming Rides & Reminder Scheduler ─────────────────────────────────────

/**
 * Fetch paginated list of upcoming rides (accepted + paid bookings, future dates).
 * @param {number} page  - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @returns {Promise<{ data: Array, pagination: object }>}
 */
export const fetchUpcomingRides = (page = 1, limit = 15) =>
  adminAxios
    .get('/upcoming-rides', { params: { page, limit } })
    .then((r) => r.data);

/**
 * Manually trigger the ride reminder check job.
 * Useful for testing the email reminder pipeline without waiting for the cron.
 * @returns {Promise<{ success: boolean, message: string, checkedAt: string }>}
 */
export const runReminderCheckNow = () =>
  adminAxios.post('/run-reminder-check').then((r) => r.data);

// ─── Export the raw instance too, for ad-hoc calls (as AdminDashboard.jsx does) ──
export { adminAxios };