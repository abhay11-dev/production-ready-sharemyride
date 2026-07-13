import React, { useState, useEffect } from 'react';
import { adminAxios as api } from '../../services/adminService.js';
import toast from '../../services/toastService';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider w-36 flex-shrink-0 mt-0.5">{label}</span>
      <span className="text-sm text-gray-800 flex-1">{value || '—'}</span>
    </div>
  );
}

/* ── Suspend confirmation modal (reason required) ──
   Exported (was module-private before) so ModerationTab in AdminDashboard.jsx
   can reuse it for suspending a flagged message's sender directly from the
   Moderation tab, instead of duplicating this modal — same reasoning as the
   BookingModal.jsx / NegotiationPanel.jsx dead-code lesson: don't grow a
   second copy of UI that already exists and works. */
const ACCOUNT_ACTION_COPY = {
  suspend: {
    title: (name) => `Suspend ${name}?`,
    description: "They'll lose access immediately and will see this reason when they try to log in.",
    reasonLabel: 'Suspension reason',
    placeholder: 'e.g. Multiple reports of unsafe driving behaviour',
    confirmLabel: 'Suspend user',
    submittingLabel: 'Suspending…',
  },
  block: {
    title: (name) => `Block ${name}?`,
    description: "They'll immediately lose access to their account until an admin reverses this.",
    reasonLabel: 'Block reason',
    placeholder: 'e.g. Repeated attempts to move payments off-platform',
    confirmLabel: 'Block user',
    submittingLabel: 'Blocking…',
  },
  ban: {
    title: (name) => `Permanently ban ${name}?`,
    description: "This is the most severe action available — their account will be permanently restricted.",
    reasonLabel: 'Ban reason',
    placeholder: 'e.g. Confirmed fraud / serious safety violation',
    confirmLabel: 'Permanently ban',
    submittingLabel: 'Banning…',
  },
};

export function SuspendModal({ userName, onCancel, onConfirm, submitting, action = 'suspend' }) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();
  const copy = ACCOUNT_ACTION_COPY[action] || ACCOUNT_ACTION_COPY.suspend;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={submitting ? undefined : onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden">
        <div className="px-6 sm:px-7 pt-7 pb-1 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-red-50 rounded-full mb-4">
            <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">{copy.title(userName)}</h2>
          <p className="text-sm text-gray-500 mt-1.5">
            {copy.description}
          </p>
        </div>

        <div className="px-6 sm:px-7 pt-5 pb-2">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            {copy.reasonLabel}
          </label>
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={copy.placeholder}
            rows={3}
            disabled={submitting}
            className="w-full border border-gray-200 px-3.5 py-2.5 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-150 outline-none resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1.5">This will be sent to the user by email.</p>
        </div>

        <div className="px-6 sm:px-7 pb-7 pt-4 flex gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(trimmed)}
            disabled={submitting || !trimmed}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {copy.submittingLabel}
              </>
            ) : copy.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Unsuspend confirmation modal ── */
function UnsuspendModal({ userName, onCancel, onConfirm, submitting }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={submitting ? undefined : onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden">
        <div className="px-6 sm:px-7 pt-7 pb-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-green-50 rounded-full mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Unsuspend {userName}?</h2>
          <p className="text-sm text-gray-500 mt-1.5">
            They'll immediately regain full access to their account.
          </p>
        </div>

        <div className="px-6 sm:px-7 pb-7 flex gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Unsuspending…
              </>
            ) : 'Unsuspend user'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserDetailModal({ user, onClose, onRefresh }) {
  const [rides, setRides] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');
  const [suspending, setSuspending] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null); // 'suspend' | 'unsuspend' | null

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [ridesRes, bookingsRes] = await Promise.allSettled([
          api.get(`/users/${user._id}/rides`),
          api.get(`/users/${user._id}/bookings`),
        ]);
        if (ridesRes.status === 'fulfilled') setRides(ridesRes.value.data?.data || []);
        if (bookingsRes.status === 'fulfilled') setBookings(bookingsRes.value.data?.data || []);
      } catch { }
      setLoading(false);
    };
    load();
  }, [user._id]);

  const confirmSuspend = async (reason) => {
    if (!reason) {
      toast.error('Suspension reason is required');
      return;
    }
    setSuspending(true);
    try {
      await api.put(`/users/${user._id}`, { accountStatus: 'SUSPENDED', suspensionReason: reason });
      toast.success('User suspended');
      setConfirmModal(null);
      onClose();
      onRefresh?.();
    } catch { toast.error('Failed to suspend user'); }
    setSuspending(false);
  };

  const confirmUnsuspend = async () => {
    setSuspending(true);
    try {
      await api.put(`/users/${user._id}`, { accountStatus: 'ACTIVE' });
      toast.success('User unsuspended');
      setConfirmModal(null);
      onClose();
      onRefresh?.();
    } catch { toast.error('Failed to unsuspend user'); }
    setSuspending(false);
  };

  const dv = user.driverVerification || {};

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-xl bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
              {(user.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">{user.name}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {['info', 'rides', 'bookings', 'verification'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-3 text-sm font-medium border-b-2 capitalize transition-all ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'info' && (
            <div className="space-y-1">
              <InfoRow label="User ID" value={user._id} />
              <InfoRow label="Name" value={user.name} />
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Phone" value={user.phone} />
              <InfoRow label="Role" value={user.role} />
              <InfoRow label="Gender" value={user.gender} />
              <InfoRow label="Date of Birth" value={fmtDate(user.dateOfBirth)} />
              <InfoRow label="Joined" value={fmtDate(user.createdAt)} />
              <InfoRow label="Last Login" value={fmtDate(user.lastLogin)} />
              <InfoRow label="Driver Verified" value={user.isDriverVerified ? '✓ Yes' : '✗ No'} />
              <InfoRow label="Total Rides" value={user.ratingSummary?.totalRides} />
              <InfoRow label="Avg Rating" value={user.ratingSummary?.averageRating > 0 ? user.ratingSummary.averageRating.toFixed(1) : 'N/A'} />

              {user.accountStatus === 'SUSPENDED' && user.suspensionReason && (
                <div className="mt-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Currently suspended</p>
                  <p className="text-sm text-red-800 font-medium">{user.suspensionReason}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'rides' && (
            loading ? <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
              : rides.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No rides posted</p>
                : <div className="space-y-3">
                  {rides.map(r => (
                    <div key={r._id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{r.start} → {r.end}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{fmtDate(r.date)} · {r.seats} seats · ₹{r.fare}</p>
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700">{r.status || 'active'}</span>
                      </div>
                    </div>
                  ))}
                </div>
          )}

          {tab === 'bookings' && (
            loading ? <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
              : bookings.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No bookings</p>
                : <div className="space-y-3">
                  {bookings.map(b => (
                    <div key={b._id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{b.pickupLocation} → {b.dropLocation}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{b.seatsBooked} seat(s) · ₹{b.totalFare || b.finalAmount || 0}</p>
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-50 text-green-700">{b.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
          )}

          {tab === 'verification' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-bold text-gray-400 uppercase mb-3">Verification Status</p>
                <div className="space-y-1">
                  <InfoRow label="Status" value={dv.status || 'not_started'} />
                  <InfoRow label="Submitted" value={fmtDate(dv.submittedAt)} />
                  <InfoRow label="Approved" value={fmtDate(dv.approvedAt)} />
                  <InfoRow label="Aadhaar #" value={dv.aadhaar?.numberMasked || dv.aadhaar?.number} />
                  <InfoRow label="DL Number" value={dv.drivingLicense?.number} />
                  <InfoRow label="DL Expiry" value={fmtDate(dv.drivingLicense?.expiryDate)} />
                </div>
              </div>
              {dv.auditTrail?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase mb-3">Audit Trail</p>
                  <div className="space-y-2">
                    {dv.auditTrail.map((a, i) => (
                      <div key={i} className="p-3 bg-white rounded-xl border border-gray-100">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900">{a.action}</p>
                          <p className="text-xs text-gray-400">{fmtDate(a.timestamp)}</p>
                        </div>
                        {a.remark && <p className="text-xs text-gray-600 mt-1">{a.remark}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex gap-3">
          {user.accountStatus === 'SUSPENDED' ? (
            <button onClick={() => setConfirmModal('unsuspend')} disabled={suspending}
              className="flex-1 py-2.5 bg-green-50 text-green-700 rounded-xl text-sm font-semibold hover:bg-green-100 transition-colors disabled:opacity-50">
              Unsuspend User
            </button>
          ) : (
            <button onClick={() => setConfirmModal('suspend')} disabled={suspending}
              className="flex-1 py-2.5 bg-red-50 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors disabled:opacity-50">
              Suspend User
            </button>
          )}
          <button onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">
            Close
          </button>
        </div>
      </div>

      {confirmModal === 'suspend' && (
        <SuspendModal
          userName={user.name}
          submitting={suspending}
          onCancel={() => setConfirmModal(null)}
          onConfirm={confirmSuspend}
        />
      )}
      {confirmModal === 'unsuspend' && (
        <UnsuspendModal
          userName={user.name}
          submitting={suspending}
          onCancel={() => setConfirmModal(null)}
          onConfirm={confirmUnsuspend}
        />
      )}
    </div>
  );
}