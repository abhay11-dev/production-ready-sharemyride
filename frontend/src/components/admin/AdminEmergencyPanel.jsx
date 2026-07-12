// src/components/admin/AdminEmergencyPanel.jsx


import React, { useState } from 'react';
import { useAdminEmergencyFeed } from '../../hooks/useAdminEmergencyFeed';
import * as emergencyService from '../../services/emergencyService';
import Icon from '../ui/Icon.jsx';

export default function AdminEmergencyPanel() {
  const { emergencies, loading, refresh } = useAdminEmergencyFeed();
  const [busyId, setBusyId] = useState(null);

  const handleAcknowledge = async (rideId, emergencyEventId) => {
    setBusyId(emergencyEventId);
    try {
      await emergencyService.acknowledgeSOS(rideId, emergencyEventId);
    } finally {
      setBusyId(null);
    }
  };

  const handleResolve = async (rideId, emergencyEventId, outcome) => {
    setBusyId(emergencyEventId);
    try {
      await emergencyService.resolveSOS(rideId, emergencyEventId, outcome);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading emergency feed…</div>;

  if (emergencies.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-gray-100 bg-white text-sm text-gray-500">
        No active emergencies.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {emergencies.map((e) => (
        <div key={e.emergencyEventId} className="p-4 rounded-xl border-2 border-red-500 bg-red-50 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-700 font-semibold">
              <Icon name="AlertOctagon" size="sm" />
              SOS — {e.triggeredByRole} ({e.triggeredByName || 'Unknown'})
            </div>
            {e.acknowledged && <span className="text-xs text-red-500 font-medium">Acknowledged</span>}
          </div>

          {e.location?.lat && (
            <p className="text-sm text-red-700">
              Last location: {e.location.lat.toFixed(5)}, {e.location.lng.toFixed(5)}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {!e.acknowledged && (
              <button
                onClick={() => handleAcknowledge(e.rideId, e.emergencyEventId)}
                disabled={busyId === e.emergencyEventId}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                Acknowledge
              </button>
            )}
            <button
              onClick={() => handleResolve(e.rideId, e.emergencyEventId, 'resolved')}
              disabled={busyId === e.emergencyEventId}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              Mark Resolved
            </button>
            <button
              onClick={() => handleResolve(e.rideId, e.emergencyEventId, 'false_alarm')}
              disabled={busyId === e.emergencyEventId}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              False Alarm
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}