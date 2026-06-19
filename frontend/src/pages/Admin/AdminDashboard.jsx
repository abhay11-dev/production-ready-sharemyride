import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../config/api.js';
import { fetchRequests, updateRequestStatus } from '../../services/adminService';
import RequestDetailsModal from './RequestDetailsModal';

/**
 * Comprehensive Admin Portal for ShareMyRide
 * Point 16 Implementation: Full platform administration
 */

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Driver verification state
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  
  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    totalRides: 0,
    totalRevenue: 0,
    activeUsers: 0,
    avgRating: 4.8,
    cities: 0,
  });
  
  // Management data
  const [enquiries, setEnquiries] = useState([]);
  const [reports, setReports] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [rides, setRides] = useState([]);

  useEffect(() => {
    if (!localStorage.getItem('adminToken')) {
      navigate('/admin/login');
      return;
    }
    loadDashboardData();
  }, [navigate]);

  const loadDashboardData = async () => {
    try {
      // Load driver verification data
      const users = await fetchRequests();
      const formattedData = users.map(user => {
        const v = user.driverVerification || {};
        const docRef = (type, url) => ({
          type,
          url: url || "",
          available: Boolean(url),
        });
        return {
          _id: user._id,
          user: {
            name: user.name,
            email: user.email,
          },
          status: v.status || 'pending',
          submittedAt: v.submittedAt || user.createdAt,
          documents: {
            profilePhoto: docRef('profilePhoto', v.profilePhoto?.url),
            aadhaarFront: docRef('aadhaarFront', v.aadhaar?.frontImageUrl),
            aadhaarBack: docRef('aadhaarBack', v.aadhaar?.backImageUrl),
            dlFront: docRef('dlFront', v.drivingLicense?.frontImageUrl),
            dlBack: docRef('dlBack', v.drivingLicense?.backImageUrl)
          },
          avatarFallback: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'Driver')}`,
          details: {
            aadhaarNumber: v.aadhaar?.numberMasked || v.aadhaar?.number || "Not provided",
            dlNumber: v.drivingLicense?.number || "Not provided",
            dlExpiry: v.drivingLicense?.expiryDate || "Not provided"
          },
          auditTrail: v.auditTrail || []
        };
      });
      setRequests(formattedData);
      applyFilters(formattedData, searchTerm, statusFilter);
      
      // Load analytics data
      try {
        const analyticsRes = await api.get('/admin/analytics/summary');
        setAnalytics(analyticsRes.data?.data || analytics);
      } catch (e) { console.log('Analytics not available'); }
      
      // Load enquiries
      try {
        const enquiriesRes = await api.get('/admin/enquiries');
        setEnquiries(enquiriesRes.data?.data || []);
      } catch (e) { console.log('Enquiries not available'); }
      
      // Load reports
      try {
        const reportsRes = await api.get('/admin/reports');
        setReports(reportsRes.data?.data || []);
      } catch (e) { console.log('Reports not available'); }
      
      // Load blogs
      try {
        const blogsRes = await api.get('/admin/blogs');
        setBlogs(blogsRes.data?.data || []);
      } catch (e) { console.log('Blogs not available'); }
      
      // Load users
      try {
        const usersRes = await api.get('/admin/users');
        setUsers(usersRes.data?.data || []);
      } catch (e) { console.log('Users not available'); }
      
      // Load rides
      try {
        const ridesRes = await api.get('/admin/rides');
        setRides(ridesRes.data?.data || []);
      } catch (e) { console.log('Rides not available'); }
    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error('Failed to load dashboard data');
    }
  };

  const applyFilters = (data, search, filter) => {
    let result = data;
    if (filter !== 'all') {
      result = result.filter(r => r.status === filter);
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r =>
        r._id.toLowerCase().includes(s) ||
        r.user.name.toLowerCase().includes(s) ||
        r.user.email.toLowerCase().includes(s)
      );
    }
    setFilteredRequests(result);
  };

  useEffect(() => {
    applyFilters(requests, searchTerm, statusFilter);
  }, [searchTerm, statusFilter, requests]);

  const handleLogout = () => {
    localStorage.removeItem('isAdminAuthenticated');
    localStorage.removeItem('adminToken');
    toast.success('Logged out from Admin Portal');
    navigate('/admin/login');
  };

  const handleUpdateStatus = async (id, status, remark) => {
    try {
      await updateRequestStatus(id, status, remark);
      toast.success(`Request marked as ${status.replace('_', ' ')}`);
      setSelectedRequest(null);
      loadDashboardData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // New management handlers
  const handleUpdateEnquiry = async (id, status) => {
    try {
      await api.put(`/admin/enquiries/${id}`, { status });
      toast.success('Enquiry updated');
      loadDashboardData();
    } catch (err) {
      toast.error('Failed to update enquiry');
    }
  };

  const handleUpdateReport = async (id, status) => {
    try {
      await api.put(`/admin/reports/${id}`, { status });
      toast.success('Report updated');
      loadDashboardData();
    } catch (err) {
      toast.error('Failed to update report');
    }
  };

  // Stat Card Component
  function StatCard({ label, value, unit = '', icon, color = 'blue' }) {
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200',
      green: 'bg-green-50 border-green-200',
      purple: 'bg-purple-50 border-purple-200',
      amber: 'bg-amber-50 border-amber-200',
    };
    return (
      <div className={`rounded-2xl border ${colorClasses[color]} p-6`}>
        <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
        <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}{unit}</p>
        <div className="text-2xl mt-2">{icon}</div>
      </div>
    );
  }

  // Stats
  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'submitted' || r.status === 'under_review').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    needsInfo: requests.filter(r => r.status === 'needs_info').length,
  };

  const StatusBadge = ({ status }) => {
    const config = {
      submitted: { label: 'Pending', cls: 'bg-blue-50 text-blue-600 border border-blue-200' },
      under_review: { label: 'Reviewing', cls: 'bg-purple-50 text-purple-600 border border-purple-200' },
      approved: { label: 'Approved', cls: 'bg-green-50 text-green-600 border border-green-200' },
      rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-600 border border-red-200' },
      needs_info: { label: 'Needs Info', cls: 'bg-amber-50 text-amber-600 border border-amber-200' },
    };
    const { label, cls } = config[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
    return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-gray-900">ShareMyRide Admin</h1>
              <p className="text-xs text-gray-500">Platform Management</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm font-semibold text-gray-600 hover:text-red-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </nav>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'users', label: 'Users', icon: '👥' },
              { id: 'rides', label: 'Rides', icon: '🚗' },
              { id: 'verification', label: 'Driver Verification', icon: '✅' },
              { id: 'enquiries', label: 'Enquiries', icon: '💬' },
              { id: 'reports', label: 'Reports', icon: '🚨' },
              { id: 'blogs', label: 'Blogs', icon: '📝' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-900">Platform Metrics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <StatCard label="Total Users" value={analytics.totalUsers || 0} icon="👥" color="blue" />
              <StatCard label="Active Users" value={analytics.activeUsers || 0} icon="💚" color="green" />
              <StatCard label="Total Rides" value={analytics.totalRides || 0} icon="🚗" color="purple" />
              <StatCard label="Cities" value={analytics.cities || 0} icon="🗺️" color="amber" />
              <StatCard label="Avg Rating" value={(analytics.avgRating || 0).toFixed(1)} unit="★" icon="⭐" color="amber" />
              <StatCard label="Revenue" value={Math.floor((analytics.totalRevenue || 0) / 1000)} unit="K" icon="💰" color="green" />
            </div>

            {/* Recent Activity */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Recent Enquiries</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {enquiries.slice(0, 5).map((e) => (
                    <div key={e._id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="font-medium text-gray-900">{e.name}</p>
                      <p className="text-xs text-gray-600 mt-1">{e.message?.substring(0, 60)}...</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Urgent Reports</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {reports
                    .filter((r) => r.status === 'urgent' || r.severity === 'critical')
                    .slice(0, 5)
                    .map((r) => (
                      <div key={r._id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="font-medium text-red-900">{r.subject || 'Issue Report'}</p>
                        <p className="text-xs text-red-700 mt-1">Severity: {r.severity || 'Normal'}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">User Management</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-semibold text-sm text-gray-700">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-sm text-gray-700">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-sm text-gray-700">Phone</th>
                    <th className="text-left px-4 py-3 font-semibold text-sm text-gray-700">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-8 text-gray-500">No users found</td></tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700">{u.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{u.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{u.phone || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{new Date(u.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rides Tab */}
        {activeTab === 'rides' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Ride Tracking</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-semibold text-sm text-gray-700">From</th>
                    <th className="text-left px-4 py-3 font-semibold text-sm text-gray-700">To</th>
                    <th className="text-left px-4 py-3 font-semibold text-sm text-gray-700">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-sm text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rides.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-8 text-gray-500">No rides found</td></tr>
                  ) : (
                    rides.map((r) => (
                      <tr key={r._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700">{r.start}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{r.end}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{new Date(r.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">{r.status || 'pending'}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Driver Verification Tab */}
        {activeTab === 'verification' && (
          <div>

            <h2 className="text-lg font-bold text-gray-900 mb-6">Driver Verification Requests</h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {[
                { label: 'Total', value: requests.length, color: 'text-gray-900' },
                { label: 'Pending', value: requests.filter(r => r.status === 'submitted' || r.status === 'under_review').length, color: 'text-blue-600' },
                { label: 'Approved', value: requests.filter(r => r.status === 'approved').length, color: 'text-green-600' },
                { label: 'Needs Info', value: requests.filter(r => r.status === 'needs_info').length, color: 'text-amber-600' },
                { label: 'Rejected', value: requests.filter(r => r.status === 'rejected').length, color: 'text-red-600' },
              ].map((stat, idx) => (
                <div key={idx} className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-4 border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{stat.label}</p>
                  <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="bg-white rounded-2xl p-3 mb-6 border border-gray-100 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  placeholder="Search by ID, name, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {['all', 'submitted', 'under_review', 'approved', 'needs_info', 'rejected'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${statusFilter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Request ID</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Submitted</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredRequests.length > 0 ? (
                      filteredRequests.map((req) => (
                        <tr
                          key={req._id}
                          onClick={() => setSelectedRequest(req)}
                          className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={req.avatarFallback} alt="" className="w-10 h-10 rounded-lg" />
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{req.user.name}</p>
                                <p className="text-xs text-gray-500">{req.user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-sm text-gray-600">{req._id.substring(0, 8)}...</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{new Date(req.submittedAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                              req.status === 'approved' ? 'bg-green-50 text-green-600' :
                              req.status === 'rejected' ? 'bg-red-50 text-red-600' :
                              req.status === 'needs_info' ? 'bg-amber-50 text-amber-600' :
                              'bg-blue-50 text-blue-600'
                            }`}>
                              {req.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">No requests found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Enquiries Tab */}
        {activeTab === 'enquiries' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Enquiry Management</h2>
            {enquiries.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">No enquiries</div>
            ) : (
              enquiries.map((e) => (
                <div key={e._id} className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{e.name}</h3>
                      <p className="text-sm text-gray-600">{e.email}</p>
                      <p className="text-sm text-gray-700 mt-2">{e.message}</p>
                      <p className="text-xs text-gray-500 mt-2">{new Date(e.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleUpdateEnquiry(e._id, 'resolved')}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Issue Reports</h2>
            {reports.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">No reports</div>
            ) : (
              reports.map((r) => (
                <div key={r._id} className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{r.subject || r.title}</h3>
                      <p className="text-sm text-gray-600">{r.email}</p>
                      <p className="text-sm text-gray-700 mt-2">{r.message}</p>
                      <p className="text-xs text-gray-500 mt-2">{new Date(r.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <span className={`px-3 py-1 rounded text-xs font-medium ${
                        r.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        r.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {r.severity || 'Normal'}
                      </span>
                      <button
                        onClick={() => handleUpdateReport(r._id, 'resolved')}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Blogs Tab */}
        {activeTab === 'blogs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Blog Management</h2>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                New Blog
              </button>
            </div>
            {blogs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">No blogs</div>
            ) : (
              <div className="grid gap-4">
                {blogs.map((b) => (
                  <div key={b._id} className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900">{b.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">By {b.author}</p>
                    <div className="flex gap-4 mt-4 text-sm text-gray-600">
                      <span>👍 {b.likes || 0}</span>
                      <span>💬 {b.comments || 0}</span>
                      <span>📤 {b.shares || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  );
}

export default AdminDashboard;
