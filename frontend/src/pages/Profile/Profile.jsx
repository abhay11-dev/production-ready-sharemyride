// src/pages/Profile/Profile.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { updateUserProfile } from '../../services/userService';

function Profile() {
  const { user, logout, updateUser } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize profile data when user loads
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  // Track if there are unsaved changes
  useEffect(() => {
    if (user) {
      const changed = 
        profileData.name !== (user.name || '') ||
        profileData.email !== (user.email || '');
      setHasChanges(changed);
    }
  }, [profileData, user]);

  // Auto-dismiss success/error messages
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
    setSuccess(null);
  };

  // Validate profile data
  const validateProfile = () => {
    if (!profileData.name.trim()) {
      setError('Name is required');
      return false;
    }
    
    if (profileData.name.trim().length < 2) {
      setError('Name must be at least 2 characters long');
      return false;
    }

    if (!profileData.email.trim()) {
      setError('Email is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  // Handle profile update submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setError(null);
    setSuccess(null);

    if (!validateProfile()) {
      return;
    }

    if (!hasChanges) {
      setError('No changes to save');
      return;
    }

    setIsLoading(true);

    try {
      const updatedUser = await updateUserProfile(profileData);
      updateUser(updatedUser);
      
      setSuccess('Profile updated successfully! 🎉');
      setIsEditing(false);
      setHasChanges(false);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update profile. Please try again.';
      setError(errorMessage);
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
    setError(null);
    setSuccess(null);
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
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              {isEditing ? 'Edit Profile' : 'Profile'}
            </h2>
            <p className="text-gray-600">
              {isEditing ? 'Update your personal details' : 'Manage your account information'}
            </p>
          </div>
          
          {/* Status Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-start gap-3 animate-fade-in" role="alert">
              <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <span className="font-semibold">Error: </span>
                <span>{error}</span>
              </div>
              <button 
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
          
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-xl flex items-start gap-3 animate-fade-in" role="alert">
              <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <span className="font-semibold">Success: </span>
                <span>{success}</span>
              </div>
              <button 
                onClick={() => setSuccess(null)}
                className="text-green-500 hover:text-green-700"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}

          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            
            {/* Header Section with Avatar */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-12 relative">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                
                {/* Avatar */}
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg ring-4 ring-white ring-opacity-50">
                  <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <span className="px-4 py-1.5 bg-green-700 bg-opacity-20 text-white rounded-full text-sm font-medium">
                      Member since {displayUser.createdAt ? new Date(displayUser.createdAt).getFullYear() : '2024'}
                    </span>
                    {hasChanges && isEditing && (
                      <span className="px-4 py-1.5 bg-yellow-500 bg-opacity-90 text-white rounded-full text-sm font-medium animate-pulse">
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
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-500 mb-1">Account Status</p>
                        <p className="text-gray-900 font-medium">Active</p>
                      </div>
                    </div>
                  </div>

                  {/* Total Rides */}
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-500 mb-1">Total Rides</p>
                        <p className="text-gray-900 font-medium">Coming soon</p>
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
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Logout</span>
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* Coming Soon Section */}
          <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">More Features Coming Soon!</h3>
            <p className="text-gray-600">
              We're working on adding ride history, reviews, and payment settings.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Profile;