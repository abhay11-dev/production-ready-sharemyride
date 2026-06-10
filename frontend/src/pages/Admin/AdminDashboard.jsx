import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchRequests, updateRequestStatus } from '../../services/adminService';
import RequestDetailsModal from './RequestDetailsModal';

function AdminDashboard() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    // Check auth
    if (!localStorage.getItem('adminToken')) {
      navigate('/admin/login');
      return;
    }
    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
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
    } catch (err) {
      toast.error('Failed to load requests');
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
    toast.success('Logged out from Admin Portal');
    navigate('/admin/login');
  };

  const handleUpdateStatus = async (id, status, remark) => {
    try {
      await updateRequestStatus(id, status, remark);
      toast.success(`Request marked as ${status.replace('_', ' ')}`);
      setSelectedRequest(null);
      loadData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex flex-col">
      {/* Admin Navbar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-green-600 rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg">Admin Center</span>
          </div>
          <button 
            onClick={handleLogout}
            className="text-sm font-semibold text-gray-500 hover:text-red-600 flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Logout
          </button>
        </div>
      </nav>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Driver Verification</h1>
          <p className="text-gray-500 mt-1">Manage user documents and verify driver statuses.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900' },
            { label: 'Pending', value: stats.pending, color: 'text-blue-600' },
            { label: 'Approved', value: stats.approved, color: 'text-green-600' },
            { label: 'Needs Info', value: stats.needsInfo, color: 'text-amber-600' },
            { label: 'Rejected', value: stats.rejected, color: 'text-red-600' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{stat.label}</p>
              <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl p-2 mb-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              type="text" 
              placeholder="Search by ID, name, or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto p-1 hide-scrollbar">
            {['all', 'submitted', 'under_review', 'approved', 'needs_info', 'rejected'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize whitespace-nowrap transition-all ${
                  statusFilter === status 
                    ? 'bg-gray-900 text-white shadow-md transform scale-105' 
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
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
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={req.avatarFallback} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                          <div>
                            <p className="font-bold text-gray-900 text-sm group-hover:text-blue-700 transition-colors">{req.user.name}</p>
                            <p className="text-xs text-gray-500">{req.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-md">{req._id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{new Date(req.submittedAt).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-500">{new Date(req.submittedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      No requests found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modal Overlay */}
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
