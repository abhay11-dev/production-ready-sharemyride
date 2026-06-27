import React from 'react';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider w-40 flex-shrink-0 mt-0.5">{label}</span>
      <span className="text-sm text-gray-800 flex-1">{value || '—'}</span>
    </div>
  );
}

export function RideDetailModal({ ride, onClose }) {
  const v = ride.vehicle || {};
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-lg bg-white h-full flex flex-col shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-bold text-gray-900">Ride Details</h2>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{ride._id}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Route */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-5 border border-blue-100">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
              <p className="font-bold text-gray-900">{ride.start}</p>
            </div>
            <div className="ml-1.5 border-l-2 border-dashed border-gray-300 h-4" />
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
              <p className="font-bold text-gray-900">{ride.end}</p>
            </div>
            <div className="mt-3 flex gap-4 text-sm text-gray-600">
              <span>📅 {fmtDate(ride.date)} · {ride.time}</span>
              <span>💺 {ride.availableSeats}/{ride.seats} seats</span>
              <span>💰 ₹{ride.fare}</span>
            </div>
          </div>

          {/* Driver */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-3">Driver Info</p>
            <div className="space-y-1">
              <InfoRow label="Name" value={ride.driver?.name || ride.driverInfo?.name} />
              <InfoRow label="Phone" value={ride.driver?.phone || ride.driverInfo?.phone} />
              <InfoRow label="Verified" value={ride.driverInfo?.verified ? '✓ Yes' : '✗ No'} />
              <InfoRow label="Emergency Contact" value={ride.driverInfo?.emergencyContact} />
            </div>
          </div>

          {/* Vehicle */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-3">Vehicle</p>
            <div className="space-y-1">
              <InfoRow label="Type" value={v.type} />
              <InfoRow label="Model" value={v.model} />
              <InfoRow label="Color" value={v.color} />
              <InfoRow label="Number" value={ride.vehicleNumber || v.number} />
              <InfoRow label="AC" value={v.acAvailable ? 'Yes' : 'No'} />
              <InfoRow label="Luggage" value={v.luggageSpace} />
            </div>
          </div>

          {/* Ride details */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-3">Ride Details</p>
            <div className="space-y-1">
              <InfoRow label="Status" value={ride.status || 'active'} />
              <InfoRow label="Fare Mode" value={ride.fareMode} />
              <InfoRow label="Per KM Rate" value={ride.perKmRate ? `₹${ride.perKmRate}` : undefined} />
              <InfoRow label="Distance" value={ride.totalDistance ? `${ride.totalDistance} km` : undefined} />
              <InfoRow label="Duration" value={ride.estimatedDuration ? `${ride.estimatedDuration} min` : undefined} />
              <InfoRow label="Toll Included" value={ride.tollIncluded ? 'Yes' : 'No'} />
              <InfoRow label="Negotiable" value={ride.negotiableFare ? 'Yes' : 'No'} />
              <InfoRow label="Waypoints" value={ride.waypoints?.length ? ride.waypoints.map(w => w.location).join(', ') : undefined} />
              <InfoRow label="Preferences" value={ride.preferences ? Object.entries(ride.preferences || {}).filter(([, v]) => v).map(([k]) => k).join(', ') : undefined} />
              <InfoRow label="Posted At" value={fmtDate(ride.createdAt)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RideDetailModal;