// src/pages/rides/NegotiationActions.jsx
//
// MILESTONE 3 (frontend) — real wiring for the negotiation action cards
// rendered under each RideCard search result. Previously every button here
// called a placeholder toast ("🚧 coming soon"); this version calls the
// real negotiationService functions and lands the user in the chat thread
// (Milestone 4) that the negotiation is automatically attached to.
//
// One modal handles all 5 action types (chat / negotiate_fare /
// request_partial / discuss_pickup / discuss_drop) since they all funnel
// into the same initiateNegotiation endpoint — only which fields are shown
// differs per type. This matches the "could literally reuse the chat UI"
// guidance in PROJECT_STATE.md §8 step 4.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toastService from '../../services/toastService';
import Icon from '../../components/ui/Icon';
import { useAuth } from '../../hooks/useAuth';
import { getNegotiationActions } from '../../utils/negotiationActions';
import { initiateNegotiation } from '../../services/negotiationService';

function ActionModal({ ride, action, onClose }) {
  const navigate = useNavigate();
  const [fare, setFare] = useState(ride.fare ?? '');
  const [pickupLocation, setPickupLocation] = useState(ride.start || '');
  const [dropLocation, setDropLocation] = useState(ride.end || '');
  const [seats, setSeats] = useState(1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const needsFare = action.key === 'negotiate_fare';
  const needsPickup = action.key === 'discuss_pickup' || action.key === 'request_partial';
  const needsDrop = action.key === 'discuss_drop' || action.key === 'request_partial';
  const needsSeats = action.key === 'request_partial';
  const messageRequired = action.key === 'chat';

  const availableSeats = ride.availableSeats ?? ride.seats ?? 1;

  const validate = () => {
    if (messageRequired && !message.trim()) {
      toastService.error('Please write a short message for the driver.');
      return false;
    }
    if (needsFare && fare !== '' && (isNaN(parseFloat(fare)) || parseFloat(fare) < 0)) {
      toastService.error('Enter a valid fare amount.');
      return false;
    }
    if (message.trim().length > 500) {
      toastService.error('Message is too long (max 500 characters).');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = { rideId: ride._id, source: action.key, message: message.trim() };
      if (needsFare && fare !== '') payload.proposedFare = parseFloat(fare);
      if (needsPickup) payload.pickupLocation = pickupLocation;
      if (needsDrop) payload.dropLocation = dropLocation;
      if (needsSeats) payload.seats = seats;

      const res = await initiateNegotiation(payload);
      const conversationId = res.conversationId || res.data?._id;
      const negotiationId = res.data?._id;

      toastService.success('Sent to the driver');
      onClose();

      if (conversationId) {
        navigate(`/messages/${conversationId}`, { state: { negotiationId } });
      } else {
        navigate('/messages');
      }
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 409 && data?.negotiationId) {
        toastService.warning('You already have an open request on this ride — opening it now.');
        onClose();
        navigate('/messages');
        return;
      }

      toastService.error(data?.message || 'Could not send your request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 px-6 py-4 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2 text-white">
            <Icon name={action.icon} size="dialog" className="text-white" />
            <h3 className="text-lg font-bold">{action.label}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors"
          >
            <Icon name="X" size="button" className="text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-500">{action.description}</p>

          {needsFare && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Your proposed fare (₹) <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="number" min="0" step="1" value={fare} disabled={loading}
                onChange={(e) => setFare(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder={`Listed fare: ₹${ride.fare ?? 0}`}
              />
            </div>
          )}

          {needsPickup && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Preferred pickup point</label>
              <input
                type="text" value={pickupLocation} disabled={loading}
                onChange={(e) => setPickupLocation(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          )}

          {needsDrop && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Preferred drop-off point</label>
              <input
                type="text" value={dropLocation} disabled={loading}
                onChange={(e) => setDropLocation(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          )}

          {needsSeats && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Seats needed</label>
              <select
                value={seats} disabled={loading}
                onChange={(e) => setSeats(parseInt(e.target.value, 10))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {Array.from({ length: Math.max(1, availableSeats) }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1} seat{i > 0 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Message {messageRequired ? '' : <span className="text-gray-400 font-normal">(optional)</span>}
            </label>
            <textarea
              value={message} disabled={loading} rows={3} maxLength={500}
              required={messageRequired}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder={messageRequired ? 'What would you like to ask?' : 'Add a note for the driver…'}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/500</p>
          </div>

          <div className="flex gap-3">
            <button
              type="button" onClick={onClose} disabled={loading}
              className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 py-2.5 rounded-xl font-semibold text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending…
                </>
              ) : 'Send to driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NegotiationActions({ ride }) {
  const { user } = useAuth();
  const [activeAction, setActiveAction] = useState(null);
  const actions = getNegotiationActions(ride);

  if (!actions.length) return null;

  const handleClick = (action) => {
    if (!user) {
      toastService.error('Sign in to contact the driver');
      return;
    }
    setActiveAction(action);
  };

  return (
    <>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={() => handleClick(action)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <Icon name={action.icon} size="xs" />
            {action.label}
          </button>
        ))}
      </div>

      {activeAction && (
        <ActionModal ride={ride} action={activeAction} onClose={() => setActiveAction(null)} />
      )}
    </>
  );
}