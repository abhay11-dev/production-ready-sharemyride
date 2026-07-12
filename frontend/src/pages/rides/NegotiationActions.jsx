// src/pages/rides/NegotiationActions.jsx

import React, { useState, useEffect, useRef , useLayoutEffect} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import toastService from '../../services/toastService';
import Icon from '../../components/ui/Icon';
import { useAuth } from '../../hooks/useAuth';
import { getNegotiationActions, buildPrefillMessage, mapActionToSource } from '../../utils/negotiationActions';
import { initiateNegotiation } from '../../services/negotiationService';

function ActionModal({ ride, action, onClose }) {
  const navigate = useNavigate();
  const [fare, setFare] = useState(ride.fare ?? '');
  const [pickupLocation, setPickupLocation] = useState(ride.start || '');
  const [dropLocation, setDropLocation] = useState(ride.end || '');
  const [seats, setSeats] = useState(1);
  const [message, setMessage] = useState(() => buildPrefillMessage(action.key, { fare: ride.fare ?? '', pickupLocation: ride.start, dropLocation: ride.end, seats: 1 }));
  const [loading, setLoading] = useState(false);
  const messageEditedRef = useRef(false);

  const needsFare = action.key === 'negotiate_fare';
  const fareRequired = action.key === 'negotiate_fare';
  const needsPickup = action.key === 'discuss_pickup' || action.key === 'request_partial' || action.key === 'route_change';
  const needsDrop = action.key === 'discuss_drop' || action.key === 'request_partial' || action.key === 'route_change';
  const needsSeats = action.key === 'request_partial' || action.key === 'seat_request';

  const availableSeats = ride.availableSeats ?? ride.seats ?? 1;

  // Keep the prefilled message in sync with the fields that feed its
  // template (fare / pickup / drop) — but only until the user has actually
  // typed into the message box themselves, so we never clobber an edit
  // they've made.
  useEffect(() => {
    if (messageEditedRef.current) return;
    setMessage(buildPrefillMessage(action.key, { fare, pickupLocation, dropLocation, seats }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fare, pickupLocation, dropLocation, seats, action.key]);

  const handleMessageChange = (e) => {
    messageEditedRef.current = true;
    setMessage(e.target.value);
  };

  const validate = () => {
    if (!message.trim()) {
      toastService.error('Please write a short message for the driver.');
      return false;
    }
    if (fareRequired) {
      if (fare === '' || fare === null || fare === undefined) {
        toastService.error('Enter the fare you want to propose.');
        return false;
      }
      if (isNaN(parseFloat(fare)) || parseFloat(fare) <= 0) {
        toastService.error('Enter a valid fare amount greater than 0.');
        return false;
      }
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
      const trimmedMessage = message.trim();
      // action.key drives the UI (7 distinct entry points); the actual
      // `source` sent to the API is mapped to one of the backend's 5
      // existing valid values via mapActionToSource() — see
      // utils/negotiationActions.js for why this stays a frontend-only
      // concept rather than a Negotiation.source schema change.
      const payload = { rideId: ride._id, source: mapActionToSource(action.key), message: trimmedMessage };
      if (needsFare && fare !== '') payload.proposedFare = parseFloat(fare);
      if (needsPickup) payload.pickupLocation = pickupLocation;
      if (needsDrop) payload.dropLocation = dropLocation;
      if (needsSeats) payload.seats = seats;

      const res = await initiateNegotiation(payload);
      // NOTE: res.data is the Negotiation document, not a Conversation — its
      // _id must never be used as a conversationId. If the conversation
      // linkage failed server-side (best-effort, non-fatal there),
      // conversationId will be null and we fall back to the inbox instead
      // of building a broken /messages/:id URL.
      const conversationId = res.conversationId || null;
      const negotiationId = res.data?._id;

      toastService.success('Sent to the driver');
      onClose();

      if (conversationId) {
        navigate(`/messages/${conversationId}`, {
          state: { negotiationId, prefillText: trimmedMessage },
        });
      } else {
        toastService.info('Your request was sent — find the conversation in your inbox.');
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
                Your proposed fare (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number" min="1" step="1" value={fare} disabled={loading} required
                onChange={(e) => setFare(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder={`Listed fare: ₹${ride.fare ?? 0}`}
              />
              <p className="text-xs text-gray-400 mt-1">The driver will see this amount and can accept, decline, or counter it in chat.</p>
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
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {action.key === 'seat_request' ? 'Seats to reserve' : 'Seats needed'}
              </label>
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
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
              <span>Message to the driver</span>
              <span className="text-[11px] font-normal text-gray-400">Prefilled — edit as you like</span>
            </label>
            <textarea
              value={message} disabled={loading} rows={3} maxLength={500}
              required
              onChange={handleMessageChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
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
              ) : 'Continue to chat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Speech-cloud hover tooltip ────────────────────────────────────────────
// Explains what an action pill does before the user commits to opening the
// modal. Desktop: pure hover (group-hover), matches the overlay pattern
// already used on Home.jsx's ride cards. Mobile/touch: a tap toggles it
// open, and a second tap anywhere (or on the pill again) closes it — since
// hover doesn't exist on touch devices.
// ─── Speech-cloud hover tooltip ────────────────────────────────────────────
// Explains what an action pill does before the user commits to opening the
// modal. Uses local hover/focus state (NOT Tailwind's group/group-hover) —
// the card wrapping this component is itself a `.group` for its own hover
// effects, and group-hover matches ANY ancestor with that class, so nesting
// another `group` here made every tooltip on the card appear together.
// Local state scopes visibility to exactly the pill being interacted with.

function ActionPill({ action, onOpen }) {
  const [isActive, setIsActive] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);

  const measure = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({
      top: rect.top,
      left: rect.left + rect.width / 2,
    });
  };

  const show = () => { measure(); setIsActive(true); };
  const hide = () => setIsActive(false);

  // Keep position correct if the page scrolls/resizes while open
  useLayoutEffect(() => {
    if (!isActive) return;
    const onScrollOrResize = () => measure();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [isActive]);

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => onOpen(action)}
        onFocus={show}
        onBlur={hide}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1"
      >
        <Icon name={action.icon} size="xs" decorative />
        {action.label}
      </button>

     {coords && createPortal(
  <div
    role="tooltip"
    aria-hidden={!isActive}
    style={{ top: coords.top, left: coords.left }}
    className={`fixed z-[9999] w-56 max-w-[80vw]
      -translate-x-1/2 -translate-y-[calc(100%+10px)]
      origin-bottom
      transition-opacity transition-transform duration-200 ease-out
      pointer-events-none
      ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
  >
    <div className="bg-gray-900 text-white text-xs leading-snug rounded-xl px-3.5 py-3 shadow-xl shadow-black/25">
      <div className="flex items-center gap-1.5 font-semibold mb-1 text-indigo-200">
        <Icon name={action.icon} size="xs" className="text-indigo-300" decorative />
        {action.label}
      </div>
      <p className="text-gray-300">{action.description}</p>
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-gray-900 rotate-45 -mt-1.5" />
    </div>
  </div>,
  document.body
)}
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
      <div className="flex flex-wrap gap-2 mt-3">
  {actions.map((action) => (
    <ActionPill key={action.key} action={action} onOpen={handleClick} />
  ))}
</div>

      {activeAction && (
        <ActionModal ride={ride} action={activeAction} onClose={() => setActiveAction(null)} />
      )}
    </>
  );
}