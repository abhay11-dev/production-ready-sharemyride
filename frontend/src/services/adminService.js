import axios from 'axios';



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

// ─── Enquiries / Reports ─────────────────────────────────────────────────────
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

// ─── Moderation ─────────────────────────────────────────────────────────────
// /api/moderation is mounted as its own router in server.js, a sibling of
// /api/admin, not nested under it — so it cannot go through `adminAxios`
// (baseURL `${API_URL}/admin`); a call like `adminAxios.get('/moderation/flags')`
// would resolve to `${API_URL}/admin/moderation/flags`, which doesn't exist.
// It still uses the same adminToken/protectAdmin auth, just a different base
// path, so it gets its own axios instance mirroring adminAxios exactly.
const moderationAxios = axios.create({ baseURL: `${API_URL}/moderation` });

moderationAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

moderationAxios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('isAdminAuthenticated');
    }
    return Promise.reject(err);
  }
);

/**
 * Aggregate moderation counts for the dashboard widget row.
 * GET /api/moderation/stats
 * @returns {Promise<{ success: boolean, data: { total, totalUnreviewed,
 *   totalAdminNotified, bySeverity, unreviewedBySeverity } }>}
 */
export const fetchModerationStats = () =>
  moderationAxios.get('/stats').then((r) => r.data);

/**
 * Fetch paginated, filterable moderation flags.
 * GET /api/moderation/flags
 * @param {{page?: number, limit?: number, severity?: string, reviewed?: 'true'|'false', conversation?: string}} params
 *   `severity` accepts a comma-separated list (e.g. "high,critical") per the
 *   backend controller; the frontend only ever sends one value at a time.
 * @returns {Promise<{ success: boolean, data: Array, pagination: object }>}
 */
export const fetchModerationFlags = (params = {}) =>
  moderationAxios.get('/flags', { params }).then((r) => r.data);

/**
 * Fetch a single moderation flag with full population — includes the
 * unmasked `originalText` and the conversation's passenger/driver detail
 * that the list endpoint doesn't populate.
 * GET /api/moderation/flags/:id
 */
export const fetchModerationFlagById = (id) =>
  moderationAxios.get(`/flags/${id}`).then((r) => r.data);

/**
 * Mark a flag reviewed (or re-reviewed), optionally attaching a note.
 * Note: the backend has no real admin User document to set `reviewedBy` to
 * (protectAdmin is a synthetic JWT payload, not a User row) — `adminName`
 * gets folded into `adminNote` server-side instead. See moderationController.js.
 * POST /api/moderation/flags/:id/review
 * @param {string} id
 * @param {{adminNote?: string, adminName?: string}} payload
 */
export const reviewModerationFlag = (id, { adminNote, adminName } = {}) =>
  moderationAxios.post(`/flags/${id}/review`, { adminNote, adminName }).then((r) => r.data);

// ─── Export the raw instances too, for ad-hoc calls (as AdminDashboard.jsx does) ──

/**
 * Send a warning email to a flagged message's sender. No account state
 * change — pairs with suspend/block/ban below for a real state change.
 * POST /api/moderation/flags/:id/warn
 */
export const warnModerationFlag = (id, { reason, adminName } = {}) =>
  moderationAxios.post(`/flags/${id}/warn`, { reason, adminName }).then((r) => r.data);

/**
 * Suspend the flagged message's sender. Reversible — an admin can set the
 * account back to ACTIVE from the Users tab.
 * POST /api/moderation/flags/:id/suspend
 */
export const suspendModerationFlag = (id, { reason, adminName } = {}) =>
  moderationAxios.post(`/flags/${id}/suspend`, { reason, adminName }).then((r) => r.data);

/**
 * Block the flagged message's sender.
 * POST /api/moderation/flags/:id/block
 */
export const blockModerationFlag = (id, { reason, adminName } = {}) =>
  moderationAxios.post(`/flags/${id}/block`, { reason, adminName }).then((r) => r.data);

/**
 * Permanently ban the flagged message's sender. The most severe action —
 * confirm with the admin before calling this.
 * POST /api/moderation/flags/:id/ban
 */
export const banModerationFlag = (id, { reason, adminName } = {}) =>
  moderationAxios.post(`/flags/${id}/ban`, { reason, adminName }).then((r) => r.data);


export { adminAxios, moderationAxios };