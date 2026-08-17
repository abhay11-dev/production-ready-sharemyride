import React, { useState } from 'react';
import api from '../../config/api';
import toastService from '../../services/toastService';

const PostRideRatingModal = ({ isOpen, onClose, bookingId, targetName, isDriver }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || submitted) return null;

  const driverTags = ['Punctual', 'Safe Driving', 'Clean Car', 'Friendly', 'Polite', 'Great Route'];
  const passengerTags = ['On Time', 'Polite & Respectful', 'Clean Habits', 'Great Communication'];

  const availableTags = isDriver ? passengerTags : driverTags;

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bookingId) {
      toastService.error('Rating Error', 'No active booking reference found to rate.');
      return;
    }

    setSubmitting(true);
    try {
      const fullReview = selectedTags.length > 0
        ? `[${selectedTags.join(', ')}] ${review}`.trim()
        : review.trim();

      await api.post(`/bookings/${bookingId}/rating`, {
        rating,
        review: fullReview,
      });

      toastService.success('Rating Submitted! ⭐', `Thank you for rating ${targetName || 'your ride'}.`);
      setSubmitted(true);
      if (onClose) onClose();
    } catch (err) {
      console.error('Submit rating error:', err);
      toastService.error('Failed to submit rating', err.response?.data?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 text-white p-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center text-sm transition-colors"
          >
            ✕
          </button>
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 border border-white/20">
            🎉
          </div>
          <h3 className="text-xl font-bold">Ride Completed!</h3>
          <p className="text-blue-100 text-xs mt-1">
            How was your experience with <span className="font-semibold text-white">{targetName || (isDriver ? 'the Passenger' : 'the Driver')}</span>?
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Star Rating Selector */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="text-3xl focus:outline-none transition-transform hover:scale-125"
                >
                  <span className={(hoverRating || rating) >= star ? 'text-amber-400' : 'text-gray-300'}>
                    ★
                  </span>
                </button>
              ))}
            </div>
            <span className="text-xs font-semibold text-gray-500">
              {rating === 5 && '🌟 Exceptional!'}
              {rating === 4 && '👍 Great experience'}
              {rating === 3 && '😐 Average'}
              {rating === 2 && '👎 Below average'}
              {rating === 1 && '⚠️ Poor'}
            </span>
          </div>

          {/* Quick Tags */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Quick Feedback Highlights
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm scale-105'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Review Text */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Add a Review (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Share details about the trip..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {submitting ? 'Submitting...' : 'Submit Rating ⭐'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostRideRatingModal;