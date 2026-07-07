// ═══════════════════════════════════════════════════════════════════════════
// NEGOTIATION CARDS — Milestone 2 (see PROJECT_STATE.md §6/§7)
//
// Renders only the negotiation/chat actions that apply to this specific ride
// (per getNegotiationActions). Renders nothing if no actions apply (e.g. an
// exact door-to-door match on a non-negotiable ride — nothing to negotiate).
//
// Milestone 3 will wire these buttons to the real Negotiation API. For now
// they show a "coming soon" toast so the UI isn't a dead end, and so the
// shape of this component doesn't need to change later — only handleAction
// below gets its toast.* call swapped for a real API call / navigation.
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { getNegotiationActions, NEGOTIATION_COMING_SOON_COPY } from '../../utils/negotiationActions';

const STYLE_CLASSES = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    accent: 'bg-amber-500 hover:bg-amber-600 text-white',
    secondary: 'border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300',
};

function NegotiationActions({ ride }) {
    const { user } = useAuth();
    const actions = getNegotiationActions(ride);

    if (!actions.length) return null;

    const handleAction = (actionKey) => {
        if (!user) {
            toast.error('Sign in to contact the driver', {
                style: { background: '#EF4444', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' },
            });
            return;
        }

        // TODO(Milestone 3): replace this with the real Negotiation API call /
        // navigation to the chat screen, e.g.:
        //   navigate(`/rides/${ride._id}/negotiate?action=${actionKey}`)
        toast(NEGOTIATION_COMING_SOON_COPY[actionKey] || 'This feature is launching soon.', {
            icon: '🚧',
            style: { background: '#1F2937', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' },
        });
    };

    return (
        <div className="flex flex-wrap gap-1.5 mt-3">
            {actions.map(action => (
                <button
                    key={action.key}
                    type="button"
                    onClick={() => handleAction(action.key)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${STYLE_CLASSES[action.style] || STYLE_CLASSES.secondary}`}
                >
                    {action.label}
                </button>
            ))}
        </div>
    );
}

export default NegotiationActions;