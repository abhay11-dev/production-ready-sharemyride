// src/components/ride/RideJourneyPanel.jsx


import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRideJourney } from '../../hooks/useRideJourney';
import { useSafetyCheckIn } from '../../hooks/useSafetyCheckIn';
import * as rideLifecycleService from '../../services/rideLifecycleService';
import Icon from '../ui/Icon.jsx';

const STAGE_LABELS = {
  scheduled: 'Scheduled',
  started: 'Driver on the way',
  boarding: 'Boarding',
  active: 'Ride in progress',
  destination_reached: 'Destination reached',
  completed: 'Ride completed',
  archived: 'Archived',
  cancelled: 'Cancelled'
};

const STAGE_ORDER = ['scheduled', 'started', 'boarding', 'active', 'destination_reached', 'completed'];

function StageProgress({ stage }) {
  if (stage === 'cancelled') {
    return (
      <div className="flex items-center gap-2 text-red-600 font-medium">
        <Icon name="XCircle" size="sm" />
        Ride cancelled
      </div>
    );
  }

  const currentIndex = STAGE_ORDER.indexOf(stage);

  return (
    <div className="flex items-center gap-1">
      {STAGE_ORDER.map((s, i) => (
        <React.Fragment key={s}>
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              i <= currentIndex ? 'bg-blue-600' : 'bg-gray-200'
            }`}
            title={STAGE_LABELS[s]}
          />
          {i < STAGE_ORDER.length - 1 && (
            <div className={`w-6 h-0.5 ${i < currentIndex ? 'bg-blue-600' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function RideJourneyPanel({ rideId, role /* 'driver' | 'passenger' */ }) {
  const { user } = useAuth();
  const { journey, loading, error, refresh } = useRideJourney(rideId);
  const { pendingCheck, respond, responding, alertBanner, dismissAlertBanner } = useSafetyCheckIn(rideId);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [consentBusy, setConsentBusy] = useState(false);

  const toggleLocationConsent = async (granted) => {
    setConsentBusy(true);
    try {
      await rideLifecycleService.setLocationConsent(rideId, granted);
      await refresh();
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not update location sharing preference');
    } finally {
      setConsentBusy(false);
    }
  };

  const runAction = async (fn) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await fn(rideId);
      await refresh();
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 rounded-xl border border-gray-100 bg-white animate-pulse">
        <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
        <div className="h-2 w-full bg-gray-100 rounded" />
      </div>
    );
  }

  // No journey yet: driver sees the "Start Ride" call to action, passenger
  // sees a waiting message. This is the pre-Phase-1-lifecycle state.
  if (!journey) {
    return (
      <div className="p-4 rounded-xl border border-gray-100 bg-white">
        <p className="text-sm text-gray-600 mb-3">
          {role === 'driver'
            ? "This ride hasn't started yet."
            : 'Waiting for the driver to start the ride.'}
        </p>
        {actionError && <p className="text-sm text-red-600 mb-2">{actionError}</p>}
        {role === 'driver' && (
          <button
            onClick={() => runAction(rideLifecycleService.startRide)}
            disabled={actionLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {actionLoading ? 'Starting…' : 'Start Ride'}
          </button>
        )}
      </div>
    );
  }

  const boardedCount = journey.passengers?.filter((p) => p.boarded).length ?? 0;
  const totalPassengers = journey.passengers?.length ?? 0;
  const myBoarding = journey.passengers?.find((p) => (p.user?._id || p.user) === user?._id);

  return (
    <div className="p-4 rounded-xl border border-gray-100 bg-white space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">Ride Status</p>
          <h3 className="text-lg font-semibold text-gray-900">{STAGE_LABELS[journey.stage]}</h3>
        </div>
        <StageProgress stage={journey.stage} />
      </div>

      {totalPassengers > 0 && (
        <p className="text-sm text-gray-500">
          {boardedCount}/{totalPassengers} passenger{totalPassengers > 1 ? 's' : ''} boarded
        </p>
      )}

      {/* Phase 5 — passenger-only location sharing opt-in. Off by default;
          driver's location is always visible (inherent to the ride), this
          only controls whether THIS passenger's own position is shared. */}
      {role === 'passenger' && myBoarding && (
        <label className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-gray-50 text-sm">
          <span className="text-gray-700">Share my live location during this ride</span>
          <input
            type="checkbox"
            checked={!!myBoarding.locationConsent?.granted}
            disabled={consentBusy}
            onChange={(e) => toggleLocationConsent(e.target.checked)}
          />
        </label>
      )}

      {/* Phase 3 — driver-side passive alert banner. Dismissible, never a
          modal: the driver is never forced to interact with this while
          driving. Admins receive the same escalation separately. */}
      {role === 'driver' && alertBanner && (
        <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-2">
            <Icon name="AlertTriangle" size="sm" className="text-amber-600 mt-0.5" />
            <p className="text-sm text-amber-800">
              A passenger requested {alertBanner.response === 'need_help' ? 'help' : 'support'}. Our team has been notified.
            </p>
          </div>
          <button onClick={dismissAlertBanner} className="text-amber-500 hover:text-amber-700 shrink-0">
            <Icon name="X" size="sm" />
          </button>
        </div>
      )}

      {/* Phase 3 — passenger-side one-tap check-in. Interactive, but
          intentionally minimal: three buttons, no typing required. */}
      {role === 'passenger' && pendingCheck && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
          <p className="text-sm text-blue-900">{pendingCheck.message}</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => respond('safe')}
              disabled={responding}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              I'm Safe
            </button>
            <button
              onClick={() => respond('need_help')}
              disabled={responding}
              className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              Need Help
            </button>
            <button
              onClick={() => respond('contact_support')}
              disabled={responding}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Contact Support
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      {/* Role-specific actions */}
      <div className="flex flex-wrap gap-2">
        {role === 'passenger' && ['started', 'boarding'].includes(journey.stage) && !myBoarding?.boarded && (
          <button
            onClick={() => runAction(rideLifecycleService.confirmBoarding)}
            disabled={actionLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {actionLoading ? 'Confirming…' : "I'm in the vehicle"}
          </button>
        )}

        {role === 'driver' && ['started', 'boarding'].includes(journey.stage) && (
          <button
            onClick={() => runAction(rideLifecycleService.beginActiveLeg)}
            disabled={actionLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {actionLoading ? 'Starting…' : 'Begin Journey'}
          </button>
        )}

        {role === 'driver' && journey.stage === 'active' && (
          <button
            onClick={() => runAction(rideLifecycleService.markDestinationReached)}
            disabled={actionLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {actionLoading ? 'Updating…' : 'Destination Reached'}
          </button>
        )}

        {role === 'driver' && journey.stage === 'destination_reached' && (
          <button
            onClick={() => runAction(rideLifecycleService.completeRide)}
            disabled={actionLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {actionLoading ? 'Completing…' : 'Complete Ride'}
          </button>
        )}
      </div>

      {/* Timeline */}
      {journey.timeline?.length > 0 && (
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-2">Timeline</p>
          <ul className="space-y-1.5 max-h-40 overflow-y-auto">
            {[...journey.timeline].reverse().map((event, i) => (
              <li key={i} className="text-sm text-gray-600 flex justify-between gap-3">
                <span>{event.message || event.event}</span>
                <span className="text-gray-400 shrink-0">
                  {new Date(event.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}