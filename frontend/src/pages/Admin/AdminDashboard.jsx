import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../config/api.js';
import { fetchRequests, updateRequestStatus } from '../../services/adminService.js';
import RequestDetailsModal from './RequestDetailsModal.jsx';
import UserDetailModal from './UserDetailModal.jsx';
import RideDetailModal from './RideDetailModal.jsx';
import BookingDetailModal from './BookingDetailModal.jsx';

/* ─── Constants ─────────────────────────────────────────── */
const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'users', label: 'Users', icon: '👥' },
  { id: 'rides', label: 'Rides', icon: '🚗' },
  { id: 'bookings', label: 'Bookings', icon: '🎫' },
  { id: 'payments', label: 'Payments', icon: '💳' },
  { id: 'verification', label: 'Driver Verification', icon: '✅' },
  { id: 'enquiries', label: 'Enquiries', icon: '💬' },
  { id: 'reports', label: 'Reports', icon: '🚨' },
  { id: 'blogs', label: 'Blogs', icon: '📝' },
];

/* ─── Utility ───────────────────────────────────────────── */
function fmt(n) {
  if (n === undefined || n === null) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return Number(n).toLocaleString('en-IN');
}
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
const fmtDT = (d) => d ? `${fmtDate(d)}, ${fmtTime(d)}` : '—';

/* ─── Shared Components ─────────────────────────────────── */
const Badge = ({ label, color = 'gray' }) => {
  const cls = {
    green: 'bg-green-50  text-green-700  border-green-200',
    red: 'bg-red-50    text-red-700    border-red-200',
    amber: 'bg-amber-50  text-amber-700  border-amber-200',
    blue: 'bg-blue-50   text-blue-700   border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray: 'bg-gray-100  text-gray-600   border-gray-200',
  }[color] || 'bg-gray-100 text-gray-600 border-gray-200';
  return <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cls}`}>{label}</span>;
};

const StatusBadge = ({ status }) => {
  const map = {
    submitted: { label: 'Pending', color: 'blue' },
    under_review: { label: 'Reviewing', color: 'purple' },
    approved: { label: 'Approved', color: 'green' },
    rejected: { label: 'Rejected', color: 'red' },
    needs_info: { label: 'Needs Info', color: 'amber' },
    completed: { label: 'Completed', color: 'green' },
    pending: { label: 'Pending', color: 'amber' },
    confirmed: { label: 'Confirmed', color: 'blue' },
    cancelled: { label: 'Cancelled', color: 'red' },
    active: { label: 'Active', color: 'green' },
    open: { label: 'Open', color: 'blue' },
    resolved: { label: 'Resolved', color: 'green' },
    critical: { label: 'Critical', color: 'red' },
    high: { label: 'High', color: 'amber' },
    published: { label: 'Published', color: 'green' },
    draft: { label: 'Draft', color: 'gray' },
    not_started: { label: 'Not Started', color: 'gray' },
  };
  const { label, color } = map[status] || { label: status, color: 'gray' };
  return <Badge label={label} color={color} />;
};

function StatCard({ label, value, unit = '', icon, color = 'blue', sub }) {
  const bg = {
    blue: 'bg-blue-50   border-blue-100',
    green: 'bg-green-50  border-green-100',
    purple: 'bg-purple-50 border-purple-100',
    amber: 'bg-amber-50  border-amber-100',
    red: 'bg-red-50    border-red-100',
  }[color];
  return (
    <div className={`rounded-2xl border ${bg} p-5`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-2xl font-black text-gray-900">{typeof value === 'number' ? fmt(value) : value}{unit}</p>
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
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
      />
    </div>
  );
}

function FilterPills({ options, value, onChange }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${value === opt.value ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ message, icon = '📭' }) {
  return (
    <div className="py-16 text-center text-gray-400">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

function Pagination({ page, total, limit, onPage }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
      <p className="text-xs text-gray-500">Page {page} of {pages} · {total} records</p>
      <div className="flex gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1}
          className="px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-40 hover:bg-gray-100 transition-colors">← Prev</button>
        <button onClick={() => onPage(page + 1)} disabled={page >= pages}
          className="px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-40 hover:bg-gray-100 transition-colors">Next →</button>
      </div>
    </div>
  );
}

/* ─── Overview Tab ──────────────────────────────────────── */
function OverviewTab({ analytics, enquiries, reports, verRequests }) {
  const urgent = reports.filter(r => r.severity === 'critical' || r.severity === 'high');
  const pending = verRequests.filter(r => r.status === 'submitted' || r.status === 'under_review');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-5">Platform Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total Users" value={analytics.totalUsers || 0} icon="👥" color="blue" />
          <StatCard label="Active (7d)" value={analytics.activeUsers || 0} icon="💚" color="green" />
          <StatCard label="Total Rides" value={analytics.totalRides || 0} icon="🚗" color="purple" />
          <StatCard label="Bookings" value={analytics.totalBookings || 0} icon="🎫" color="amber" />
          <StatCard label="Revenue" value={Math.floor((analytics.totalRevenue || 0) / 1000)} unit="K" icon="💰" color="green" />
          <StatCard label="Cities" value={analytics.totalCities || 0} icon="🗺️" color="amber" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pending Verifications" value={pending.length} icon="⏳" color="blue" />
        <StatCard label="Open Enquiries" value={enquiries.filter(e => e.status !== 'resolved').length} icon="💬" color="amber" />
        <StatCard label="Urgent Reports" value={urgent.length} icon="🚨" color="red" />
        <StatCard label="Avg Rating" value={(analytics.averageRating || 4.8).toFixed(1)} unit="★" icon="⭐" color="amber" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pending verifications */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>✅</span> Pending Verifications
            {pending.length > 0 && <Badge label={pending.length} color="blue" />}
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {pending.slice(0, 6).map(r => (
              <div key={r._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                <img src={r.avatarFallback} alt="" className="w-8 h-8 rounded-lg flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.user.name}</p>
                  <p className="text-xs text-gray-500">{fmtDate(r.submittedAt)}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
            {pending.length === 0 && <p className="text-sm text-gray-400 text-center py-4">All caught up 🎉</p>}
          </div>
        </div>

        {/* Recent enquiries */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><span>💬</span> Recent Enquiries</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {enquiries.slice(0, 5).map(e => (
              <div key={e._id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-900">{e.name || e.email}</p>
                  <StatusBadge status={e.status || 'open'} />
                </div>
                <p className="text-xs text-gray-500 truncate">{e.message || e.subject}</p>
                <p className="text-xs text-gray-400 mt-1">{fmtDate(e.createdAt)}</p>
              </div>
            ))}
            {enquiries.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No enquiries yet</p>}
          </div>
        </div>

        {/* Urgent reports */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>🚨</span> Urgent Reports
            {urgent.length > 0 && <Badge label={urgent.length} color="red" />}
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {urgent.slice(0, 5).map(r => (
              <div key={r._id} className="p-3 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-red-900">{r.subject || r.title || 'Report'}</p>
                  <StatusBadge status={r.severity} />
                </div>
                <p className="text-xs text-red-600 truncate">{r.message || r.description}</p>
                <p className="text-xs text-red-400 mt-1">{fmtDate(r.createdAt)}</p>
              </div>
            ))}
            {urgent.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No urgent reports 👍</p>}
          </div>
        </div>
      </div>

      {/* Revenue chart placeholder */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-900 mb-2">Revenue Overview</h3>
        <p className="text-xs text-gray-500 mb-4">Total platform revenue from completed payments</p>
        <div className="grid grid-cols-3 gap-6">
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
              ₹{analytics.totalBookings ? fmt(Math.round((analytics.totalRevenue || 0) / (analytics.totalBookings || 1))) : 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Avg Booking Value</p>
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
      const res = await api.get('/admin/users', { params: { page, limit: LIMIT, search } });
      setUsers(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">User Management</h2>
          <p className="text-xs text-gray-500 mt-0.5">{fmt(total)} registered users</p>
        </div>
        <div className="w-64"><SearchBar value={search} onChange={setSearch} placeholder="Search name or email…" /></div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['User', 'Phone', 'Role', 'Driver Status', 'Rides', 'Joined', 'Last Login'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan="7" className="px-4 py-3"><div className="h-3 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan="7"><EmptyState message="No users found" icon="👥" /></td></tr>
              ) : users.map(u => (
                <tr key={u._id} onClick={() => setSelected(u)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(u.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.phone || '—'}</td>
                  <td className="px-4 py-3"><Badge label={u.role || 'user'} color={u.role === 'admin' ? 'purple' : u.role === 'driver' ? 'green' : 'gray'} /></td>
                  <td className="px-4 py-3"><StatusBadge status={u.driverVerification?.status || 'not_started'} /></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.ratingSummary?.totalRides || 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{u.lastLogin ? fmtDate(u.lastLogin) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-4">
          <Pagination page={page} total={total} limit={LIMIT} onPage={setPage} />
        </div>
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
      const res = await api.get('/admin/rides', { params });
      setRides(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch { toast.error('Failed to load rides'); }
    finally { setLoading(false); }
  }, [page, statusF]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [statusF]);

  const STATUS_OPTS = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Ride Management</h2>
          <p className="text-xs text-gray-500 mt-0.5">{fmt(total)} total rides</p>
        </div>
        <FilterPills options={STATUS_OPTS} value={statusF} onChange={setStatusF} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Route', 'Driver', 'Date & Time', 'Seats', 'Fare', 'Status', 'Bookings'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan="7" className="px-4 py-3"><div className="h-3 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : rides.length === 0 ? (
                <tr><td colSpan="7"><EmptyState message="No rides found" icon="🚗" /></td></tr>
              ) : rides.map(r => (
                <tr key={r._id} onClick={() => setSelected(r)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />{r.start}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />{r.end}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{r.driver?.name || r.driverInfo?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(r.date)} {r.time}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.availableSeats ?? r.seats} / {r.seats}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{r.fare}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status || 'active'} /></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.bookingsCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-4">
          <Pagination page={page} total={total} limit={LIMIT} onPage={setPage} />
        </div>
      </div>
      {selected && <RideDetailModal ride={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* ─── Bookings Tab ──────────────────────────────────────── */
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
      const res = await api.get('/admin/bookings', { params });
      setBookings(res.data?.data || []);
      setTotal(res.data?.paginridemodalation?.total || 0);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  }, [page, statusF]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [statusF]);

  const STATUS_OPTS = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Booking Management</h2>
          <p className="text-xs text-gray-500 mt-0.5">{fmt(total)} total bookings</p>
        </div>
        <FilterPills options={STATUS_OPTS} value={statusF} onChange={setStatusF} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Passenger', 'Route', 'Seats', 'Total Fare', 'Payment', 'Status', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan="7" className="px-4 py-3"><div className="h-3 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : bookings.length === 0 ? (
                <tr><td colSpan="7"><EmptyState message="No bookings found" icon="🎫" /></td></tr>
              ) : bookings.map(b => (
                <tr key={b._id} onClick={() => setSelected(b)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">{b.passenger?.name || '—'}</p>
                    <p className="text-xs text-gray-500">{b.passenger?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-700 truncate max-w-[160px]">{b.pickupLocation} → {b.dropLocation}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{b.seatsBooked}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{b.totalFare || b.finalAmount || 0}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.paymentStatus || 'pending'} /></td>
                  <td className="px-4 py-3"><StatusBadge status={b.status || 'pending'} /></td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{fmtDate(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-4">
          <Pagination page={page} total={total} limit={LIMIT} onPage={setPage} />
        </div>
      </div>
      {selected && <BookingDetailModal booking={selected} onClose={() => setSelected(null)} />}
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
      const res = await api.get('/admin/payments', { params });
      setPayments(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch { toast.error('Failed to load payments'); }
    finally { setLoading(false); }
  }, [page, statusF]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [statusF]);

  const STATUS_OPTS = [
    { value: 'all', label: 'All' },
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' },
    { value: 'refunded', label: 'Refunded' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Payments</h2>
          <p className="text-xs text-gray-500 mt-0.5">{fmt(total)} transactions</p>
        </div>
        <FilterPills options={STATUS_OPTS} value={statusF} onChange={setStatusF} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Transaction ID', 'User', 'Amount', 'Method', 'Status', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan="6" className="px-4 py-3"><div className="h-3 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : payments.length === 0 ? (
                <tr><td colSpan="6"><EmptyState message="No payments found" icon="💳" /></td></tr>
              ) : payments.map(p => (
                <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.transactionId || p.razorpayPaymentId || p._id?.substring(0, 12) + '…'}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{p.user?.name || p.passenger?.name || '—'}</p>
                    <p className="text-xs text-gray-500">{p.user?.email || p.passenger?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">₹{p.amount || 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">{p.method || p.paymentMethod || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{fmtDT(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-4">
          <Pagination page={page} total={total} limit={LIMIT} onPage={setPage} />
        </div>
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
    const matchSearch = !search ||
      r._id.toLowerCase().includes(s) ||
      r.user.name.toLowerCase().includes(s) ||
      r.user.email.toLowerCase().includes(s);
    return matchStatus && matchSearch;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'submitted').length,
    reviewing: requests.filter(r => r.status === 'under_review').length,
    approved: requests.filter(r => r.status === 'approved').length,
    needsInfo: requests.filter(r => r.status === 'needs_info').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const STATUS_OPTS = [
    { value: 'all', label: `All (${stats.total})` },
    { value: 'submitted', label: `Pending (${stats.pending})` },
    { value: 'under_review', label: `Reviewing (${stats.reviewing})` },
    { value: 'approved', label: `Approved (${stats.approved})` },
    { value: 'needs_info', label: `Needs Info (${stats.needsInfo})` },
    { value: 'rejected', label: `Rejected (${stats.rejected})` },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900">Driver Verification Requests</h2>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900' },
          { label: 'Pending', value: stats.pending, color: 'text-blue-600' },
          { label: 'Review', value: stats.reviewing, color: 'text-purple-600' },
          { label: 'Approved', value: stats.approved, color: 'text-green-600' },
          { label: 'Needs Info', value: stats.needsInfo, color: 'text-amber-600' },
          { label: 'Rejected', value: stats.rejected, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by ID, name or email…" />
        </div>
        <FilterPills options={STATUS_OPTS} value={statusF} onChange={setStatusF} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['User', 'Request ID', 'Documents', 'Submitted', 'Status', 'Action'].map(h => (
                  <th key={h} className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan="6"><EmptyState message="No requests found" icon="✅" /></td></tr>
              ) : filtered.map(req => {
                const docs = req.documents || {};
                const docCount = Object.values(docs).filter(d => d?.available).length;
                const totalDocs = Object.keys(docs).length;
                return (
                  <tr key={req._id} onClick={() => setSelected(req)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img src={req.avatarFallback} alt="" className="w-9 h-9 rounded-lg flex-shrink-0" />
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{req.user.name}</p>
                          <p className="text-xs text-gray-500">{req.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-500">{req._id.substring(0, 10)}…</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(docCount / totalDocs) * 100}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{docCount}/{totalDocs}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">{fmtDate(req.submittedAt)}</td>
                    <td className="px-5 py-4"><StatusBadge status={req.status} /></td>
                    <td className="px-5 py-4 text-right">
                      <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
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

/* ─── Enquiries Tab ─────────────────────────────────────── */
function EnquiriesTab() {
  const [enquiries, setEnquiries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState('all');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (statusF !== 'all') params.status = statusF;
      const res = await api.get('/admin/enquiries', { params });
      setEnquiries(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch { toast.error('Failed to load enquiries'); }
    finally { setLoading(false); }
  }, [page, statusF]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [statusF]);

  const handleUpdate = async (id, status) => {
    try {
      await api.put(`/admin/enquiries/${id}`, { status });
      toast.success(`Enquiry marked as ${status}`);
      load();
    } catch { toast.error('Failed to update enquiry'); }
  };

  const STATUS_OPTS = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Enquiry Management</h2>
          <p className="text-xs text-gray-500 mt-0.5">{fmt(total)} enquiries</p>
        </div>
        <FilterPills options={STATUS_OPTS} value={statusF} onChange={setStatusF} />
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />
        ))}</div>
      ) : enquiries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12"><EmptyState message="No enquiries" icon="💬" /></div>
      ) : (
        <div className="space-y-3">
          {enquiries.map(e => (
            <div key={e._id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div
                className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(expanded === e._id ? null : e._id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-gray-900">{e.name || e.email}</p>
                      <StatusBadge status={e.status || 'open'} />
                    </div>
                    <p className="text-sm text-gray-500">{e.email} {e.phone ? `· ${e.phone}` : ''}</p>
                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">{e.message || e.subject}</p>
                    <p className="text-xs text-gray-400 mt-1">{fmtDT(e.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {e.status !== 'resolved' && (
                      <>
                        <button onClick={(ev) => { ev.stopPropagation(); handleUpdate(e._id, 'in_progress'); }}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors">
                          In Progress
                        </button>
                        <button onClick={(ev) => { ev.stopPropagation(); handleUpdate(e._id, 'resolved'); }}
                          className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100 transition-colors">
                          Resolve
                        </button>
                      </>
                    )}
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded === e._id ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              {expanded === e._id && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-400 text-xs font-bold uppercase">Type</span><p className="text-gray-700 mt-0.5">{e.type || e.subject || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs font-bold uppercase">Contact</span><p className="text-gray-700 mt-0.5">{e.phone || '—'}</p></div>
                  </div>
                  <div className="mt-3">
                    <span className="text-gray-400 text-xs font-bold uppercase">Full Message</span>
                    <p className="text-gray-700 mt-1 text-sm leading-relaxed">{e.message}</p>
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

/* ─── Reports Tab ───────────────────────────────────────── */
function ReportsTab() {
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [severityF, setSeverityF] = useState('all');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (severityF !== 'all') params.severity = severityF;
      const res = await api.get('/admin/reports', { params });
      setReports(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  }, [page, severityF]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [severityF]);

  const handleUpdate = async (id, status) => {
    try {
      await api.put(`/admin/reports/${id}`, { status });
      toast.success('Report updated');
      load();
    } catch { toast.error('Failed to update report'); }
  };

  const SEVERITY_OPTS = [
    { value: 'all', label: 'All' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Issue Reports</h2>
          <p className="text-xs text-gray-500 mt-0.5">{fmt(total)} reports</p>
        </div>
        <FilterPills options={SEVERITY_OPTS} value={severityF} onChange={setSeverityF} />
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />
        ))}</div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12"><EmptyState message="No reports" icon="🚨" /></div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r._id} className={`bg-white rounded-2xl border overflow-hidden ${r.severity === 'critical' ? 'border-red-200' : 'border-gray-200'}`}>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <p className="font-semibold text-gray-900">{r.subject || r.title || 'Issue Report'}</p>
                      <StatusBadge status={r.severity || 'medium'} />
                      <StatusBadge status={r.status || 'open'} />
                    </div>
                    <p className="text-xs text-gray-500">{r.email} {r.rideId ? `· Ride: ${r.rideId}` : ''}</p>
                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">{r.message || r.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{fmtDT(r.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {r.status !== 'resolved' && (
                      <button onClick={() => handleUpdate(r._id, 'resolved')}
                        className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100 transition-colors">
                        Resolve
                      </button>
                    )}
                  </div>
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
      const res = await api.get('/admin/blogs', { params });
      setBlogs(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch { toast.error('Failed to load blogs'); }
    finally { setLoading(false); }
  }, [page, statusF]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [statusF]);

  const handleUpdate = async (id, status) => {
    try {
      await api.put(`/admin/blogs/${id}`, { status });
      toast.success(`Blog ${status}`);
      load();
    } catch { toast.error('Failed to update blog'); }
  };

  const STATUS_OPTS = [
    { value: 'all', label: 'All' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'archived', label: 'Archived' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Blog Management</h2>
          <p className="text-xs text-gray-500 mt-0.5">{fmt(total)} posts</p>
        </div>
        <div className="flex items-center gap-3">
          <FilterPills options={STATUS_OPTS} value={statusF} onChange={setStatusF} />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4">{Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />
        ))}</div>
      ) : blogs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12"><EmptyState message="No blogs" icon="📝" /></div>
      ) : (
        <div className="grid gap-4">
          {blogs.map(b => (
            <div key={b._id} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{b.title}</h3>
                    <StatusBadge status={b.status || 'draft'} />
                  </div>
                  <p className="text-sm text-gray-500">By {b.author?.name || b.author || '—'} · {fmtDate(b.createdAt)}</p>
                  {b.excerpt && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{b.excerpt}</p>}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>👍 {b.likes || 0}</span>
                    <span>💬 {Array.isArray(b.comments) ? b.comments.length : (b.comments || 0)}</span>
                    <span>👁️ {b.views || 0}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {b.status !== 'published' && (
                    <button onClick={() => handleUpdate(b._id, 'published')}
                      className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100 transition-colors">
                      Publish
                    </button>
                  )}
                  {b.status === 'published' && (
                    <button onClick={() => handleUpdate(b._id, 'archived')}
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors">
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

/* ─── Root Dashboard Component ──────────────────────────── */
function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState({});
  const [verRequests, setVerRequests] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    if (!localStorage.getItem('adminToken')) {
      navigate('/admin/login');
      return;
    }
    loadCore();
  }, [navigate]);

  const loadCore = async () => {
    try {
      // Verification requests
      const users = await fetchRequests();
      const formatted = users.map(user => {
        const v = user.driverVerification || {};
        const docRef = (type, url) => ({ type, url: url || '', available: Boolean(url) });
        return {
          _id: user._id,
          user: { name: user.name, email: user.email },
          status: v.status || 'pending',
          submittedAt: v.submittedAt || user.createdAt,
          documents: {
            profilePhoto: docRef('profilePhoto', v.profilePhoto?.url),
            aadhaarFront: docRef('aadhaarFront', v.aadhaar?.frontImageUrl),
            aadhaarBack: docRef('aadhaarBack', v.aadhaar?.backImageUrl),
            dlFront: docRef('dlFront', v.drivingLicense?.frontImageUrl),
            dlBack: docRef('dlBack', v.drivingLicense?.backImageUrl),
          },
          avatarFallback: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'Driver')}&background=1a56db&color=fff`,
          details: {
            aadhaarNumber: v.aadhaar?.numberMasked || v.aadhaar?.number || 'Not provided',
            dlNumber: v.drivingLicense?.number || 'Not provided',
            dlExpiry: v.drivingLicense?.expiryDate || 'Not provided',
          },
          auditTrail: v.auditTrail || [],
        };
      });
      setVerRequests(formatted);
    } catch (err) {
      console.error('Failed to load verifications:', err);
    }

    try {
      const res = await api.get('/admin/analytics/summary');
      setAnalytics(res.data?.data || {});
    } catch { }

    try {
      const res = await api.get('/admin/enquiries', { params: { limit: 50 } });
      setEnquiries(res.data?.data || []);
    } catch { }

    try {
      const res = await api.get('/admin/reports', { params: { limit: 50 } });
      setReports(res.data?.data || []);
    } catch { }
  };

  const handleUpdateVerification = async (id, status, remark) => {
    try {
      await updateRequestStatus(id, status, remark);
      toast.success(`Marked as ${status.replace('_', ' ')}`);
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdminAuthenticated');
    localStorage.removeItem('adminToken');
    toast.success('Signed out');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">ShareMyRide Admin</h1>
              <p className="text-xs text-gray-400">Platform Management</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-red-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </nav>

      {/* Tab Nav */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                  }`}
              >
                <span className="text-base">{tab.icon}</span>
                {tab.label}
                {tab.id === 'verification' && verRequests.filter(r => r.status === 'submitted').length > 0 && (
                  <span className="ml-1 text-xs bg-blue-600 text-white rounded-full px-1.5 py-0.5 font-bold">
                    {verRequests.filter(r => r.status === 'submitted').length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewTab analytics={analytics} enquiries={enquiries} reports={reports} verRequests={verRequests} />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'rides' && <RidesTab />}
        {activeTab === 'bookings' && <BookingsTab />}
        {activeTab === 'payments' && <PaymentsTab />}
        {activeTab === 'verification' && (
          <VerificationTab
            requests={verRequests}
            onUpdate={handleUpdateVerification}
            onRefresh={loadCore}
          />
        )}
        {activeTab === 'enquiries' && <EnquiriesTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'blogs' && <BlogsTab />}
      </main>
    </div>
  );
}

export default AdminDashboard;