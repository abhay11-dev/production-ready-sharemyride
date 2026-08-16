import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDriverBookings } from '../../services/bookingService';
import toastService from '../../services/toastService';

// ── Icons ──────────────────────────────────────────────────────────────────
const Icon = {
    wallet: (cls) => (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
    ),
    clock: (cls) => (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    calendar: (cls) => (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    ),
    check: (cls) => (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    ),
    spinner: (cls) => (
        <svg className={`animate-spin ${cls}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    ),
    route: (cls) => (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.553 2.776A1 1 0 0021 18.382V7.618a1 1 0 00-.447-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
    ),
    empty: (cls) => (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    bank: (cls) => (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M4 10h16M4 10l8-6 8 6M6 10v11m4-11v11m4-11v11m4-11v11" />
        </svg>
    ),
};

// ── Payout status mapping ──────────────────────────────────────────────────
// Booking-level payout status isn't specified in the build guide's schema,
// so this reads several plausible field names (payoutStatus, payout?.status,
// transaction?.payoutStatus) and falls back to a sane default derived from
// booking.status, so the page still renders usefully before the exact field
// is confirmed against the backend.
const resolvePayoutStatus = (booking) => {
    const raw =
        booking.payoutStatus ||
        booking.payout?.status ||
        booking.transaction?.payoutStatus ||
        (booking.status === 'completed' ? 'processing' : null);

    if (!raw) return { key: 'unknown', label: 'Unknown', className: 'bg-gray-100 text-gray-600' };

    const normalized = String(raw).toLowerCase();
    if (['paid', 'settled', 'success', 'completed'].includes(normalized)) {
        return { key: 'paid', label: 'Settled to Bank', className: 'bg-green-100 text-green-700' };
    }
    if (['processing', 'pending', 'queued', 'initiated'].includes(normalized)) {
        return { key: 'processing', label: 'Processing', className: 'bg-amber-100 text-amber-700' };
    }
    if (['failed', 'reversed'].includes(normalized)) {
        return { key: 'failed', label: 'Failed', className: 'bg-red-100 text-red-700' };
    }
    return { key: 'unknown', label: raw, className: 'bg-gray-100 text-gray-600' };
};

const formatCurrency = (n) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (d) => {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return '—';
    }
};

// Next payout date: RazorpayX-style weekly settlement cycles are common;
// without a backend field for this, show the upcoming Friday as a
// reasonable placeholder and label it clearly as an estimate.
const getEstimatedNextPayoutDate = () => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sun ... 5 = Fri
    const daysUntilFriday = (5 - day + 7) % 7 || 7;
    const next = new Date(now);
    next.setDate(now.getDate() + daysUntilFriday);
    return next;
};

const Earnings = () => {
    const { user } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all | paid | processing

    useEffect(() => {
        fetchEarnings();
    }, []);

    const fetchEarnings = async () => {
        try {
            setLoading(true);
            const driverResponse = await getDriverBookings();
            const completed = (driverResponse || []).filter(b => b.status === 'completed' && b.paymentStatus === 'completed');
            completed.sort((a, b) => new Date(b.ride?.date) - new Date(a.ride?.date));
            setBookings(completed);
        } catch (error) {
            console.error('Failed to load earnings:', error);
            toastService.error('Failed to load earnings', 'Please refresh the page and try again.');
        } finally {
            setLoading(false);
        }
    };

    const metrics = useMemo(() => {
        let total = 0;
        let pending = 0;

        bookings.forEach((b) => {
            const fare = b.baseFare || 0;
            total += fare;
            const status = resolvePayoutStatus(b);
            if (status.key !== 'paid') pending += fare;
        });

        return { total, pending, rideCount: bookings.length };
    }, [bookings]);

    const filteredBookings = useMemo(() => {
        if (filter === 'all') return bookings;
        return bookings.filter(b => resolvePayoutStatus(b).key === filter);
    }, [bookings, filter]);

    const nextPayoutDate = getEstimatedNextPayoutDate();

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Loading your earnings…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ── HEADER ── */}
            <div className="bg-gradient-to-r from-green-700 via-green-600 to-emerald-500 pt-6 pb-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-3 mb-1.5">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                            {Icon.wallet('w-5 h-5 text-white')}
                        </div>
                        <h1 className="text-lg sm:text-2xl font-bold text-white leading-tight">Driver Earnings</h1>
                    </div>
                    <p className="text-green-100 text-xs sm:text-sm ml-0.5">
                        Track your ride payouts and settlements
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 pb-16">

                {/* ── Metric cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
                                {Icon.wallet('w-4.5 h-4.5 text-green-600')}
                            </div>
                            <p className="text-xs font-semibold text-gray-500">Total Earnings</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.total)}</p>
                        <p className="text-[11px] text-gray-400 mt-1">{metrics.rideCount} completed {metrics.rideCount === 1 ? 'ride' : 'rides'}</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
                                {Icon.clock('w-4.5 h-4.5 text-amber-600')}
                            </div>
                            <p className="text-xs font-semibold text-gray-500">Pending Payouts</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.pending)}</p>
                        <p className="text-[11px] text-gray-400 mt-1">Not yet settled to bank</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                                {Icon.calendar('w-4.5 h-4.5 text-blue-600')}
                            </div>
                            <p className="text-xs font-semibold text-gray-500">Next Payout</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{formatDate(nextPayoutDate)}</p>
                        <p className="text-[11px] text-gray-400 mt-1">Estimated — actual date may vary</p>
                    </div>
                </div>

                {/* ── Filter tabs ── */}
                {bookings.length > 0 && (
                    <div className="mb-5 flex gap-2 bg-white rounded-2xl border border-gray-100 p-1.5 max-w-md">
                        {[
                            { key: 'all', label: 'All' },
                            { key: 'paid', label: 'Settled' },
                            { key: 'processing', label: 'Processing' },
                        ].map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={`flex-1 py-2 px-3 rounded-xl font-semibold text-xs sm:text-sm transition-all ${filter === f.key ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:text-gray-800'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Ride history ── */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
                            {Icon.route('w-4 h-4 text-gray-500')}
                            Ride history
                        </h3>
                    </div>

                    {filteredBookings.length === 0 ? (
                        <div className="p-10 sm:p-12 text-center">
                            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                {Icon.empty('w-7 h-7 text-gray-400')}
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-1">No rides here yet</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                {filter === 'all'
                                    ? "Completed rides you've driven will show up here with their payout status."
                                    : 'No rides match this filter.'}
                            </p>
                            <Link
                                to="/ride/post"
                                className="inline-flex items-center gap-1.5 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
                            >
                                Post a ride
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                                            <th className="px-5 py-3 font-semibold">Date</th>
                                            <th className="px-5 py-3 font-semibold">Route</th>
                                            <th className="px-5 py-3 font-semibold">Passenger</th>
                                            <th className="px-5 py-3 font-semibold">Fare</th>
                                            <th className="px-5 py-3 font-semibold">Payout status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredBookings.map((b) => {
                                            const status = resolvePayoutStatus(b);
                                            return (
                                                <tr key={b._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                                                    <td className="px-5 py-4 text-gray-700 whitespace-nowrap">{formatDate(b.ride?.date)}</td>
                                                    <td className="px-5 py-4 text-gray-700 max-w-xs truncate">
                                                        {b.pickupLocation} → {b.dropLocation}
                                                    </td>
                                                    <td className="px-5 py-4 text-gray-700">{b.passenger?.name || 'N/A'}</td>
                                                    <td className="px-5 py-4 font-semibold text-gray-900">{formatCurrency(b.baseFare)}</td>
                                                    <td className="px-5 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}>
                                                            {status.key === 'paid' && Icon.check('w-3.5 h-3.5')}
                                                            {status.key === 'processing' && Icon.clock('w-3.5 h-3.5')}
                                                            {status.label}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile cards */}
                            <div className="sm:hidden divide-y divide-gray-50">
                                {filteredBookings.map((b) => {
                                    const status = resolvePayoutStatus(b);
                                    return (
                                        <div key={b._id} className="p-4 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-400">{formatDate(b.ride?.date)}</span>
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${status.className}`}>
                                                    {status.key === 'paid' && Icon.check('w-3 h-3')}
                                                    {status.key === 'processing' && Icon.clock('w-3 h-3')}
                                                    {status.label}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-800 font-medium truncate">
                                                {b.pickupLocation} → {b.dropLocation}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-500">{b.passenger?.name || 'N/A'}</span>
                                                <span className="text-sm font-bold text-green-700">{formatCurrency(b.baseFare)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* ── Payout info footer ── */}
                <div className="mt-5 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {Icon.bank('w-4.5 h-4.5 text-blue-600')}
                    </div>
                    <p className="text-xs text-blue-800">
                        Payouts are processed automatically to your linked bank account after each ride is completed.
                        Settlement timing depends on your bank's processing window — typically 1–2 business days.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Earnings;