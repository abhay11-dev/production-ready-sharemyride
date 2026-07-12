// src/utils/negotiationActions.js


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

// MILESTONE 5 — Preference cards (separate from NEGOTIATION_ACTIONS since
// each preference opens its own negotiation thread via source:'preference'
// + preferenceKey, rather than sharing one of the 5 original source types).
export const PREFERENCE_ACTIONS = {
  smoking: { key: 'smoking', label: 'Smoking', icon: 'Cigarette', description: 'Ask about smoking during the ride.' },
  music: { key: 'music', label: 'Music', icon: 'Music', description: 'Ask to play music during the ride.' },
  pets: { key: 'pets', label: 'Pets', icon: 'PawPrint', description: 'Ask about travelling with a pet.' },
  luggage: { key: 'luggage', label: 'Luggage', icon: 'Luggage', description: 'Ask about extra luggage space.' },
  womenOnly: { key: 'womenOnly', label: 'Women Only', icon: 'UserCheck', description: 'Ask about women-only seating.' },
  talkative: { key: 'talkative', label: 'Talkative', icon: 'MessagesSquare', description: 'Set expectations about conversation during the ride.' },
  childSeat: { key: 'childSeat', label: 'Child Seat', icon: 'Baby', description: 'Ask about a child seat.' },
  flexiblePickup: { key: 'flexiblePickup', label: 'Flexible Pickup', icon: 'MapPinned', description: 'Ask for a flexible pickup point.' },
};

/**
 * Builds the prefilled (editable) message for a preference card click.
 * Matches the exact wording style given in the Chat/Negotiation UX spec §2.
 *
 * @param {string} preferenceKey - one of PREFERENCE_ACTIONS keys
 * @param {boolean} requested - true = passenger wants it allowed
 * @returns {string}
 */
export function buildPreferencePrefillMessage(preferenceKey, requested = true) {
  switch (preferenceKey) {
    case 'smoking':
      return requested
        ? "I noticed smoking isn't allowed. Would you be comfortable making an exception?"
        : "Just confirming — smoking won't be an issue during the ride, right?";
    case 'music':
      return "I'd like to listen to music during the ride. Would that be okay?";
    case 'pets':
      return "I'll be travelling with a pet. Would that be okay?";
    case 'luggage':
      return "I'll have some extra luggage with me. Would that be alright?";
    case 'womenOnly':
      return "Is this ride women-only, or would that be something you could accommodate?";
    case 'talkative':
      return requested
        ? "I enjoy chatting during rides — hope that works for you!"
        : "I'd prefer a quiet ride if that's okay with you.";
    case 'childSeat':
      return "I'll need a child seat for the ride. Would that be possible?";
    case 'flexiblePickup':
      return "Would it be possible to have some flexibility on the pickup point?";
    default:
      return "I had a question about one of the ride preferences.";
  }
}

// Driver quick-reply templates for responding to a preference card (mirrors
// buildNegotiationResponseMessage below, but preference-specific wording).
export function buildPreferenceResponseMessage(preferenceKey, kind, note = '') {
  const label = PREFERENCE_ACTIONS[preferenceKey]?.label?.toLowerCase() || 'that';
  if (kind === 'accept') return `Sure, ${label} works fine for me.`;
  if (kind === 'decline') return `Sorry, I won't be able to accommodate ${label}.`;
  if (kind === 'counter') return note ? `I can't fully do that, but here's what I can offer: ${note}` : `I can partially accommodate ${label} — let's discuss.`;
  return '';
}

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

// ─── Prefilled message templates (Chat/Negotiation UX redesign §1, §8) ─────
//
// These are ONLY ever used to prefill an editable composer — never sent
// automatically (except the driver Accept/Decline quick-replies in §8,
// which are explicitly specified as auto-sent). Wording matches the spec's
// examples exactly so the experience is predictable across every entry point.

/**
 * Builds the prefilled (editable) first-message text for a negotiation
 * action, shown in the Chat Thread composer after the action modal is
 * submitted.
 *
 * @param {string} actionKey - one of NEGOTIATION_ACTIONS keys
 * @param {{ fare?: number|string, pickupLocation?: string, dropLocation?: string }} [fields]
 * @returns {string}
 */
export function buildPrefillMessage(actionKey, fields = {}) {
  const { fare, pickupLocation, dropLocation } = fields;

  switch (actionKey) {
    case 'negotiate_fare':
      return fare != null && fare !== ''
        ? `Hi! I would like to request a fare of ₹${fare} per seat instead of the listed price. Please let me know if this works for you.`
        : 'Hi! I would like to request a different fare than the listed price. Please let me know if this works for you.';
    case 'request_partial':
      if (pickupLocation && dropLocation) {
        return `Hi! I only need to travel from ${pickupLocation} to ${dropLocation}. Would you be comfortable offering a seat for this partial route?`;
      }
      return "Hi! I only need to travel part of this route. Would you be comfortable offering a seat for a partial route?";
    case 'discuss_pickup':
    case 'discuss_drop':
      return 'Hi! Would it be possible to slightly modify the pickup/drop route if it is convenient for you?';
    case 'chat':
    default:
      return "Hi! I'm interested in your ride. Is the seat still available?";
  }
}

// Canned driver quick-reply templates for responding to a negotiation
// (§8 "Driver Quick Reply UX"). Accept/Decline are sent immediately as a
// real chat message once the underlying negotiation action succeeds;
// Counter Offer only prefills the composer for review/edit before sending.
export function buildNegotiationResponseMessage(source, kind, terms = {}, counterFare = null) {
  const fare = terms.fare;

  if (kind === 'accept') {
    switch (source) {
      case 'negotiate_fare':
        return `Sure, I can offer the ride for ₹${fare} per seat.`;
      case 'request_partial':
        return terms.pickupLocation && terms.dropLocation
          ? `Sure, I can offer a seat for the ${terms.pickupLocation} to ${terms.dropLocation} route.`
          : 'Sure, that partial route works for me.';
      case 'discuss_pickup':
        return terms.pickupLocation ? `Sure, ${terms.pickupLocation} works fine as the pickup point.` : 'Sure, that pickup point works for me.';
      case 'discuss_drop':
        return terms.dropLocation ? `Sure, ${terms.dropLocation} works fine as the drop point.` : 'Sure, that drop point works for me.';
      default:
        return 'Sounds good, that works for me.';
    }
  }

  if (kind === 'decline') {
    switch (source) {
      case 'negotiate_fare':
        return "Sorry, I won't be able to reduce the fare.";
      case 'request_partial':
        return "Sorry, I can't accommodate that partial route.";
      case 'discuss_pickup':
        return "Sorry, I can't change the pickup point.";
      case 'discuss_drop':
        return "Sorry, I can't change the drop point.";
      default:
        return "Sorry, that won't work for me.";
    }
  }

  if (kind === 'counter') {
    return `I can't do ₹${fare}, but I can offer ₹${counterFare} per seat.`;
  }

  return '';
}

/**
 * Maps a UI action/card key to the Negotiation.source value the backend
 * expects. For the 5 standard negotiation actions the key already IS the
 * source (they're defined 1:1 in NEGOTIATION_ACTIONS above) — this only
 * does real work for preference keys, which all collapse to source:
 * 'preference' (the specific preference is carried separately via
 * preferenceKey, not via source).
 *
 * @param {string} actionKey - a NEGOTIATION_ACTIONS or PREFERENCE_ACTIONS key
 * @returns {string} a valid Negotiation.source value
 */
export function mapActionToSource(actionKey) {
  if (NEGOTIATION_ACTIONS[actionKey]) return actionKey;
  if (PREFERENCE_ACTIONS[actionKey]) return 'preference';
  return actionKey;
}

export default {
  NEGOTIATION_ACTIONS,
  getNegotiationActions,
  buildPrefillMessage,
  buildNegotiationResponseMessage,
  PREFERENCE_ACTIONS,
  buildPreferencePrefillMessage,
  buildPreferenceResponseMessage,
  mapActionToSource,
};