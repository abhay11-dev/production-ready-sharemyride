import React, { useState, useEffect } from 'react';
import api from '../../config/api.js';
import toast from 'react-hot-toast';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider w-36 flex-shrink-0 mt-0.5">{label}</span>
      <span className="text-sm text-gray-800 flex-1">{value || '—'}</span>
    </div>
  );
}

export default function UserDetailModal({ user, onClose, onRefresh }) {
  const [rides, setRides]       = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('info');
  const [suspending, setSuspending] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [ridesRes, bookingsRes] = await Promise.allSettled([
          api.get(`/admin/users/${user._id}/rides`),
          api.get(`/admin/users/${user._id}/bookings`),
        ]);
        if (ridesRes.status === 'fulfilled')    setRides(ridesRes.value.data?.data || []);
        if (bookingsRes.status === 'fulfilled') setBookings(bookingsRes.value.data?.data || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, [user._id]);

  const handleSuspend = async () => {
    if (!window.confirm(`Suspend ${user.name}? They will not be able to log in.`)) return;
    setSuspending(true);
    try {
      await api.put(`/admin/users/${user._id}`, { isSuspended: true });
      toast.success('User suspended');
      onClose();
      onRefresh?.();
    } catch { toast.error('Failed to suspend user'); }
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
              className={`px-3 py-3 text-sm font-medium border-b-2 capitalize transition-all ${
                tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'info' && (
            <div className="space-y-1">
              <InfoRow label="User ID"         value={user._id} />
              <InfoRow label="Name"            value={user.name} />
              <InfoRow label="Email"           value={user.email} />
              <InfoRow label="Phone"           value={user.phone} />
              <InfoRow label="Role"            value={user.role} />
              <InfoRow label="Gender"          value={user.gender} />
              <InfoRow label="Date of Birth"   value={fmtDate(user.dateOfBirth)} />
              <InfoRow label="Joined"          value={fmtDate(user.createdAt)} />
              <InfoRow label="Last Login"      value={fmtDate(user.lastLogin)} />
              <InfoRow label="Driver Verified" value={user.isDriverVerified ? '✓ Yes' : '✗ No'} />
              <InfoRow label="Total Rides"     value={user.ratingSummary?.totalRides} />
              <InfoRow label="Avg Rating"      value={user.ratingSummary?.averageRating?.toFixed(1)} />
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
                  <InfoRow label="Status"      value={dv.status || 'not_started'} />
                  <InfoRow label="Submitted"   value={fmtDate(dv.submittedAt)} />
                  <InfoRow label="Approved"    value={fmtDate(dv.approvedAt)} />
                  <InfoRow label="Aadhaar #"   value={dv.aadhaar?.numberMasked || dv.aadhaar?.number} />
                  <InfoRow label="DL Number"   value={dv.drivingLicense?.number} />
                  <InfoRow label="DL Expiry"   value={fmtDate(dv.drivingLicense?.expiryDate)} />
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
          <button onClick={handleSuspend} disabled={suspending}
            className="flex-1 py-2.5 bg-red-50 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors disabled:opacity-50">
            {suspending ? 'Suspending…' : 'Suspend User'}
          </button>
          <button onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}