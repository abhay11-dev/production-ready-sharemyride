import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import emailjs from '@emailjs/browser';
import {
  fetchRequests,
  updateRequestStatus,
  updateEnquiryAction,
  updateReportAction,
  fetchUpcomingRides,   // NEW
  runReminderCheckNow,  // NEW
} from '../../services/adminService.js';
import RequestDetailsModal from './RequestDetailsModal.jsx';
import UserDetailModal from './UserDetailModal.jsx';
import RideDetailModal from './RideDetailModal.jsx';
import BookingDetailModal from './BookingDetailModal.jsx';

// ─── FIX #1: Use adminAxios (sends adminToken) not the user api instance ──────
import { adminAxios as api } from '../../services/adminService.js';

/* ─── EmailJS config + firing helpers ───────────────────────────────────
   The backend never sends email itself for USER-TRIGGERED actions — every
   admin action (status change and/or reply) on an enquiry/report returns an
   `emailActions` object with pre-built { template, payload } actions. This
   dashboard fires them via emailjs.send(), same pattern as ContactUs.jsx /
   Report.jsx use for the user-facing confirmation email.

   Ride reminders (1 day / 6 hr / 1 hr before departure) are DIFFERENT — they
   have no admin/user session to fire from, so they're sent by a backend
   cron job (jobs/rideReminderScheduler.js) calling EmailJS's REST API
   directly with a private key. Nothing below fires those; the "Upcoming
   Rides" tab only displays their sent/not-sent status and offers a manual
   "run now" trigger for testing.
─────────────────────────────────────────────────────────────────────── */
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

const EMAILJS_TEMPLATES = {
  'admin-reply': import.meta.env.VITE_EMAILJS_TEMPLATE_ADMIN_REPLY,
  'admin-sync': import.meta.env.VITE_EMAILJS_TEMPLATE_ADMIN_SYNC,
};

async function fireEmailAction(action) {
  if (!action?.template || !action?.payload) return { fired: false };
  const templateId = EMAILJS_TEMPLATES[action.template];
  if (!EMAILJS_SERVICE_ID || !templateId || !EMAILJS_PUBLIC_KEY) {
    console.warn(`[EmailJS] Missing service/template/public key for "${action.template}" — skipping send.`);
    return { fired: false };
  }
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, templateId, action.payload, { publicKey: EMAILJS_PUBLIC_KEY });
    return { fired: true };
  } catch (err) {
    console.error(`[EmailJS] Failed to send "${action.template}":`, err);
    return { fired: false, error: err };
  }
}

async function fireEmailActions(emailActions) {
  if (!emailActions) return { userNotified: false, adminSynced: false };
  const [userRes, syncRes] = await Promise.all([
    emailActions.userNotification ? fireEmailAction(emailActions.userNotification) : Promise.resolve({ fired: false }),
    emailActions.adminSync ? fireEmailAction(emailActions.adminSync) : Promise.resolve({ fired: false }),
  ]);
  return { userNotified: userRes.fired, adminSynced: syncRes.fired };
}

/* ─── Icon set ─────────────────────────────────────────────────────────── */
const Icon = {
  overview: (p) => (<svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 13h4v7H3v-7zM10 8h4v12h-4V8zM17 4h4v16h-4V4z" /></svg>),
  users: (p) => (<svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6-1a4 4 0 10-3-6.65" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 20v-2a4 4 0 014-4h0a4 4 0 014 4v2" /></svg>),
  ride: (p) => (<svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 17h14M5 17a2 2 0 100 4 2 2 0 000-4zm14 0a2 2 0 100 4 2 2 0 000-4zM5 17l1.5-6h11L19 17M6.5 11l1-3.5A2 2 0 019.4 6h5.2a2 2 0 011.9 1.5l1 3.5" /></svg>),
  booking: (p) => (<svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 000-4V7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 5v14" strokeDasharray="2 2" /></svg>),
  payment: (p) => (<svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="6" width="18" height="13" rx="2" strokeWidth={1.8} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18" /></svg>),
  shield: (p) => (<svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>),
  chat: (p) => (<svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.06 0-2.077-.164-3.02-.465L3 21l1.516-4.55A7.936 7.936 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>),
  alert: (p) => (<svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v3.75m0 3.75h.008M4.318 19.5h15.364c1.53 0 2.493-1.667 1.732-3L13.732 4.5c-.77-1.333-2.694-1.333-3.464 0L2.586 16.5c-.762 1.333.2 3 1.732 3z" /></svg>),
  document: (p) => (<svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m-7 5h8a2 2 0 002-2V7.828a2 2 0 00-.586-1.414l-3.828-3.828A2 2 0 0012.172 2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>),
  pulse: (p) => (<svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12h4l2 8 4-16 2 8h6" /></svg>),
  wallet: (p) => (<svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2v-2m-4-2h.01" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8V6a2 2 0 012-2h11" /></svg>),
  pin: (p) => (<svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>),
  clock: (p) => (<svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="9" strokeWidth={1.8} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 7v5l3 3" /></svg>),
  calendar: (p) => (<svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>),
  star: (p) => (<svg {...p} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>),
  check: (p) => (<svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" /></svg>),
  checkCircle: (p) => (<svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12.75l1.5 1.5 4.5-4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
  inbox: (p) => (<svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4 12h4l2 3h4l2-3h4M4 12l1.5-6.5A2 2 0 017.44 4h9.12a2 2 0 011.94 1.5L20 12M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6" /></svg>),
  thumb: (p) => (<svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H6" /></svg>),
  eye: (p) => (<svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><circle cx="12" cy="12" r="3" strokeWidth={1.8} /></svg>),
  logout: (p) => (<svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>),
  sync: (p) => (<svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>),
};

/* ─── Constants ─────────────────────────────────────────── */
const TABS = [
  { id: 'overview', label: 'Overview', icon: Icon.overview },
  { id: 'users', label: 'Users', icon: Icon.users },
  { id: 'rides', label: 'Rides', icon: Icon.ride },
  { id: 'bookings', label: 'Bookings', icon: Icon.booking },
  { id: 'upcoming', label: 'Upcoming Rides', icon: Icon.calendar }, // NEW
  { id: 'payments', label: 'Payments', icon: Icon.payment },
  { id: 'verification', label: 'Driver Verification', icon: Icon.shield },
  { id: 'enquiries', label: 'Enquiries', icon: Icon.chat },
  { id: 'reports', label: 'Reports', icon: Icon.alert },
  { id: 'blogs', label: 'Blogs', icon: Icon.document },
];

/* ─── Helpers ───────────────────────────────────────────── */
function fmt(n) {
  if (n === undefined || n === null) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return Number(n).toLocaleString('en-IN');
}
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
const fmtDT = d => d ? `${fmtDate(d)}, ${fmtTime(d)}` : '—';

/* ─── Shared UI ─────────────────────────────────────────── */
const BADGE_CLS = {
  green: 'bg-green-50  text-green-700  border-green-200',
  red: 'bg-red-50    text-red-700    border-red-200',
  amber: 'bg-amber-50  text-amber-700  border-amber-200',
  blue: 'bg-blue-50   text-blue-700   border-blue-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  gray: 'bg-gray-100  text-gray-600   border-gray-200',
};

const Badge = ({ label, color = 'gray' }) => (
  <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border ${BADGE_CLS[color] || BADGE_CLS.gray}`}>
    {label}
  </span>
);

const STATUS_MAP = {
  submitted: { label: 'Pending', color: 'blue' },
  under_review: { label: 'Reviewing', color: 'purple' },
  approved: { label: 'Approved', color: 'green' },
  rejected: { label: 'Rejected', color: 'red' },
  needs_info: { label: 'Needs Info', color: 'amber' },
  completed: { label: 'Completed', color: 'green' },
  pending: { label: 'Pending', color: 'amber' },
  accepted: { label: 'Accepted', color: 'blue' },
  cancelled: { label: 'Cancelled', color: 'red' },
  no_show: { label: 'No Show', color: 'amber' },
  active: { label: 'Active', color: 'green' },
  open: { label: 'Open', color: 'blue' },
  in_progress: { label: 'In Progress', color: 'purple' },
  waiting_on_user: { label: 'Waiting on User', color: 'amber' },
  replied: { label: 'Replied', color: 'purple' },
  resolved: { label: 'Resolved', color: 'green' },
  closed: { label: 'Closed', color: 'gray' },
  archived: { label: 'Archived', color: 'gray' },
  seen: { label: 'Seen', color: 'blue' },
  critical: { label: 'Critical', color: 'red' },
  high: { label: 'High', color: 'amber' },
  urgent: { label: 'Urgent', color: 'red' },
  medium: { label: 'Medium', color: 'blue' },
  low: { label: 'Low', color: 'gray' },
  published: { label: 'Published', color: 'green' },
  draft: { label: 'Draft', color: 'gray' },
  not_started: { label: 'Not Started', color: 'gray' },
  paid: { label: 'Paid', color: 'green' },
  failed: { label: 'Failed', color: 'red' },
  refunded: { label: 'Refunded', color: 'amber' },
};
const StatusBadge = ({ status }) => {
  const { label, color } = STATUS_MAP[status] || { label: status || '—', color: 'gray' };
  return <Badge label={label} color={color} />;
};

function StatCard({ label, value, unit = '', icon: IconCmp, color = 'blue', sub }) {
  const bg = { blue: 'bg-blue-50 border-blue-100', green: 'bg-green-50 border-green-100', purple: 'bg-purple-50 border-purple-100', amber: 'bg-amber-50 border-amber-100', red: 'bg-red-50 border-red-100' }[color] || 'bg-gray-50 border-gray-100';
  const iconText = { blue: 'text-blue-500', green: 'text-green-500', purple: 'text-purple-500', amber: 'text-amber-500', red: 'text-red-500' }[color] || 'text-gray-400';
  return (
    <div className={`rounded-2xl border ${bg} p-5`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider leading-tight">{label}</p>
        {IconCmp && <IconCmp className={`w-4.5 h-4.5 ${iconText}`} style={{ width: 18, height: 18 }} />}
      </div>
      <p className="text-2xl font-black text-gray-900">{typeof value === 'number' ? fmt(value) : (value ?? '—')}{unit}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="relative">
      <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
    </div>
  );
}

function FilterPills({ options, value, onChange }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${value === opt.value ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="py-16 text-center text-gray-400">
      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
        <Icon.inbox className="w-5 h-5 text-gray-300" />
      </div>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

function Pagination({ page, total, limit, onPage }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
      <p className="text-xs text-gray-500">Page {page} of {pages} · {fmt(total)} records</p>
      <div className="flex gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1}
          className="px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-40 hover:bg-gray-100 transition-colors">← Prev</button>
        <button onClick={() => onPage(page + 1)} disabled={page >= pages}
          className="px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-40 hover:bg-gray-100 transition-colors">Next →</button>
      </div>
    </div>
  );
}

function TableSkeleton({ cols = 6, rows = 8 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={i}>
      <td colSpan={cols} className="px-4 py-3">
        <div className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + (i % 3) * 10}%` }} />
      </td>
    </tr>
  ));
}

/* ─── Reply composer (shared by Enquiries + Reports) ────────────────────── */
function ReplyComposer({ currentStatus, statusOptions, onSubmit, submitting }) {
  const [status, setStatus] = useState(currentStatus || '');
  const [reply, setReply] = useState('');

  const handleSend = () => {
    if (!reply.trim() && status === currentStatus) {
      toast.error('Write a reply or change the status first');
      return;
    }
    onSubmit({ status: status !== currentStatus ? status : undefined, reply: reply.trim() || undefined });
    setReply('');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs font-bold uppercase text-gray-400">Status</label>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="text-xs font-semibold border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {statusOptions.map(s => <option key={s} value={s}>{STATUS_MAP[s]?.label || s}</option>)}
        </select>
      </div>
      <textarea
        value={reply}
        onChange={e => setReply(e.target.value)}
        rows={3}
        placeholder="Write a reply to send to the user's email…"
        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder-gray-400"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {reply.trim() ? 'This will email the user their reply.' : 'No reply text — only the status will change.'}
        </p>
        <button
          onClick={handleSend}
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
        >
          {submitting ? (
            <>
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
              Sending…
            </>
          ) : 'Save & Notify'}
        </button>
      </div>
    </div>
  );
}

/* ─── Overview Tab ──────────────────────────────────────── */
function OverviewTab({ analytics, enquiries, reports, verRequests }) {
  const urgent = reports.filter(r => (r.meta?.severity || r.severity) === 'critical' || (r.meta?.severity || r.severity) === 'high');
  const pending = verRequests.filter(r => r.status === 'submitted' || r.status === 'under_review');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-4">Platform at a glance</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total Users" value={analytics.totalUsers || 0} icon={Icon.users} color="blue" />
          <StatCard label="Active 7d" value={analytics.activeUsers || 0} icon={Icon.pulse} color="green" />
          <StatCard label="Total Rides" value={analytics.totalRides || 0} icon={Icon.ride} color="purple" />
          <StatCard label="Bookings" value={analytics.totalBookings || 0} icon={Icon.booking} color="amber" />
          <StatCard label="Revenue" value={Math.floor((analytics.totalRevenue || 0) / 1000)} unit="K" icon={Icon.wallet} color="green" />
          <StatCard label="Cities" value={analytics.totalCities || 0} icon={Icon.pin} color="amber" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Pending Verifications" value={pending.length} icon={Icon.clock} color="blue" />
        <StatCard label="Open Enquiries" value={enquiries.filter(e => !['resolved', 'closed'].includes(e.status)).length} icon={Icon.chat} color="amber" />
        <StatCard label="Urgent Reports" value={urgent.length} icon={Icon.alert} color="red" />
        <StatCard label="Avg Rating" value={(analytics.averageRating || 4.8)} unit="" icon={Icon.star} color="amber" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-gray-900">Pending Verifications</h3>
            {pending.length > 0 && <Badge label={pending.length} color="blue" />}
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {pending.length === 0
              ? <p className="text-sm text-gray-400 text-center py-6">All caught up</p>
              : pending.slice(0, 6).map(r => (
                <div key={r._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                  <img src={r.avatarFallback} alt="" className="w-8 h-8 rounded-lg flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.user.name}</p>
                    <p className="text-xs text-gray-400">{fmtDate(r.submittedAt)}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-bold text-sm text-gray-900 mb-4">Recent Enquiries</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {enquiries.length === 0
              ? <p className="text-sm text-gray-400 text-center py-6">No enquiries yet</p>
              : enquiries.slice(0, 5).map(e => (
                <div key={e._id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{e.name || e.email}</p>
                    <StatusBadge status={e.status || 'open'} />
                  </div>
                  <p className="text-xs text-gray-500 truncate">{e.subject || e.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{fmtDate(e.createdAt)}</p>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-gray-900">Urgent Reports</h3>
            {urgent.length > 0 && <Badge label={urgent.length} color="red" />}
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {urgent.length === 0
              ? <p className="text-sm text-gray-400 text-center py-6">No urgent reports</p>
              : urgent.slice(0, 5).map(r => (
                <div key={r._id} className="p-3 bg-red-50 rounded-xl border border-red-100">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-red-900 truncate">{r.subject || r.title || 'Report'}</p>
                    <StatusBadge status={r.meta?.severity || r.severity} />
                  </div>
                  <p className="text-xs text-red-600 truncate">{r.message || r.description}</p>
                  <p className="text-xs text-red-400 mt-1">{fmtDate(r.createdAt)}</p>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="font-bold text-sm text-gray-900 mb-1">Revenue Summary</h3>
        <p className="text-xs text-gray-400 mb-5">From completed payments</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <p className="text-2xl font-black text-green-700">₹{fmt(analytics.totalRevenue || 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Revenue</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <p className="text-2xl font-black text-blue-700">{fmt(analytics.totalBookings || 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Bookings</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-xl">
            <p className="text-2xl font-black text-purple-700">
              ₹{fmt(Math.round((analytics.totalRevenue || 0) / (analytics.totalBookings || 1)))}
            </p>
            <p className="text-xs text-gray-500 mt-1">Avg per Booking</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Users Tab ─────────────────────────────────────────── */
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users', { params: { page, limit: LIMIT, search } });
      setUsers(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-gray-900">Users</h2>
          <p className="text-xs text-gray-400 mt-0.5">{fmt(total)} registered</p>
        </div>
        <div className="w-60"><SearchBar value={search} onChange={setSearch} placeholder="Name or email…" /></div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['User', 'Phone', 'Role', 'Driver Status', 'Rides', 'Joined', 'Last Login'].map(h => (
                <th key={h} className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? <TableSkeleton cols={7} />
                : users.length === 0
                  ? <tr><td colSpan={7}><EmptyState message="No users found" /></td></tr>
                  : users.map(u => (
                    <tr key={u._id} onClick={() => setSelected(u)} className="hover:bg-blue-50/40 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {(u.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{u.name}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.phone || '—'}</td>
                      <td className="px-4 py-3"><Badge label={u.role || 'user'} color={u.role === 'admin' ? 'purple' : u.role === 'driver' ? 'green' : 'gray'} /></td>
                      <td className="px-4 py-3"><StatusBadge status={u.driverVerification?.status || 'not_started'} /></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.ratingSummary?.totalRides || 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">{fmtDate(u.createdAt)}</td>
                      <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">{u.lastLogin ? fmtDate(u.lastLogin) : '—'}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-4"><Pagination page={page} total={total} limit={LIMIT} onPage={setPage} /></div>
      </div>
      {selected && <UserDetailModal user={selected} onClose={() => setSelected(null)} onRefresh={load} />}
    </div>
  );
}

/* ─── Rides Tab ─────────────────────────────────────────── */
function RidesTab() {
  const [rides, setRides] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (statusF !== 'all') params.status = statusF;
      const res = await api.get('/rides', { params });
      setRides(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch { toast.error('Failed to load rides'); }
    finally { setLoading(false); }
  }, [page, statusF]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [statusF]);

  const STATUS_OPTS = [
    { value: 'all', label: 'All' }, { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-gray-900">Rides</h2>
          <p className="text-xs text-gray-400 mt-0.5">{fmt(total)} total</p>
        </div>
        <FilterPills options={STATUS_OPTS} value={statusF} onChange={setStatusF} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Route', 'Driver', 'Date & Time', 'Seats', 'Fare', 'Status', 'Bookings'].map(h => (
                <th key={h} className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? <TableSkeleton cols={7} />
                : rides.length === 0
                  ? <tr><td colSpan={7}><EmptyState message="No rides found" /></td></tr>
                  : rides.map(r => (
                    <tr key={r._id} onClick={() => setSelected(r)} className="hover:bg-blue-50/40 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />{r.start}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />{r.end}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.driver?.name || r.driverInfo?.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{fmtDate(r.date)} {r.time}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.availableSeats ?? r.seats}/{r.seats}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{r.fare}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status || 'active'} /></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.bookingsCount || 0}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-4"><Pagination page={page} total={total} limit={LIMIT} onPage={setPage} /></div>
      </div>
      {selected && <RideDetailModal ride={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* ─── Bookings Tab ──────────────────────────────────────────────────────
   FIXED: status filter options previously included "confirmed", which is
   not a valid Booking.status enum value (real values are pending / accepted
   / rejected / cancelled / completed / no_show). Filtering on "confirmed"
   silently returned zero rows every time it was selected.
─────────────────────────────────────────────────────────────────────── */
function BookingsTab() {
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (statusF !== 'all') params.status = statusF;
      const res = await api.get('/bookings', { params });
      setBookings(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  }, [page, statusF]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [statusF]);

  const STATUS_OPTS = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'no_show', label: 'No Show' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-gray-900">Bookings</h2>
          <p className="text-xs text-gray-400 mt-0.5">{fmt(total)} total</p>
        </div>
        <FilterPills options={STATUS_OPTS} value={statusF} onChange={setStatusF} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Passenger', 'Route', 'Seats', 'Fare', 'Payment', 'Status', 'Date'].map(h => (
                <th key={h} className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? <TableSkeleton cols={7} />
                : bookings.length === 0
                  ? <tr><td colSpan={7}><EmptyState message="No bookings found" /></td></tr>
                  : bookings.map(b => (
                    <tr key={b._id} onClick={() => setSelected(b)} className="hover:bg-blue-50/40 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">{b.passenger?.name || '—'}</p>
                        <p className="text-xs text-gray-400">{b.passenger?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px] truncate">
                        {b.pickupLocation} → {b.dropLocation}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{b.seatsBooked}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{b.totalFare || b.finalAmount || 0}</td>
                      <td className="px-4 py-3"><StatusBadge status={b.paymentStatus || 'pending'} /></td>
                      <td className="px-4 py-3"><StatusBadge status={b.status || 'pending'} /></td>
                      <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">{fmtDate(b.createdAt)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-4"><Pagination page={page} total={total} limit={LIMIT} onPage={setPage} /></div>
      </div>
      {selected && <BookingDetailModal booking={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* ─── Upcoming Rides Tab — NEW ──────────────────────────────────────────────
   Every accepted + paid booking whose ride is still ahead of us: full route,
   passenger + driver contact info, fare breakdown (base fare / passenger's
   total / driver's payout / platform's cut), and the send status of each of
   the 3 reminder emails (1 day / 6 hr / 1 hr before departure). The "Run
   reminder check now" button manually fires the same job the cron runs
   every 10 minutes — useful for verifying EmailJS wiring without waiting.
─────────────────────────────────────────────────────────────────────── */
function ReminderPill({ label, sent }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${sent ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
      {sent ? <Icon.check className="w-3 h-3" /> : <Icon.clock className="w-3 h-3" />}
      {label}
    </span>
  );
}

function UpcomingRidesTab() {
  const [rides, setRides] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [running, setRunning] = useState(false);
  const LIMIT = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchUpcomingRides(page, LIMIT);
      setRides(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch { toast.error('Failed to load upcoming rides'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const res = await runReminderCheckNow();
      toast.success(res.message || 'Reminder check triggered');
      setTimeout(load, 1500);
    } catch { toast.error('Failed to trigger reminder check'); }
    finally { setRunning(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">Upcoming Rides</h2>
          <p className="text-xs text-gray-400 mt-0.5">{fmt(total)} scheduled · reminders fire at 1 day / 6 hr / 1 hr before departure</p>
        </div>
        <button onClick={handleRunNow} disabled={running}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5">
          <Icon.sync className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Running…' : 'Run reminder check now'}
        </button>
      </div>

      {loading
        ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}</div>
        : rides.length === 0
          ? <div className="bg-white rounded-2xl border border-gray-200 p-12"><EmptyState message="No upcoming rides" /></div>
          : (
            <div className="space-y-3">
              {rides.map(r => (
                <div key={r._id} className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                    <div>
                      <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />{r.pickupLocation}
                        <span className="text-gray-300 mx-1">→</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />{r.dropLocation}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {fmtDate(r.rideDate)} · {r.rideTime} · {r.seatsBooked} seat{r.seatsBooked === 1 ? '' : 's'}
                        {r.matchType === 'on_route' && r.userSearchDistance ? ` · segment ${r.userSearchDistance.toFixed(1)} km` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <ReminderPill label="1 day" sent={r.reminders?.oneDay?.sent} />
                      <ReminderPill label="6 hr" sent={r.reminders?.sixHour?.sent} />
                      <ReminderPill label="1 hr" sent={r.reminders?.oneHour?.sent} />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <div className="bg-blue-50 rounded-xl p-3.5">
                      <p className="text-[11px] font-bold uppercase text-blue-600 mb-1.5">Passenger</p>
                      <p className="text-sm font-semibold text-gray-900">{r.passenger?.name || '—'}</p>
                      <p className="text-xs text-gray-500">{r.passenger?.phone || '—'} · {r.passenger?.email || '—'}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3.5">
                      <p className="text-[11px] font-bold uppercase text-green-600 mb-1.5">Driver</p>
                      <p className="text-sm font-semibold text-gray-900">{r.driver?.name || '—'}</p>
                      <p className="text-xs text-gray-500">{r.driver?.phone || '—'} · {r.vehicleNumber || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-gray-400">Base fare</p>
                      <p className="font-bold text-gray-900">₹{r.fare.baseFare.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Passenger paid</p>
                      <p className="font-bold text-blue-700">₹{r.fare.totalPaidByPassenger.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Driver receives</p>
                      <p className="font-bold text-green-700">₹{r.fare.driverReceives.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Platform fee (passenger side)</p>
                      <p className="font-bold text-gray-900">₹{(r.fare.passengerServiceFee + r.fare.passengerServiceFeeGST).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
              <Pagination page={page} total={total} limit={LIMIT} onPage={setPage} />
            </div>
          )}
    </div>
  );
}

/* ─── Payments Tab ──────────────────────────────────────── */
function PaymentsTab() {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState('all');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (statusF !== 'all') params.status = statusF;
      const res = await api.get('/payments', { params });
      setPayments(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch { toast.error('Failed to load payments'); }
    finally { setLoading(false); }
  }, [page, statusF]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [statusF]);

  const STATUS_OPTS = [
    { value: 'all', label: 'All' }, { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' }, { value: 'failed', label: 'Failed' },
    { value: 'refunded', label: 'Refunded' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-gray-900">Payments</h2>
          <p className="text-xs text-gray-400 mt-0.5">{fmt(total)} transactions</p>
        </div>
        <FilterPills options={STATUS_OPTS} value={statusF} onChange={setStatusF} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Transaction ID', 'User', 'Amount', 'Method', 'Status', 'Date'].map(h => (
                <th key={h} className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? <TableSkeleton cols={6} />
                : payments.length === 0
                  ? <tr><td colSpan={6}><EmptyState message="No payments found" /></td></tr>
                  : payments.map(p => (
                    <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {(p.transactionId || p.razorpayPaymentId || p._id)?.substring(0, 14)}…
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{p.user?.name || p.passenger?.name || '—'}</p>
                        <p className="text-xs text-gray-400">{p.user?.email || p.passenger?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">₹{p.amount || 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{p.method || p.paymentMethod || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">{fmtDT(p.createdAt)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-4"><Pagination page={page} total={total} limit={LIMIT} onPage={setPage} /></div>
      </div>
    </div>
  );
}

/* ─── Driver Verification Tab ───────────────────────────── */
function VerificationTab({ requests, onUpdate, onRefresh }) {
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('all');
  const [selected, setSelected] = useState(null);

  const filtered = requests.filter(r => {
    const matchStatus = statusF === 'all' || r.status === statusF;
    const s = search.toLowerCase();
    const matchSearch = !search
      || r._id.toLowerCase().includes(s)
      || r.user.name.toLowerCase().includes(s)
      || r.user.email.toLowerCase().includes(s);
    return matchStatus && matchSearch;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'submitted').length,
    review: requests.filter(r => r.status === 'under_review').length,
    approved: requests.filter(r => r.status === 'approved').length,
    info: requests.filter(r => r.status === 'needs_info').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const STATUS_OPTS = [
    { value: 'all', label: `All (${stats.total})` },
    { value: 'submitted', label: `Pending (${stats.pending})` },
    { value: 'under_review', label: `Reviewing (${stats.review})` },
    { value: 'approved', label: `Approved (${stats.approved})` },
    { value: 'needs_info', label: `Info (${stats.info})` },
    { value: 'rejected', label: `Rejected (${stats.rejected})` },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-gray-900">Driver Verifications</h2>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-5">
        {[
          { label: 'Total', value: stats.total, cls: 'text-gray-900' },
          { label: 'Pending', value: stats.pending, cls: 'text-blue-600' },
          { label: 'Review', value: stats.review, cls: 'text-purple-600' },
          { label: 'Approved', value: stats.approved, cls: 'text-green-600' },
          { label: 'Info', value: stats.info, cls: 'text-amber-600' },
          { label: 'Rejected', value: stats.rejected, cls: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-xs">
          <SearchBar value={search} onChange={setSearch} placeholder="Name, email, or ID…" />
        </div>
        <FilterPills options={STATUS_OPTS} value={statusF} onChange={setStatusF} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['User', 'Request ID', 'Documents', 'Submitted', 'Status', ''].map(h => (
                <th key={h} className="px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0
                ? <tr><td colSpan={6}><EmptyState message="No requests found" /></td></tr>
                : filtered.map(req => {
                  const docs = req.documents || {};
                  const docCount = Object.values(docs).filter(d => d?.available).length;
                  const totalDocs = Object.keys(docs).length;
                  return (
                    <tr key={req._id} onClick={() => setSelected(req)} className="hover:bg-blue-50/40 cursor-pointer transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img src={req.avatarFallback} alt="" className="w-9 h-9 rounded-lg flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-sm text-gray-900">{req.user.name}</p>
                            <p className="text-xs text-gray-400">{req.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-gray-400">{req._id.substring(0, 10)}…</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(docCount / (totalDocs || 1)) * 100}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{docCount}/{totalDocs}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">{fmtDate(req.submittedAt)}</td>
                      <td className="px-5 py-4"><StatusBadge status={req.status} /></td>
                      <td className="px-5 py-4 text-right">
                        <button className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <RequestDetailsModal
          request={selected}
          onClose={() => setSelected(null)}
          onUpdateStatus={async (id, status, remark) => {
            await onUpdate(id, status, remark);
            setSelected(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

/* ─── Enquiries Tab ─────────────────────────────────────────────────────── */
function EnquiriesTab() {
  const [enquiries, setEnquiries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState('all');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (statusF !== 'all') params.status = statusF;
      const res = await api.get('/enquiries', { params });
      setEnquiries(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch { toast.error('Failed to load enquiries'); }
    finally { setLoading(false); }
  }, [page, statusF]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [statusF]);

  const handleQuickStatus = async (id, status) => {
    setSubmittingId(id);
    try {
      const res = await updateEnquiryAction(id, { status });
      const { userNotified, adminSynced } = await fireEmailActions(res.emailActions);
      toast.success(
        `Marked as ${status.replace('_', ' ')}` + (adminSynced ? ' · admin sync sent' : '')
      );
      load();
    } catch { toast.error('Failed to update'); }
    finally { setSubmittingId(null); }
  };

  const handleReplySubmit = async (id, { status, reply }) => {
    setSubmittingId(id);
    try {
      const res = await updateEnquiryAction(id, { status, reply, adminName: 'ShareMyRide' });
      const { userNotified, adminSynced } = await fireEmailActions(res.emailActions);
      if (reply) {
        toast.success(userNotified ? 'Reply sent to user' : 'Reply saved (email send failed — check EmailJS config)');
      } else {
        toast.success(`Status updated to ${res.data?.status || status}`);
      }
      if (adminSynced) toast.success('Admin sync notice sent');
      load();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSubmittingId(null);
    }
  };

  const STATUS_OPTS = [
    { value: 'all', label: 'All' }, { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' }, { value: 'replied', label: 'Replied' },
    { value: 'waiting_on_user', label: 'Waiting on User' }, { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
  ];
  const COMPOSER_STATUS_OPTS = ['open', 'in_progress', 'waiting_on_user', 'replied', 'resolved', 'closed'];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-gray-900">Enquiries</h2>
          <p className="text-xs text-gray-400 mt-0.5">{fmt(total)} total</p>
        </div>
        <FilterPills options={STATUS_OPTS} value={statusF} onChange={setStatusF} />
      </div>

      {loading
        ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}</div>
        : enquiries.length === 0
          ? <div className="bg-white rounded-2xl border border-gray-200 p-12"><EmptyState message="No enquiries" /></div>
          : (
            <div className="space-y-2">
              {enquiries.map(e => (
                <div key={e._id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpanded(expanded === e._id ? null : e._id)}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-semibold text-sm text-gray-900">{e.name || e.email}</p>
                          <StatusBadge status={e.status || 'open'} />
                          {e.priority && <StatusBadge status={e.priority} />}
                          {e.ticketNumber && <span className="font-mono text-xs text-gray-400">{e.ticketNumber}</span>}
                        </div>
                        <p className="text-xs text-gray-400">{e.email}{e.phone ? ` · ${e.phone}` : ''}</p>
                        <p className="text-sm text-gray-600 mt-1.5 line-clamp-1">{e.subject || e.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{fmtDT(e.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!['resolved', 'closed'].includes(e.status) && (
                          <>
                            <button onClick={ev => { ev.stopPropagation(); handleQuickStatus(e._id, 'in_progress'); }}
                              disabled={submittingId === e._id}
                              className="px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50">
                              In Progress
                            </button>
                            <button onClick={ev => { ev.stopPropagation(); handleQuickStatus(e._id, 'resolved'); }}
                              disabled={submittingId === e._id}
                              className="px-2.5 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100 transition-colors disabled:opacity-50">
                              Resolve
                            </button>
                          </>
                        )}
                        <svg className={`w-4 h-4 text-gray-300 transition-transform ${expanded === e._id ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  {expanded === e._id && (
                    <div className="px-5 pb-5 pt-4 border-t border-gray-100 bg-gray-50 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-xs font-bold uppercase text-gray-400">Type</span>
                          <p className="text-gray-700 mt-0.5">{(e.type || '').replace(/_/g, ' ') || '—'}</p>
                        </div>
                        <div>
                          <span className="text-xs font-bold uppercase text-gray-400">Ticket</span>
                          <p className="text-gray-700 mt-0.5 font-mono text-xs">{e.ticketNumber || e._id?.substring(0, 12)}</p>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase text-gray-400">Message</span>
                        <p className="text-gray-700 mt-1 text-sm leading-relaxed whitespace-pre-wrap">{e.message}</p>
                      </div>

                      {Array.isArray(e.adminReplies) && e.adminReplies.length > 0 && (
                        <div>
                          <span className="text-xs font-bold uppercase text-gray-400">Reply history</span>
                          <div className="mt-2 space-y-2">
                            {e.adminReplies.map((ar, i) => (
                              <div key={i} className="bg-white border border-gray-200 rounded-xl p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-xs font-semibold text-gray-700">{ar.sentBy}</p>
                                  <div className="flex items-center gap-1.5">
                                    {ar.emailSent && <Badge label="Emailed" color="green" />}
                                    <span className="text-xs text-gray-400">{fmtDT(ar.sentAt)}</span>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">{ar.message}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <span className="text-xs font-bold uppercase text-gray-400 mb-2 block">Reply / change status</span>
                        <ReplyComposer
                          currentStatus={e.status || 'open'}
                          statusOptions={COMPOSER_STATUS_OPTS}
                          submitting={submittingId === e._id}
                          onSubmit={({ status, reply }) => handleReplySubmit(e._id, { status, reply })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <Pagination page={page} total={total} limit={LIMIT} onPage={setPage} />
            </div>
          )}
    </div>
  );
}

/* ─── Reports Tab ───────────────────────────────────────────────────────── */
function ReportsTab() {
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [severityF, setSeverityF] = useState('all');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (severityF !== 'all') params.severity = severityF;
      const res = await api.get('/reports', { params });
      setReports(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  }, [page, severityF]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [severityF]);

  const handleQuickStatus = async (id, status) => {
    setSubmittingId(id);
    try {
      const res = await updateReportAction(id, { status });
      const { adminSynced } = await fireEmailActions(res.emailActions);
      toast.success(`Marked as ${status.replace('_', ' ')}` + (adminSynced ? ' · admin sync sent' : ''));
      load();
    } catch { toast.error('Failed to update'); }
    finally { setSubmittingId(null); }
  };

  const handleReplySubmit = async (id, { status, reply }) => {
    setSubmittingId(id);
    try {
      const res = await updateReportAction(id, { status, reply, adminName: 'ShareMyRide' });
      const { userNotified, adminSynced } = await fireEmailActions(res.emailActions);
      if (reply) {
        toast.success(userNotified ? 'Reply sent to reporter' : 'Reply saved (email send failed — check EmailJS config)');
      } else {
        toast.success(`Status updated to ${res.data?.status || status}`);
      }
      if (adminSynced) toast.success('Admin sync notice sent');
      load();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSubmittingId(null);
    }
  };

  const SEVERITY_OPTS = [
    { value: 'all', label: 'All' }, { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' },
  ];
  const COMPOSER_STATUS_OPTS = ['open', 'in_progress', 'waiting_on_user', 'replied', 'resolved', 'closed'];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-gray-900">Reports</h2>
          <p className="text-xs text-gray-400 mt-0.5">{fmt(total)} total</p>
        </div>
        <FilterPills options={SEVERITY_OPTS} value={severityF} onChange={setSeverityF} />
      </div>

      {loading
        ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}</div>
        : reports.length === 0
          ? <div className="bg-white rounded-2xl border border-gray-200 p-12"><EmptyState message="No reports" /></div>
          : (
            <div className="space-y-2">
              {reports.map(r => {
                const severity = r.meta?.severity || 'medium';
                return (
                  <div key={r._id} className={`bg-white rounded-2xl border overflow-hidden ${severity === 'critical' ? 'border-red-200' : 'border-gray-200'}`}>
                    <div className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpanded(expanded === r._id ? null : r._id)}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-semibold text-sm text-gray-900">{r.subject || 'Issue Report'}</p>
                            <StatusBadge status={severity} />
                            <StatusBadge status={r.status || 'open'} />
                            {r.ticketNumber && <span className="font-mono text-xs text-gray-400">{r.ticketNumber}</span>}
                          </div>
                          <p className="text-xs text-gray-400">
                            {r.name} · {r.email}{r.meta?.relatedRideId ? ` · Ride: ${r.meta.relatedRideId}` : ''}
                          </p>
                          <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">{r.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{fmtDT(r.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!['resolved', 'closed'].includes(r.status) && (
                            <button onClick={ev => { ev.stopPropagation(); handleQuickStatus(r._id, 'resolved'); }}
                              disabled={submittingId === r._id}
                              className="px-2.5 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100 transition-colors disabled:opacity-50">
                              Resolve
                            </button>
                          )}
                          <svg className={`w-4 h-4 text-gray-300 transition-transform ${expanded === r._id ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {expanded === r._id && (
                      <div className="px-5 pb-5 pt-4 border-t border-gray-100 bg-gray-50 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-xs font-bold uppercase text-gray-400">Type</span>
                            <p className="text-gray-700 mt-0.5">{(r.type || '').replace(/_/g, ' ') || '—'}</p>
                          </div>
                          <div>
                            <span className="text-xs font-bold uppercase text-gray-400">Affected page</span>
                            <p className="text-gray-700 mt-0.5">{r.meta?.affectedPage || '—'}</p>
                          </div>
                        </div>

                        {r.meta?.stepsToReproduce && (
                          <div>
                            <span className="text-xs font-bold uppercase text-gray-400">Steps to reproduce</span>
                            <p className="text-gray-700 mt-1 text-sm whitespace-pre-wrap">{r.meta.stepsToReproduce}</p>
                          </div>
                        )}
                        {(r.meta?.expectedBehaviour || r.meta?.actualBehaviour) && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-xs font-bold uppercase text-gray-400">Expected</span>
                              <p className="text-gray-700 mt-1 text-sm">{r.meta?.expectedBehaviour || '—'}</p>
                            </div>
                            <div>
                              <span className="text-xs font-bold uppercase text-gray-400">Actual</span>
                              <p className="text-gray-700 mt-1 text-sm">{r.meta?.actualBehaviour || '—'}</p>
                            </div>
                          </div>
                        )}
                        {r.meta?.additionalNotes && (
                          <div>
                            <span className="text-xs font-bold uppercase text-gray-400">Additional notes</span>
                            <p className="text-gray-700 mt-1 text-sm">{r.meta.additionalNotes}</p>
                          </div>
                        )}

                        {Array.isArray(r.adminReplies) && r.adminReplies.length > 0 && (
                          <div>
                            <span className="text-xs font-bold uppercase text-gray-400">Reply history</span>
                            <div className="mt-2 space-y-2">
                              {r.adminReplies.map((ar, i) => (
                                <div key={i} className="bg-white border border-gray-200 rounded-xl p-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs font-semibold text-gray-700">{ar.sentBy}</p>
                                    <div className="flex items-center gap-1.5">
                                      {ar.emailSent && <Badge label="Emailed" color="green" />}
                                      <span className="text-xs text-gray-400">{fmtDT(ar.sentAt)}</span>
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{ar.message}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <span className="text-xs font-bold uppercase text-gray-400 mb-2 block">Reply / change status</span>
                          <ReplyComposer
                            currentStatus={r.status || 'open'}
                            statusOptions={COMPOSER_STATUS_OPTS}
                            submitting={submittingId === r._id}
                            onSubmit={({ status, reply }) => handleReplySubmit(r._id, { status, reply })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <Pagination page={page} total={total} limit={LIMIT} onPage={setPage} />
            </div>
          )}
    </div>
  );
}

/* ─── Blogs Tab ─────────────────────────────────────────── */
function BlogsTab() {
  const [blogs, setBlogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState('all');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (statusF !== 'all') params.status = statusF;
      const res = await api.get('/blogs', { params });
      setBlogs(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch { toast.error('Failed to load blogs'); }
    finally { setLoading(false); }
  }, [page, statusF]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [statusF]);

  const handleUpdate = async (id, status) => {
    try {
      await api.put(`/blogs/${id}`, { status });
      toast.success(`Blog ${status}`);
      load();
    } catch { toast.error('Failed to update blog'); }
  };

  const STATUS_OPTS = [
    { value: 'all', label: 'All' }, { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' }, { value: 'archived', label: 'Archived' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-gray-900">Blog Posts</h2>
          <p className="text-xs text-gray-400 mt-0.5">{fmt(total)} posts</p>
        </div>
        <FilterPills options={STATUS_OPTS} value={statusF} onChange={setStatusF} />
      </div>

      {loading
        ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}</div>
        : blogs.length === 0
          ? <div className="bg-white rounded-2xl border border-gray-200 p-12"><EmptyState message="No posts" /></div>
          : (
            <div className="space-y-2">
              {blogs.map(b => (
                <div key={b._id} className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm text-gray-900 truncate">{b.title}</h3>
                        <StatusBadge status={b.status || 'draft'} />
                      </div>
                      <p className="text-xs text-gray-400">By {b.author?.name || '—'} · {fmtDate(b.createdAt)}</p>
                      {b.excerpt && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{b.excerpt}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="inline-flex items-center gap-1"><Icon.thumb className="w-3.5 h-3.5" /> {b.likes?.length ?? b.likes ?? 0}</span>
                        <span className="inline-flex items-center gap-1"><Icon.chat className="w-3.5 h-3.5" /> {Array.isArray(b.comments) ? b.comments.length : (b.commentCount || 0)}</span>
                        <span className="inline-flex items-center gap-1"><Icon.eye className="w-3.5 h-3.5" /> {b.viewCount || 0}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {b.status !== 'published' && (
                        <button onClick={() => handleUpdate(b._id, 'published')}
                          className="px-2.5 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100 transition-colors">
                          Publish
                        </button>
                      )}
                      {b.status === 'published' && (
                        <button onClick={() => handleUpdate(b._id, 'archived')}
                          className="px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors">
                          Archive
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <Pagination page={page} total={total} limit={LIMIT} onPage={setPage} />
            </div>
          )}
    </div>
  );
}

/* ─── Root ──────────────────────────────────────────────── */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState({});
  const [verRequests, setVerRequests] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    if (!localStorage.getItem('adminToken')) { navigate('/admin/login'); return; }
    loadCore();
  }, [navigate]);

  const loadCore = async () => {
    try {
      const users = await fetchRequests();
      setVerRequests(users.map(user => {
        const v = user.driverVerification || {};
        const docRef = (url) => ({ url: url || '', available: Boolean(url) });
        return {
          _id: user._id,
          user: { name: user.name, email: user.email },
          status: v.status || 'pending',
          submittedAt: v.submittedAt || user.createdAt,
          documents: {
            profilePhoto: docRef(v.profilePhoto?.url),
            aadhaarFront: docRef(v.aadhaar?.frontImageUrl),
            aadhaarBack: docRef(v.aadhaar?.backImageUrl),
            dlFront: docRef(v.drivingLicense?.frontImageUrl),
            dlBack: docRef(v.drivingLicense?.backImageUrl),
          },
          avatarFallback: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'Driver')}&background=1a56db&color=fff`,
          details: {
            aadhaarNumber: v.aadhaar?.numberMasked || v.aadhaar?.number || 'Not provided',
            dlNumber: v.drivingLicense?.number || 'Not provided',
            dlExpiry: v.drivingLicense?.expiryDate || 'Not provided',
          },
          auditTrail: v.auditTrail || [],
        };
      }));
    } catch (err) { console.error('Verifications:', err); }

    try {
      const res = await api.get('/analytics/summary');
      setAnalytics(res.data?.data || {});
    } catch { }

    try {
      const res = await api.get('/enquiries', { params: { limit: 50 } });
      setEnquiries(res.data?.data || []);
    } catch { }

    try {
      const res = await api.get('/reports', { params: { limit: 50 } });
      setReports(res.data?.data || []);
    } catch { }
  };

  const handleUpdateVerification = async (id, status, remark) => {
    try {
      await updateRequestStatus(id, status, remark);
      toast.success(`Marked as ${status.replace('_', ' ')}`);
    } catch { toast.error('Failed to update'); }
  };

  const pendingCount = verRequests.filter(r => r.status === 'submitted').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-white/15 border border-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-none">ShareMyRide</p>
              <p className="text-xs text-blue-100 leading-none mt-0.5">Admin Console</p>
            </div>
          </div>
          <button onClick={() => { localStorage.removeItem('adminToken'); localStorage.removeItem('isAdminAuthenticated'); toast.success('Signed out'); navigate('/admin/login'); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-100 hover:text-white transition-colors">
            <Icon.logout className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </nav>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex overflow-x-auto scrollbar-hide">
            {TABS.map(tab => {
              const TabIcon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200'
                    }`}>
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                  {tab.id === 'verification' && pendingCount > 0 && (
                    <span className="ml-0.5 text-xs bg-blue-600 text-white rounded-full px-1.5 py-0.5 font-bold leading-none">
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
        {activeTab === 'overview' && <OverviewTab analytics={analytics} enquiries={enquiries} reports={reports} verRequests={verRequests} />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'rides' && <RidesTab />}
        {activeTab === 'bookings' && <BookingsTab />}
        {activeTab === 'upcoming' && <UpcomingRidesTab />}
        {activeTab === 'payments' && <PaymentsTab />}
        {activeTab === 'verification' && <VerificationTab requests={verRequests} onUpdate={handleUpdateVerification} onRefresh={loadCore} />}
        {activeTab === 'enquiries' && <EnquiriesTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'blogs' && <BlogsTab />}
      </main>
    </div>
  );
}