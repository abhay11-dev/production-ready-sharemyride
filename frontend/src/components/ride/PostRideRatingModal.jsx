import React, { useState } from 'react';
import axios from '../../services/axiosInstance';
import toastService from '../../services/toastService';

// ── Icons ──────────────────────────────────────────────────────────────────
const Icon = {
    star: (cls, filled) => (
        <svg className={cls} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
    ),
    close: (cls) => (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
    spinner: (cls) => (
        <svg className={`animate-spin ${cls}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    ),
    check: (cls) => (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    ),
    chevronRight: (cls) => (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    ),
};

const RATING_LABELS = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Great',
    5: 'Excellent',
};

/**
 * StarPicker — interactive 5-star input.
 */
const StarPicker = ({ value, onChange, size = 'w-9 h-9' }) => {
    const [hovered, setHovered] = useState(0);
    return (
        <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => {
                const filled = n <= (hovered || value);
                return (
                    <button
                        key={n}
                        type="button"
                        onClick={() => onChange(n)}
                        onMouseEnter={() => setHovered(n)}
                        onMouseLeave={() => setHovered(0)}
                        className={`transition-transform hover:scale-110 ${filled ? 'text-amber-400' : 'text-gray-200'}`}
                        aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                    >
                        {Icon.star(size, filled)}
                    </button>
                );
            })}
        </div>
    );
};

/**
 * PostRideRatingModal
 *
 * Props:
 * - rideId: string — the ride being rated
 * - open: boolean — controls visibility
 * - onClose: () => void — called when the modal should close (skip / done)
 * - currentUserRole: 'driver' | 'passenger' — who is rating
 * - targets: Array<{ userId, name, avatarUrl? }> — people the current user can rate
 *     - passenger role: single-item array with the driver
 *     - driver role: one item per boarded passenger
 *
 * Usage:
 *   <PostRideRatingModal
 *     rideId={rideId}
 *     open={showRatingModal}
 *     onClose={() => setShowRatingModal(false)}
 *     currentUserRole={isPassenger ? 'passenger' : 'driver'}
 *     targets={ratingTargets}
 *   />
 */
const PostRideRatingModal = ({ rideId, open, onClose, currentUserRole, targets = [] }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [ratings, setRatings] = useState({}); // { [userId]: { rating, review } }
    const [submitting, setSubmitting] = useState(false);
    const [submittedIds, setSubmittedIds] = useState([]);

    if (!open) return null;

    const activeTarget = targets[activeIndex];
    const isLast = activeIndex === targets.length - 1;
    const currentRating = activeTarget ? (ratings[activeTarget.userId]?.rating || 0) : 0;
    const currentReview = activeTarget ? (ratings[activeTarget.userId]?.review || '') : '';

    if (!activeTarget) {
        // Nothing to rate — nothing to show.
        return null;
    }

    const setRatingFor = (userId, rating) => {
        setRatings(prev => ({ ...prev, [userId]: { ...prev[userId], rating } }));
    };

    const setReviewFor = (userId, review) => {
        setRatings(prev => ({ ...prev, [userId]: { ...prev[userId], review } }));
    };

    const handleSkip = () => {
        if (isLast) {
            onClose();
        } else {
            setActiveIndex(i => i + 1);
        }
    };

    const handleSubmit = async () => {
        if (!currentRating) {
            toastService.error('Please select a rating', 'Tap a star to rate before submitting.');
            return;
        }

        setSubmitting(true);
        try {
            await axios.post(`/api/rides/${rideId}/rate`, {
                targetUserId: activeTarget.userId,
                rating: currentRating,
                review: currentReview?.trim() || undefined,
                role: currentUserRole,
            });

            setSubmittedIds(prev => [...prev, activeTarget.userId]);
            toastService.success('Rating submitted', `Thanks for rating ${activeTarget.name}.`);

            if (isLast) {
                onClose();
            } else {
                setActiveIndex(i => i + 1);
            }
        } catch (err) {
            toastService.error('Could not submit rating', err.response?.data?.message || 'Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const alreadySubmitted = submittedIds.includes(activeTarget.userId);

    return (
        <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 text-white p-6 rounded-t-2xl sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold leading-tight">Rate your ride</h3>
                            <p className="text-blue-100 text-xs mt-0.5">
                                {currentUserRole === 'passenger' ? 'How was your driver?' : 'How were your passengers?'}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors">
                            {Icon.close('w-5 h-5')}
                        </button>
                    </div>

                    {targets.length > 1 && (
                        <div className="flex items-center gap-1.5 mt-4">
                            {targets.map((t, i) => (
                                <span
                                    key={t.userId}
                                    className={`h-1.5 rounded-full transition-all ${i === activeIndex ? 'bg-white w-8' : submittedIds.includes(t.userId) ? 'bg-white/70 w-4' : 'bg-white/30 w-4'
                                        }`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl mb-3">
                            {activeTarget.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <p className="font-semibold text-gray-900">{activeTarget.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {currentUserRole === 'passenger' ? 'Driver' : 'Passenger'}
                        </p>
                    </div>

                    {alreadySubmitted ? (
                        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                {Icon.check('w-5 h-5 text-green-600')}
                            </div>
                            <p className="text-sm font-semibold text-green-800">Rating submitted</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col items-center gap-2">
                                <StarPicker value={currentRating} onChange={(r) => setRatingFor(activeTarget.userId, r)} />
                                <p className="text-sm font-medium text-gray-500 h-5">
                                    {currentRating ? RATING_LABELS[currentRating] : 'Tap to rate'}
                                </p>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                                    Add a review <span className="font-normal text-gray-400">(optional)</span>
                                </label>
                                <textarea
                                    value={currentReview}
                                    onChange={(e) => setReviewFor(activeTarget.userId, e.target.value)}
                                    placeholder={
                                        currentUserRole === 'passenger'
                                            ? 'Share your experience with this driver...'
                                            : 'Share your experience with this passenger...'
                                    }
                                    rows={3}
                                    maxLength={500}
                                    className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                />
                            </div>
                        </>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={handleSkip}
                            disabled={submitting}
                            className="flex-1 bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            {alreadySubmitted ? (isLast ? 'Done' : 'Next') : 'Skip'}
                        </button>
                        {!alreadySubmitted && (
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !currentRating}
                                className="flex-1 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <>{Icon.spinner('h-4 w-4')} Submitting…</>
                                ) : isLast ? (
                                    <>{Icon.check('w-4 h-4')} Submit</>
                                ) : (
                                    <>Submit & Next {Icon.chevronRight('w-4 h-4')}</>
                                )}
                            </button>
                        )}
                    </div>
                </div>
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

export default PostRideRatingModal;