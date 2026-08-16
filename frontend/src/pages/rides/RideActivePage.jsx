import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { connectSocket } from '../../services/socketClient';
import { getRideJourney, respondToSafetyCheck } from '../../services/rideLifecycleService';
import toastService from '../../services/toastService';

// ── Stage metadata — order matters, drives the progress rail ──────────────
const STAGE_ORDER = ['scheduled', 'started', 'boarding', 'active', 'destination_reached', 'completed'];

const STAGE_META = {
    scheduled: { label: 'Scheduled', icon: 'calendar' },
    started: { label: 'Ride Started', icon: 'play' },
    boarding: { label: 'Boarding', icon: 'passenger' },
    active: { label: 'In Progress', icon: 'route' },
    destination_reached: { label: 'Destination Reached', icon: 'pin' },
    completed: { label: 'Completed', icon: 'check' },
    cancelled: { label: 'Cancelled', icon: 'close' },
};

const Icon = {
    calendar: (cls) => (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    ),
    play: (cls) => (
        <svg className={cls} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
        </svg>
    ),
    passenger: (cls) => (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    ),
    driver: (cls) => (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    route: (cls) => (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.553 2.776A1 1 0 0021 18.382V7.618a1 1 0 00-.447-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
    ),
    pin: (cls) => (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    check: (cls) => (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    ),
    close: (cls) => (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
    shield: (cls) => (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
    ),
    alert: (cls) => (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    ),
    back: (cls) => (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
    ),
    spinner: (cls) => (
        <svg className={`animate-spin ${cls}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    ),
    pulse: (cls) => (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h4l2-8 4 16 2-8h6" />
        </svg>
    ),
};

const formatTime = (ts) => {
    if (!ts) return '';
    try {
        return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
};

const RideActivePage = () => {
    const { rideId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [journey, setJourney] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [safetyResponding, setSafetyResponding] = useState(false);
    const [pendingSafetyCheck, setPendingSafetyCheck] = useState(null); // { reason, message }
    const [liveEvents, setLiveEvents] = useState([]); // local feed on top of journey.timeline

    const socketRef = useRef(null);

    const isDriver = journey?.driver && user && (journey.driver === user._id || journey.driver?._id === user._id);

    // ── Initial fetch ──────────────────────────────────────────────────────
    const fetchJourney = useCallback(async () => {
        try {
            const data = await getRideJourney(rideId);
            setJourney(data);
            setError(null);
        } catch (err) {
            console.error('Failed to load ride journey:', err);
            setError(err.response?.data?.message || 'Could not load this ride.');
        } finally {
            setLoading(false);
        }
    }, [rideId]);

    useEffect(() => {
        fetchJourney();
    }, [fetchJourney]);

    // ── Socket.IO — join room, listen for everything relevant ─────────────
    useEffect(() => {
        if (!rideId) return;
        const socket = connectSocket();
        socketRef.current = socket;
        socket.emit('join:ride', { rideId });

        const pushEvent = (label, detail) => {
            setLiveEvents(prev => [{ label, detail, at: new Date().toISOString() }, ...prev].slice(0, 30));
        };

        const handleStarted = (data) => {
            setJourney(prev => prev ? { ...prev, stage: data.stage } : prev);
            pushEvent('Ride started', `${data.passengerCount ?? ''} passenger(s) confirmed`);
        };

        const handleBoarded = (data) => {
            pushEvent('Passenger boarded', `${data.boardedCount}/${data.totalPassengers} on board`);
        };

        const handleStatus = (data) => {
            setJourney(prev => prev ? { ...prev, stage: data.stage, safetyStatus: data.safetyStatus, updatedAt: data.updatedAt } : prev);
            if (data.timeline) pushEvent('Status update', STAGE_META[data.stage]?.label || data.stage);
        };

        const handleCompleted = () => {
            setJourney(prev => prev ? { ...prev, stage: 'completed' } : prev);
            pushEvent('Ride completed', 'Trip finished successfully');
            toastService.success('Ride completed! 🎉', 'Thanks for riding with ShareMyRide.');
        };

        const handleSafetyCheck = (data) => {
            setPendingSafetyCheck(data);
            pushEvent('Safety check-in', data.message || 'Please respond');
            toastService.warning('Safety check', data.message || 'Please confirm you are okay.');
        };

        const handleSafetyResolved = (data) => {
            pushEvent('Safety check resolved', data.response === 'safe' ? 'Marked as safe' : data.response);
            setPendingSafetyCheck(null);
        };

        const handlePassengerAlert = (data) => {
            pushEvent('⚠ Passenger alert', `Passenger needs help (${data.response})`);
            toastService.error('Passenger needs help', 'A passenger has flagged a safety concern.');
        };

        socket.on('ride:started', handleStarted);
        socket.on('ride:passenger_boarded', handleBoarded);
        socket.on('ride:status', handleStatus);
        socket.on('ride:completed', handleCompleted);
        socket.on('ride:safety_check', handleSafetyCheck);
        socket.on('ride:safety_check_resolved', handleSafetyResolved);
        socket.on('ride:passenger_alert', handlePassengerAlert);

        return () => {
            socket.emit('leave:ride', { rideId });
            socket.off('ride:started', handleStarted);
            socket.off('ride:passenger_boarded', handleBoarded);
            socket.off('ride:status', handleStatus);
            socket.off('ride:completed', handleCompleted);
            socket.off('ride:safety_check', handleSafetyCheck);
            socket.off('ride:safety_check_resolved', handleSafetyResolved);
            socket.off('ride:passenger_alert', handlePassengerAlert);
        };
    }, [rideId]);

    const handleSafetyResponse = async (response) => {
        setSafetyResponding(true);
        try {
            await respondToSafetyCheck(rideId, response);
            setPendingSafetyCheck(null);
            toastService.success(
                response === 'safe' ? "Glad you're safe" : 'Help is on the way',
                response === 'safe' ? 'Thanks for confirming.' : 'Support has been notified.'
            );
        } catch (err) {
            toastService.error('Could not send response', err.response?.data?.message || 'Please try again.');
        } finally {
            setSafetyResponding(false);
        }
    };

    // ── Loading / error states ─────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Loading live ride status…</p>
                </div>
            </div>
        );
    }

    if (error || !journey) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center max-w-md">
                    <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        {Icon.alert('w-7 h-7 text-red-400')}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">Ride not available</h3>
                    <p className="text-sm text-gray-500 mb-6">{error || 'This ride journey could not be found.'}</p>
                    <Link
                        to="/upcoming-rides"
                        className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        {Icon.back('w-4 h-4')}
                        Back to upcoming rides
                    </Link>
                </div>
            </div>
        );
    }

    const stage = journey.stage;
    const stageIdx = STAGE_ORDER.indexOf(stage);
    const meta = STAGE_META[stage] || { label: stage, icon: 'route' };
    const timeline = journey.timeline || [];
    const safetyStatus = journey.safetyStatus || 'normal';

    const headerGradient = stage === 'cancelled'
        ? 'from-red-600 via-red-500 to-red-400'
        : stage === 'completed'
            ? 'from-green-700 via-green-600 to-emerald-500'
            : 'from-blue-700 via-blue-600 to-blue-500';

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ── HEADER ── */}
            <div className={`bg-gradient-to-r ${headerGradient} pt-6 pb-16 px-4 sm:px-6 lg:px-8`}>
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={() => navigate('/upcoming-rides')}
                        className="inline-flex items-center gap-1.5 text-blue-100 hover:text-white text-sm mb-4 transition-colors"
                    >
                        {Icon.back('w-4 h-4')}
                        Back to upcoming rides
                    </button>

                    <div className="flex items-center gap-3 mb-1.5">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                            {Icon[meta.icon]('w-5 h-5 sm:w-6 sm:h-6 text-white')}
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-2xl font-bold text-white leading-tight">{meta.label}</h1>
                            <p className="text-blue-100 text-xs sm:text-sm">Live ride tracking</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 pb-16 space-y-5">

                {/* ── Progress rail ── */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
                    <h3 className="font-semibold text-gray-800 mb-5 text-sm">Journey progress</h3>
                    <div className="flex items-center">
                        {STAGE_ORDER.filter(s => s !== 'cancelled').map((s, i) => {
                            const done = stageIdx >= 0 && i <= stageIdx && stage !== 'cancelled';
                            const isCurrent = s === stage;
                            return (
                                <React.Fragment key={s}>
                                    <div className="flex flex-col items-center flex-shrink-0" style={{ width: 64 }}>
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${done
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : 'bg-white border-gray-200 text-gray-300'
                                                } ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}
                                        >
                                            {done ? Icon.check('w-4 h-4') : <span className="w-2 h-2 rounded-full bg-gray-200" />}
                                        </div>
                                        <span className={`mt-2 text-[10px] font-medium text-center leading-tight ${done ? 'text-gray-800' : 'text-gray-350'}`}>
                                            {STAGE_META[s].label}
                                        </span>
                                    </div>
                                    {i < STAGE_ORDER.length - 2 && (
                                        <div className={`flex-1 h-0.5 -mt-5 ${i < stageIdx ? 'bg-blue-600' : 'bg-gray-200'}`} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                    {stage === 'cancelled' && (
                        <div className="mt-5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-xs font-semibold">
                            {Icon.close('w-3.5 h-3.5')}
                            This ride was cancelled
                        </div>
                    )}
                </div>

                {/* ── Safety status banner ── */}
                <div className={`rounded-2xl border p-4 sm:p-5 flex items-center gap-3 ${safetyStatus === 'normal'
                    ? 'bg-green-50 border-green-100'
                    : 'bg-amber-50 border-amber-200'
                    }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${safetyStatus === 'normal' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                        {Icon.shield('w-5 h-5')}
                    </div>
                    <div>
                        <p className={`text-sm font-semibold ${safetyStatus === 'normal' ? 'text-green-800' : 'text-amber-800'}`}>
                            {safetyStatus === 'normal' ? 'All safety checks normal' : `Safety status: ${safetyStatus}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {journey.locationConsent
                                ? 'Live location sharing is on for this ride.'
                                : 'Live location sharing is off.'}
                        </p>
                    </div>
                </div>

                {/* ── Pending safety check prompt (passenger side) ── */}
                {pendingSafetyCheck && (
                    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 animate-fadeIn">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                {Icon.alert('w-5 h-5 text-amber-600')}
                            </div>
                            <div>
                                <p className="font-semibold text-amber-900 text-sm">Safety check-in</p>
                                <p className="text-sm text-amber-800 mt-0.5">
                                    {pendingSafetyCheck.message || 'Are you okay?'}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleSafetyResponse('safe')}
                                disabled={safetyResponding}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                            >
                                {safetyResponding ? Icon.spinner('h-4 w-4') : Icon.check('w-4 h-4')}
                                I'm safe
                            </button>
                            <button
                                onClick={() => handleSafetyResponse('need_help')}
                                disabled={safetyResponding}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                            >
                                {safetyResponding ? Icon.spinner('h-4 w-4') : Icon.alert('w-4 h-4')}
                                I need help
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Trip details ── */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
                    <h3 className="font-semibold text-gray-800 mb-4 text-sm flex items-center gap-1.5">
                        {Icon.route('w-4 h-4 text-gray-500')}
                        Trip details
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-3.5 rounded-lg">
                            <p className="text-[11px] text-gray-400 mb-0.5">Passengers boarded</p>
                            <p className="text-sm font-semibold text-gray-900">
                                {journey.boardedCount ?? journey.passengers?.filter(p => p.boarded)?.length ?? 0}
                                {' / '}
                                {journey.totalPassengers ?? journey.passengers?.length ?? '—'}
                            </p>
                        </div>
                        <div className="bg-gray-50 p-3.5 rounded-lg">
                            <p className="text-[11px] text-gray-400 mb-0.5">Last updated</p>
                            <p className="text-sm font-semibold text-gray-900">{formatTime(journey.updatedAt) || '—'}</p>
                        </div>
                    </div>
                </div>

                {/* ── Live timeline feed ── */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
                    <h3 className="font-semibold text-gray-800 mb-4 text-sm flex items-center gap-1.5">
                        {Icon.pulse('w-4 h-4 text-gray-500')}
                        Live activity
                    </h3>

                    {(liveEvents.length === 0 && timeline.length === 0) ? (
                        <p className="text-sm text-gray-400 text-center py-6">No activity yet — updates will appear here in real time.</p>
                    ) : (
                        <div className="space-y-0">
                            {liveEvents.length > 0 && liveEvents.map((ev, i) => (
                                <div key={`live-${i}`} className="flex gap-3 relative">
                                    <div className="flex flex-col items-center">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                                        {(i < liveEvents.length - 1 || timeline.length > 0) && (
                                            <span className="w-0.5 flex-1 bg-gray-100 my-1" />
                                        )}
                                    </div>
                                    <div className="pb-4 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">{ev.label}</p>
                                        {ev.detail && <p className="text-xs text-gray-500 mt-0.5">{ev.detail}</p>}
                                        <p className="text-[11px] text-gray-350 mt-0.5">{formatTime(ev.at)}</p>
                                    </div>
                                </div>
                            ))}

                            {[...timeline].reverse().map((ev, i) => (
                                <div key={`hist-${i}`} className="flex gap-3 relative">
                                    <div className="flex flex-col items-center">
                                        <span className="w-2.5 h-2.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                                        {i < timeline.length - 1 && <span className="w-0.5 flex-1 bg-gray-100 my-1" />}
                                    </div>
                                    <div className="pb-4 min-w-0">
                                        <p className="text-sm font-medium text-gray-700">
                                            {STAGE_META[ev.stage]?.label || ev.stage || ev.event}
                                        </p>
                                        <p className="text-[11px] text-gray-350 mt-0.5">{formatTime(ev.at || ev.timestamp)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {stage === 'completed' && (
                    <div className="text-center">
                        <Link
                            to="/upcoming-rides"
                            className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            {Icon.check('w-4 h-4')}
                            Back to my rides
                        </Link>
                    </div>
                )}
            </div>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      `}</style>
        </div>
    );
};

export default RideActivePage;