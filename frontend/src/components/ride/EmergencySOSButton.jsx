// src/components/ride/EmergencySOSButton.jsx


import React, { useState } from 'react';
import { useEmergency } from '../../hooks/useEmergency';
import Icon from '../ui/Icon.jsx';

export default function EmergencySOSButton({ rideId }) {
  const { activeEmergency, trigger, triggering, triggerResult, error } = useEmergency(rideId);
  const [confirming, setConfirming] = useState(false);

  // Already active — show status instead of another trigger control.
  if (activeEmergency) {
    return (
      <div className="p-4 rounded-xl bg-red-600 text-white space-y-1">
        <div className="flex items-center gap-2 font-semibold">
          <Icon name="AlertOctagon" size="sm" />
          Emergency alert active
        </div>
        <p className="text-sm text-red-100">
          {activeEmergency.acknowledged
            ? 'Our team has acknowledged this alert and is responding.'
            : 'Our team has been notified and is reviewing this now.'}
        </p>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="p-4 rounded-xl border-2 border-red-600 bg-red-50 space-y-3">
        <p className="text-sm font-medium text-red-800">
          This will alert our safety team and your emergency contacts immediately. Continue?
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                await trigger();
              } finally {
                setConfirming(false);
              }
            }}
            disabled={triggering}
            className="flex-1 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {triggering ? 'Sending alert…' : 'Yes, send SOS'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={triggering}
            className="px-4 py-3 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
        {triggerResult?.contacts?.length > 0 && (
          <p className="text-xs text-red-700">
            Notifying: {triggerResult.contacts.map((c) => c.name).join(', ')}
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      aria-label="Emergency SOS"
      className="w-full py-4 bg-red-600 text-white rounded-xl font-bold text-lg tracking-wide shadow-lg hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
    >
      <Icon name="AlertOctagon" size="lg" />
      SOS
    </button>
  );
}