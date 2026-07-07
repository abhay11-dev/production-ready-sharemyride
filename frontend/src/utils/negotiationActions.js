// ═══════════════════════════════════════════════════════════════════════════
// NEGOTIATION CARDS — Milestone 2 (see PROJECT_STATE.md §6/§7)
//
// Pure logic: given a ride (as returned by searchRides, so it may carry
// matchTier/matchType from Milestone 1), decide which of the 5 negotiation
// actions from the spec should be offered:
//   - Chat with Driver
//   - Negotiate Ride     (fare negotiation)
//   - Request Partial Ride
//   - Discuss Pickup
//   - Discuss Drop
//
// DEFAULT RULES IN EFFECT (not yet confirmed by user — see PROJECT_STATE.md
// §5 Decisions Log; override here if the answer differs):
//   - "Negotiate Ride" shows when ride.negotiableFare === true
//     (chosen over the broader "OR allowPartialRoute" option, since fare
//     negotiation and partial-route requests are conceptually different asks
//     and conflating them would make "Negotiate Ride" fire on every partial
//     match even when the driver never opted into fare negotiation)
//   - "Request Partial Ride" shows when ride.allowPartialRoute === true AND
//     the ride is not already an exact door-to-door match (matchTier > 1,
//     or no matchTier available e.g. viewed outside search context — shown
//     by default in that case since we can't rule it out)
//   - "Discuss Pickup" shows for nearby-origin-only matches (matchTier 4) or
//     any negotiable ride that isn't an exact match
//   - "Discuss Drop" shows for nearby-destination-only matches (matchTier 5)
//     or any negotiable ride that isn't an exact match
//   - "Chat with Driver" always shows for any active ride — it's the lowest-
//     friction action and every negotiation starts with a message anyway
//
// This file has ZERO backend dependency. Milestone 3 will add the real
// Negotiation API; until then, action handlers in NegotiationActions.jsx
// show a "coming soon" toast instead of calling an endpoint.
// ═══════════════════════════════════════════════════════════════════════════

export function getNegotiationActions(ride) {
    if (!ride) return [];

    const tier = typeof ride.matchTier === 'number' ? ride.matchTier : null;
    const isExactMatch = tier === 1; // Tier 1 = same pickup AND same drop, nothing to negotiate
    const negotiable = !!ride.negotiableFare;
    const allowsPartial = !!ride.allowPartialRoute;

    const actions = [];

    // Always available — the entry point into any negotiation
    actions.push({
        key: 'chat',
        label: 'Chat with Driver',
        style: 'primary',
    });

    if (negotiable) {
        actions.push({
            key: 'negotiate_fare',
            label: 'Negotiate Ride',
            style: 'accent',
        });
    }

    if (allowsPartial && !isExactMatch) {
        actions.push({
            key: 'request_partial',
            label: 'Request Partial Ride',
            style: 'secondary',
        });
    }

    if (!isExactMatch && (tier === 4 || negotiable)) {
        actions.push({
            key: 'discuss_pickup',
            label: 'Discuss Pickup',
            style: 'secondary',
        });
    }

    if (!isExactMatch && (tier === 5 || negotiable)) {
        actions.push({
            key: 'discuss_drop',
            label: 'Discuss Drop',
            style: 'secondary',
        });
    }

    return actions;
}

// Human-readable "coming soon" copy per action — shown until Milestone 3
// (the real Negotiation API) exists. Centralized here so swapping this for
// a real API call later is a one-place change.
export const NEGOTIATION_COMING_SOON_COPY = {
    chat: "Direct chat is launching soon — you'll be able to message the driver right here.",
    negotiate_fare: "Fare negotiation is launching soon — you'll be able to propose your own price.",
    request_partial: "Partial-ride requests are launching soon — you'll be able to ask to join for part of the route.",
    discuss_pickup: "Pickup negotiation is launching soon — you'll be able to suggest a different pickup point.",
    discuss_drop: "Drop negotiation is launching soon — you'll be able to suggest a different drop point.",
};
