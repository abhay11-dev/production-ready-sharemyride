import React from 'react';

const statusStyles = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-slate-50 text-slate-700 border-slate-200',
};

export default function RecentTicketsPanel({ tickets = [], title = 'Recent tickets', emptyMessage = 'No tickets submitted yet.' }) {
  const visibleTickets = Array.isArray(tickets) ? tickets : [];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">Your recent support requests stay visible here after refresh.</p>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
          {visibleTickets.length}
        </span>
      </div>

      {visibleTickets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center text-sm text-gray-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleTickets.map((ticket) => {
            const statusKey = (ticket.status || 'open').toLowerCase();
            const statusClass = statusStyles[statusKey] || statusStyles.open;
            return (
              <div key={ticket.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{ticket.subject || 'Untitled request'}</p>
                    <p className="mt-1 text-xs font-mono text-gray-500">ID: {ticket.id}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${statusClass}`}>
                    {ticket.status || 'open'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
