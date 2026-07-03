import React, { useState } from 'react';
import { clearStoredTickets } from '../../utils/ticketStorage';

const STATUS_CONFIG = {
  open: {
    label: 'Open',
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    ring: 'ring-blue-100',
  },
  pending: {
    label: 'Pending',
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    ring: 'ring-amber-100',
  },
  'in-progress': {
    label: 'In Progress',
    dot: 'bg-violet-500',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    ring: 'ring-violet-100',
  },
  resolved: {
    label: 'Resolved',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ring: 'ring-emerald-100',
  },
  closed: {
    label: 'Closed',
    dot: 'bg-slate-400',
    badge: 'bg-slate-50 text-slate-600 border-slate-200',
    ring: 'ring-slate-100',
  },
};

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function RecentTicketsPanel({
  tickets = [],
  title = 'Recent tickets',
  emptyMessage = 'No tickets submitted yet.',
  onClear,
}) {
  const [cleared, setCleared] = useState(false);
  const visibleTickets = Array.isArray(tickets) ? tickets : [];

  const handleClear = () => {
    clearStoredTickets();
    setCleared(true);
    if (onClear) onClear();
  };

  if (cleared || visibleTickets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </span>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
            <p className="text-xs text-gray-400">Persists across page refreshes</p>
          </div>
        </div>
        <div className="rounded-xl bg-gray-50 border border-dashed border-gray-200 px-4 py-5 text-center">
          <div className="text-2xl mb-1.5">🎫</div>
          <p className="text-sm text-gray-500">{emptyMessage}</p>
          <p className="text-xs text-gray-400 mt-1">Your ticket history is saved locally in your browser.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>
            <p className="text-xs text-gray-400">Saved locally · survives refresh</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-[11px] font-bold tabular-nums">
            {visibleTickets.length}
          </span>
          <button
            onClick={handleClear}
            title="Clear all tickets"
            className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Ticket list */}
      <div className="divide-y divide-gray-100">
        {visibleTickets.map((ticket) => {
          const statusKey = (ticket.status || 'open').toLowerCase().replace(' ', '-');
          const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.open;
          return (
            <div key={ticket.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
              {/* Animated status dot */}
              <span className="flex-shrink-0 mt-1">
                <span className={`relative flex h-2.5 w-2.5`}>
                  {statusKey === 'open' && (
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.dot} opacity-60`} />
                  )}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cfg.dot}`} />
                </span>
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                  {ticket.subject || 'Untitled request'}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <code className="text-[11px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    {ticket.id}
                  </code>
                  {ticket.savedAt && (
                    <span className="text-[11px] text-gray-400">{timeAgo(ticket.savedAt)}</span>
                  )}
                </div>
              </div>

              {/* Badge */}
              <span className={`flex-shrink-0 self-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${cfg.badge}`}>
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="px-5 py-2.5 bg-gray-50/70 border-t border-gray-100">
        <p className="text-[11px] text-gray-400 flex items-center gap-1">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Ticket IDs are saved in your browser. Share them with support for faster help.
        </p>
      </div>
    </div>
  );
}
