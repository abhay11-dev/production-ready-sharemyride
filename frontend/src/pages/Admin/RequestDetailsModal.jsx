import React, { useState } from 'react';

const StatusBadge = ({ status }) => {
  const config = {
    submitted: { label: 'Under Review', cls: 'bg-blue-50 text-blue-600 border border-blue-200' },
    under_review: { label: 'Under Review', cls: 'bg-blue-50 text-blue-600 border border-blue-200' },
    approved: { label: '✓ Verified', cls: 'bg-green-50 text-green-600 border border-green-200' },
    rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-600 border border-red-200' },
    needs_info: { label: 'Needs Info', cls: 'bg-amber-50 text-amber-600 border border-amber-200' },
  };
  const { label, cls } = config[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`text-xs font-semibold px-3 py-1 rounded-full ${cls}`}>{label}</span>;
};

function RequestDetailsModal({ request, onClose, onUpdateStatus }) {
  const [remark, setRemark] = useState('');
  const [activeTab, setActiveTab] = useState('details'); // details, images, audit
  const [fullscreenImage, setFullscreenImage] = useState(null);

  if (!request) return null;

  const handleAction = (status) => {
    if (!remark && (status === 'rejected' || status === 'needs_info')) {
      alert("A remark is required for this action.");
      return;
    }
    onUpdateStatus(request._id, status, remark);
    setRemark('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      {/* Fullscreen Image/PDF Preview */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          {fullscreenImage.toLowerCase().includes('.pdf') ? (
            <iframe src={fullscreenImage} className="w-full h-[90vh] max-w-5xl bg-white rounded-lg" title="PDF Preview" />
          ) : (
            <img src={fullscreenImage} alt="Fullscreen preview" className="max-w-full max-h-full object-contain rounded-lg" />
          )}
          <button className="absolute top-6 right-6 text-white bg-black/50 p-2 rounded-full hover:bg-white hover:text-black transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              Request Details
              <StatusBadge status={request.status} />
            </h2>
            <p className="text-white/80 text-sm mt-1">ID: {request._id} • Submitted: {new Date(request.submittedAt).toLocaleDateString()}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-gray-50">
          
          {/* Sidebar Tabs */}
          <div className="md:w-48 bg-white border-r border-gray-100 flex-shrink-0 p-4 flex flex-row md:flex-col gap-2 overflow-x-auto">
            {['details', 'images', 'audit'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-left rounded-xl text-sm font-semibold transition-all capitalize ${activeTab === tab ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {tab === 'details' ? 'User Details' : tab === 'images' ? 'Verification Center' : 'Audit Trail'}
              </button>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            
            {/* DETAILS TAB */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <img src={request.documents.profilePhoto} alt="Profile" className="w-16 h-16 rounded-xl object-cover" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{request.user.name}</h3>
                    <p className="text-sm text-gray-500">{request.user.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Aadhaar Number</p>
                    <p className="text-gray-900 font-mono font-medium text-lg">{request.details.aadhaarNumber}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Driving License</p>
                    <p className="text-gray-900 font-mono font-medium text-lg">{request.details.dlNumber}</p>
                    <p className="text-xs text-gray-500 mt-1">Expires: {new Date(request.details.dlExpiry).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* IMAGES TAB */}
            {activeTab === 'images' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Click on any image to view in full screen. Ensure details match the user information.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Aadhaar Front', url: request.documents.aadhaarFront },
                    { label: 'Aadhaar Back', url: request.documents.aadhaarBack },
                    { label: 'Driving License Front', url: request.documents.dlFront },
                    { label: 'Driving License Back', url: request.documents.dlBack },
                  ].map((doc, idx) => (
                    <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{doc.label}</p>
                      <div 
                        className={`aspect-video bg-gray-100 rounded-xl overflow-hidden relative ${doc.url ? 'cursor-pointer group' : ''}`}
                        onClick={() => doc.url && setFullscreenImage(doc.url)}
                      >
                        {!doc.url ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 border border-dashed border-gray-200">
                            <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <span className="text-xs font-semibold">Not Uploaded</span>
                          </div>
                        ) : doc.url.toLowerCase().includes('.pdf') ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-500 transition-transform duration-300 group-hover:scale-105">
                            <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 9h1.5m1.5 0h1.5m-4.5 4h6m-6 4h6" /></svg>
                            <span className="text-xs font-bold uppercase tracking-wide">PDF Document</span>
                          </div>
                        ) : (
                          <img src={doc.url} alt={doc.label} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        )}
                        {doc.url && (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AUDIT TAB */}
            {activeTab === 'audit' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Action History</h3>
                <div className="space-y-6">
                  {request.auditTrail.map((log, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-50"></div>
                        {idx !== request.auditTrail.length - 1 && <div className="w-0.5 h-full bg-gray-100 my-1"></div>}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-bold text-gray-900">{log.action}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(log.timestamp).toLocaleString()} • by {log.admin}</p>
                        <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded-xl border border-gray-100">{log.remark}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="bg-white border-t border-gray-100 p-6 flex-shrink-0">
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Admin Remark (Required for Reject/Needs Info)</label>
            <input 
              type="text" 
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-0 focus:border-blue-500 bg-gray-50 focus:bg-white transition-colors"
              placeholder="Enter internal remark or reason for user..."
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => handleAction('approved')}
              className="flex-1 min-w-[120px] bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
            >
              Approve
            </button>
            <button 
              onClick={() => handleAction('needs_info')}
              className="flex-1 min-w-[120px] bg-gradient-to-r from-amber-500 to-amber-400 text-white py-3 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
            >
              Request Info
            </button>
            <button 
              onClick={() => handleAction('rejected')}
              className="flex-1 min-w-[120px] bg-gradient-to-r from-red-600 to-red-500 text-white py-3 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
            >
              Reject
            </button>
            <button 
              onClick={() => handleAction('under_review')}
              className="flex-1 min-w-[120px] bg-gray-800 text-white py-3 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
            >
              Mark Under Review
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default RequestDetailsModal;
