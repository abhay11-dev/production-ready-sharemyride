// src/utils/negotiationActions.js
//
// MILESTONE 2/3 (frontend) — defines the 5 canonical negotiation action
// types and which ones are eligible for a given ride. These keys match
// Negotiation.source in the backend model 1:1 — no translation layer.
//
// Eligibility rules here MUST stay in sync with the server-side checks in
// negotiationController.initiateNegotiation (negotiate_fare requires
// ride.negotiableFare, request_partial requires ride.allowPartialRoute).
// The frontend check only controls which buttons render; the backend check
// is the actual authorization boundary — see negotiationController.js.

export const NEGOTIATION_ACTIONS = {
  chat: {
    key: 'chat',
    label: 'Chat',
    icon: 'MessageCircle',
    description: 'Ask the driver a question before booking.',
  },
  negotiate_fare: {
    key: 'negotiate_fare',
    label: 'Negotiate fare',
    icon: 'IndianRupee',
    description: 'Propose a different fare for this ride.',
  },
  request_partial: {
    key: 'request_partial',
    label: 'Partial route',
    icon: 'Route',
    description: 'Ask to book only part of this route.',
  },
  discuss_pickup: {
    key: 'discuss_pickup',
    label: 'Pickup point',
    icon: 'MapPin',
    description: 'Suggest a different pickup point.',
  },
  discuss_drop: {
    key: 'discuss_drop',
    label: 'Drop point',
    icon: 'MapPinOff',
    description: 'Suggest a different drop-off point.',
  },
};

const ROUTE_DISCUSSION_ELIGIBLE_MATCH_TYPES = ['nearby', 'partial', 'negotiation'];

/**
 * Returns the list of negotiation actions eligible for a given ride, based
 * on Smart Search tier/matchType and ride-level flags (Milestone 1 fields).
 *
 * @param {Object} ride - a search-result ride, as returned by
 *   rideService.searchRides (carries matchTier/matchType/negotiableFare/
 *   allowPartialRoute alongside the normal Ride fields)
 * @returns {Array<Object>} eligible action descriptors, each shaped like an
 *   entry of NEGOTIATION_ACTIONS
 */
export function getNegotiationActions(ride) {
  if (!ride || ride.rideStatus === 'cancelled' || ride.rideStatus === 'completed') return [];

  const actions = [];

  // Chat is always available on any active, bookable ride — it's the
  // lowest-friction entry point and doesn't require any special ride flag.
  actions.push(NEGOTIATION_ACTIONS.chat);

  if (ride.negotiableFare) {
    actions.push(NEGOTIATION_ACTIONS.negotiate_fare);
  }

  if (ride.allowPartialRoute) {
    actions.push(NEGOTIATION_ACTIONS.request_partial);
  }

  // Pickup/drop discussion makes sense for route-matched results (Smart
  // Search tiers 3-6) where the passenger's exact point may legitimately
  // differ from the ride's default start/end.
  const isRouteMatched =
    ROUTE_DISCUSSION_ELIGIBLE_MATCH_TYPES.includes(ride.matchType) ||
    (typeof ride.matchTier === 'number' && ride.matchTier >= 3);

  if (isRouteMatched) {
    actions.push(NEGOTIATION_ACTIONS.discuss_pickup);
    actions.push(NEGOTIATION_ACTIONS.discuss_drop);
  }

  return actions;
}

export default { NEGOTIATION_ACTIONS, getNegotiationActions };