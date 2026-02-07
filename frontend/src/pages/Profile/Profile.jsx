// src/pages/Profile/Profile.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { updateUserProfile } from '../../services/userService';
import api from '../../config/api.js';
import toast from 'react-hot-toast';

function Profile() {
  const { user, logout, updateUser } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [totalRides, setTotalRides] = useState(0);
  const [ridesLoading, setRidesLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [userRating, setUserRating] = useState(null);

  // Initialize profile data when user loads
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
      });
      fetchUserRides();
      fetchUserRating();
    }
  }, [user]);

  // Fetch total rides for the user
  const fetchUserRides = async () => {
    try {
      console.log('📊 Fetching user rides...');
      setRidesLoading(true);
      
      const response = await api.get('/rides/user/stats');
      
      console.log('✅ User rides received:', response.data);
      
      const data = response.data.data || response.data;
      setTotalRides(data.totalRides || 0);
      
    } catch (error) {
      console.error('❌ Error fetching user rides:', error);
      setTotalRides(0);
    } finally {
      setRidesLoading(false);
    }
  };

  // Fetch user's existing rating
  const fetchUserRating = async () => {
    try {
      const response = await api.get('/ratings/user/my-rating');
      const data = response.data.data || response.data;
      
      if (data.rating) {
        setUserRating(data.rating);
      }
    } catch (error) {
      console.log('No existing rating found');
    }
  };

  // Handle rating submission
  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error('Please select a rating', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
      });
      return;
    }

    setIsSubmittingRating(true);

    try {
      const response = await api.post('/ratings/submit', {
        rating,
        feedback: feedback.trim() || undefined,
      });

      toast.success('Thank you for your rating!', {
        duration: 4000,
        position: 'top-center',
        style: {
          background: '#10B981',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
      });

      setUserRating({ rating, feedback });
      setShowRatingModal(false);
      setRating(0);
      setFeedback('');
      setHoverRating(0);
      
    } catch (error) {
      console.error('❌ Error submitting rating:', error);
      
      const errorMessage = error.response?.data?.message || 'Failed to submit rating. Please try again.';
      
      toast.error(errorMessage, {
        duration: 4000,
        position: 'top-center',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
      });
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Track if there are unsaved changes
  useEffect(() => {
    if (user) {
      const changed = 
        profileData.name !== (user.name || '') ||
        profileData.email !== (user.email || '');
      setHasChanges(changed);
    }
  }, [profileData, user]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Validate profile data
  const validateProfile = () => {
    if (!profileData.name.trim()) {
      toast.error('Name is required', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
      });
      return false;
    }
    
    if (profileData.name.trim().length < 2) {
      toast.error('Name must be at least 2 characters long', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
      });
      return false;
    }

    if (!profileData.email.trim()) {
      toast.error('Email is required', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      toast.error('Please enter a valid email address', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
      });
      return false;
    }

    return true;
  };

  // Handle profile update submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateProfile()) {
      return;
    }

    if (!hasChanges) {
      toast.error('No changes to save', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#F59E0B',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
      });
      return;
    }

    setIsLoading(true);

    try {
      const updatedUser = await updateUserProfile(profileData);
      
      // Update the user in auth context
      updateUser(updatedUser);
      
      // Show success toast
      toast.success('Profile updated successfully!', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#10B981',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#10B981',
        },
      });
      
      setIsEditing(false);
      setHasChanges(false);
    } catch (err) {
      console.error('Profile update error:', err);
      
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update profile. Please try again.';
      
      // Show error toast
      toast.error(errorMessage, {
        duration: 4000,
        position: 'top-center',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
      });
    }
    setIsEditing(false);
    setHasChanges(false);
  };

  // Warn user about unsaved changes
  const handleEditToggle = () => {
    if (isEditing && hasChanges) {
      const confirmCancel = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmCancel) return;
      handleCancel();
    } else {
      setIsEditing(!isEditing);
    }
  };

  const displayUser = user || {
    name: 'Guest User',
    email: 'guest@example.com',
    createdAt: new Date().toISOString(),
  };

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-gray-50 to-blue-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h2 className="text-4xl font-bold text-gray-900">
                {isEditing ? 'Edit Profile' : 'Profile'}
              </h2>
            </div>
            <p className="text-gray-600">
              {isEditing ? 'Update your personal details' : 'Manage your account information'}
            </p>
          </div>

          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            
            {/* Header Section with Avatar */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-12 relative">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                
                {/* Avatar */}
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg ring-4 ring-white ring-opacity-50">
                  <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>

                {/* User Info */}
                <div className="text-center md:text-left flex-1">
                  <h3 className="text-3xl font-bold text-white mb-2">
                    {displayUser.name || 'User'}
                  </h3>
                  <p className="text-blue-100 text-lg mb-4">
                    {displayUser.email || 'user@example.com'}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    <span className="px-4 py-1.5 bg-green-700 bg-opacity-20 text-white rounded-full text-sm font-medium inline-flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Member since {displayUser.createdAt ? new Date(displayUser.createdAt).getFullYear() : '2024'}
                    </span>
                    {hasChanges && isEditing && (
                      <span className="px-4 py-1.5 bg-yellow-500 bg-opacity-90 text-white rounded-full text-sm font-medium animate-pulse inline-flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Unsaved changes
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Details/Edit Form Section */}
            <form onSubmit={handleSubmit} id="profile-edit-form">
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  
                  {/* Name Field */}
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-500 mb-1">Full Name</p>
                        {isEditing ? (
                          <input
                            id="name"
                            name="name"
                            type="text"
                            value={profileData.name}
                            onChange={handleChange}
                            className="w-full text-gray-900 font-medium p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            required
                            disabled={isLoading}
                          />
                        ) : (
                          <p className="text-gray-900 font-medium">{displayUser.name || 'Not provided'}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Email Field */}
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-500 mb-1">Email Address</p>
                        {isEditing ? (
                          <input
                            id="email"
                            name="email"
                            type="email"
                            value={profileData.email}
                            onChange={handleChange}
                            className="w-full text-gray-900 font-medium p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            required
                            disabled={isLoading}
                          />
                        ) : (
                          <p className="text-gray-900 font-medium">{displayUser.email || 'Not provided'}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Account Status */}
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-500 mb-1">Account Status</p>
                        <p className="text-gray-900 font-medium inline-flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          Active
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Total Rides */}
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-500 mb-1">Total Rides</p>
                        {ridesLoading ? (
                          <div className="animate-pulse">
                            <div className="h-6 bg-gray-300 rounded w-16"></div>
                          </div>
                        ) : (
                          <p className="text-gray-900 font-medium text-2xl">{totalRides}</p>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </form>

            {/* Action Buttons */}
            <div className="px-8 pb-8">
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                {isEditing ? (
                  <>
                    {/* Save Button */}
                    <button
                      type="submit"
                      form="profile-edit-form"
                      className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoading || !hasChanges}
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                    
                    {/* Cancel Button */}
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex-1 bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-500 transition-colors duration-200 flex items-center justify-center gap-2"
                      disabled={isLoading}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Cancel</span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Edit Profile Button */}
                    <button
                      type="button"
                      onClick={handleEditToggle}
                      className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Edit Profile</span>
                    </button>
                    
                    {/* Logout Button */}
                    <button
                      type="button"
                      onClick={logout}
                      className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Logout</span>
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* User Rating Display */}
          {userRating && (
            <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Your Rating</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {[...Array(5)].map((_, index) => (
                      <svg
                        key={index}
                        className={`w-5 h-5 ${index < userRating.rating ? 'text-yellow-500' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="text-gray-600 ml-2">{userRating.rating}/5</span>
                  </div>
                  {userRating.feedback && (
                    <p className="text-gray-600 mt-2 italic">"{userRating.feedback}"</p>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-500">Thank you for rating ShareMyRide! Your feedback helps us improve.</p>
            </div>
          )}

          {/* Coming Soon Section */}
          <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">More Features Coming Soon!</h3>
            <p className="text-gray-600">
              We're working on adding ride history, detailed reviews, and payment settings.
            </p>
          </div>

        </div>
      </div>

      {/* Floating Rate Us Button */}
      {!userRating && (
        <button
          onClick={() => setShowRatingModal(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-full shadow-2xl hover:shadow-yellow-500/50 hover:scale-110 transition-all duration-300 flex items-center justify-center z-50 animate-bounce"
          aria-label="Rate Us"
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-scale-in">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowRatingModal(false);
                setRating(0);
                setHoverRating(0);
                setFeedback('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Rate ShareMyRide</h3>
              <p className="text-gray-600">How would you rate your experience?</p>
            </div>

            {/* Rating Form */}
            <form onSubmit={handleRatingSubmit}>
              {/* Star Rating */}
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="focus:outline-none transform hover:scale-110 transition-transform"
                  >
                    <svg
                      className={`w-12 h-12 ${
                        star <= (hoverRating || rating)
                          ? 'text-yellow-500'
                          : 'text-gray-300'
                      } transition-colors`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>

              {/* Rating Text */}
              {rating > 0 && (
                <p className="text-center text-gray-700 font-medium mb-4">
                  {rating === 5 && '🌟 Amazing!'}
                  {rating === 4 && '😊 Great!'}
                  {rating === 3 && '👍 Good'}
                  {rating === 2 && '😐 Okay'}
                  {rating === 1 && '😞 Poor'}
                </p>
              )}

              {/* Feedback Textarea */}
              <div className="mb-6">
                <label htmlFor="feedback" className="block text-sm font-semibold text-gray-700 mb-2">
                  Additional Feedback (Optional)
                </label>
                <textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us more about your experience..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none resize-none"
                  rows="4"
                  maxLength="500"
                  disabled={isSubmittingRating}
                />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {feedback.length}/500 characters
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmittingRating || rating === 0}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-yellow-500 hover:to-orange-600 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingRating ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Submit Rating</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default Profile;