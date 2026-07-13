// src/pages/Profile/Profile.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { updateUserProfile } from '../../services/userService';
import {
  getVerificationStatus,
  uploadProfilePhoto,
  uploadAadhaar,
  uploadDrivingLicense,
  submitForReview
} from '../../services/driverVerificationService';
import api from '../../config/api.js';
import toast from '../../services/toastService';

// ─── Status Badge ─────────────────────────────────────────────────────────────
const VerificationBadge = ({ status }) => {
  const config = {
    not_started: { label: 'Not Started', cls: 'bg-gray-100 text-gray-500 border border-gray-200' },
    pending: { label: 'In Progress', cls: 'bg-amber-50 text-amber-600 border border-amber-200' },
    submitted: { label: 'Under Review', cls: 'bg-blue-50 text-blue-600 border border-blue-200' },
    approved: { label: '✓ Verified', cls: 'bg-green-50 text-green-600 border border-green-200' },
    rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-600 border border-red-200' },
  };
  const { label, cls } = config[status] || config.not_started;
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${cls}`}>{label}</span>
  );
};

// ─── Step Check ───────────────────────────────────────────────────────────────
const StepCheck = ({ done, label, sublabel }) => (
  <div className="flex items-center gap-3">
    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${done ? 'bg-gradient-to-r from-green-500 to-green-400 shadow-md shadow-green-200' : 'bg-gray-200'}`}>
      {done
        ? <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        : <span className="w-2 h-2 rounded-full bg-gray-400 block" />
      }
    </div>
    <div>
      <p className={`text-sm font-medium ${done ? 'text-gray-800' : 'text-gray-400'}`}>{label}</p>
      {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
    </div>
  </div>
);

const DocumentPreviewCard = ({ label, url }) => {
  if (!url) return null;
  const isImage = /\.(jpe?g|png|webp)$/i.test(url);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">{label}</p>
      {isImage ? (
        <img src={url} alt={label} className="h-28 w-full rounded-lg object-cover border border-gray-100" />
      ) : (
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7m0 0l-7 7m7-7H4" />
          </svg>
          Open file
        </a>
      )}
    </div>
  );
};

// ─── Document Upload Card ─────────────────────────────────────────────────────
const DocUploadField = ({ label, accept, file, onChange, uploaded, previewUrl }) => {
  const inputRef = useRef();
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</p>
      <div
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-3 cursor-pointer transition-all flex items-center gap-3 group
          ${uploaded
            ? 'border-green-300 bg-green-50/50'
            : 'border-gray-200 bg-gray-50/50 hover:border-blue-400 hover:bg-blue-50/50'}`}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="preview" className="w-12 h-12 object-cover rounded-lg flex-shrink-0 ring-2 ring-white shadow" />
        ) : (
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${uploaded ? 'bg-green-100' : 'bg-gray-200 group-hover:bg-blue-100'}`}>
            <svg className={`w-6 h-6 transition-colors ${uploaded ? 'text-green-500' : 'text-gray-400 group-hover:text-blue-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${uploaded && !file ? 'text-green-700' : 'text-gray-700'}`}>
            {file ? file.name : uploaded ? 'Uploaded ✓' : 'Tap to upload'}
          </p>
          <p className="text-xs text-gray-400">JPG, PNG, PDF · max 5MB</p>
        </div>
        {uploaded && !file && (
          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onChange} />
    </div>
  );
};

// ─── Section Card ─────────────────────────────────────────────────────────────
const SectionCard = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-100 p-5 ${className}`}>
    {children}
  </div>
);

// ─── Step Header ──────────────────────────────────────────────────────────────
const StepHeader = ({ num, done, title, subtitle }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all
      ${done ? 'bg-gradient-to-r from-green-500 to-green-400 text-white shadow-md shadow-green-200' : 'bg-gray-100 text-gray-500'}`}>
      {done ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
      ) : num}
    </div>
    <div>
      <h4 className="font-semibold text-gray-900">{title}</h4>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PROFILE COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

// ── Session-level photo URL cache key ─────────────────────────────────────────
const PHOTO_CACHE_KEY = 'smr_profile_photo_url';
const PHOTO_CACHE_EXPIRY_KEY = 'smr_profile_photo_expiry';
const PHOTO_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCachedPhotoUrl() {
  try {
    const expiry = sessionStorage.getItem(PHOTO_CACHE_EXPIRY_KEY);
    if (expiry && Date.now() > Number(expiry)) {
      sessionStorage.removeItem(PHOTO_CACHE_KEY);
      sessionStorage.removeItem(PHOTO_CACHE_EXPIRY_KEY);
      return null;
    }
    return sessionStorage.getItem(PHOTO_CACHE_KEY) || null;
  } catch { return null; }
}

function setCachedPhotoUrl(url) {
  try {
    if (url) {
      sessionStorage.setItem(PHOTO_CACHE_KEY, url);
      sessionStorage.setItem(PHOTO_CACHE_EXPIRY_KEY, String(Date.now() + PHOTO_CACHE_TTL_MS));
    } else {
      sessionStorage.removeItem(PHOTO_CACHE_KEY);
      sessionStorage.removeItem(PHOTO_CACHE_EXPIRY_KEY);
    }
  } catch { /* ignore storage errors */ }
}

function Profile() {
  const { user, updateUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'verification' ? 'verification' : 'profile');

  // ── Profile edit state ──────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', email: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [totalRides, setTotalRides] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [recentCompletedRides, setRecentCompletedRides] = useState([]);
  const [profileStatsLoading, setProfileStatsLoading] = useState(true);

  // ── Verification state ──────────────────────────────────────────────────
  const [verif, setVerif] = useState(null);
  const [verifLoading, setVerifLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Profile photo — initialize from cache immediately so it shows without waiting
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [cachedPhotoUrl, setCachedPhotoUrlState] = useState(() => getCachedPhotoUrl());
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Aadhaar
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarFront, setAadhaarFront] = useState(null);
  const [aadhaarBack, setAadhaarBack] = useState(null);
  const [aadhaarUploading, setAadhaarUploading] = useState(false);

  // Driving License
  const [dlNumber, setDlNumber] = useState('');
  const [dlExpiry, setDlExpiry] = useState('');
  const [dlFront, setDlFront] = useState(null);
  const [dlBack, setDlBack] = useState(null);
  const [dlUploading, setDlUploading] = useState(false);

  // ── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      setProfileData({ name: user.name || '', email: user.email || '' });
      fetchProfileStats();
      // If we have a cached photo URL, skip showing the loading spinner for verif status
      // and do a silent background refresh instead
      const hasCached = !!getCachedPhotoUrl();
      fetchVerificationStatus({ silent: hasCached });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setHasChanges(
        profileData.name !== (user.name || '') ||
        profileData.email !== (user.email || '')
      );
    }
  }, [profileData, user]);

  const fetchProfileStats = async () => {
    try {
      setProfileStatsLoading(true);
      const res = await api.get('/rides/user/stats');
      const data = res.data?.data || res.data || {};

      setTotalRides(data.totalRides || data.totalBookings || 0);
      setCompletedCount(data.completedRides || data.completedTrips || 0);
      setTotalEarnings(data.totalEarnings ?? data.totalSpent ?? 0);

      if (user?.role === 'driver') {
        const ridesRes = await api.get('/rides/my', { params: { status: 'completed' } });
        let ridesData = ridesRes.data?.data || ridesRes.data || [];
        if (!Array.isArray(ridesData)) ridesData = ridesRes.data?.rides || [];
        setRecentCompletedRides(Array.isArray(ridesData) ? ridesData.slice(0, 3) : []);
      } else {
        setRecentCompletedRides([]);
      }
    } catch (err) {
      console.error('Failed to fetch profile stats:', err);
      setTotalRides(0);
      setCompletedCount(0);
      setTotalEarnings(0);
      setRecentCompletedRides([]);
    } finally {
      setProfileStatsLoading(false);
    }
  };

  const fetchVerificationStatus = async ({ silent = false } = {}) => {
    if (!silent) setVerifLoading(true);
    try {
      const res = await getVerificationStatus();
      setVerif(res.data);
      // Cache the profile photo URL so we don't hit S3 on every tab switch
      const fetchedUrl = res.data?.profilePhotoUrl || null;
      if (fetchedUrl) {
        setCachedPhotoUrl(fetchedUrl);
        setCachedPhotoUrlState(fetchedUrl);
      }
    } catch (err) {
      console.error('Failed to fetch verification status:', err);
    } finally {
      if (!silent) setVerifLoading(false);
    }
  };

  // ── Profile save ────────────────────────────────────────────────────────
  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileData.name.trim() || profileData.name.trim().length < 2)
      return toast.error('Name must be at least 2 characters');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email))
      return toast.error('Enter a valid email address');
    setIsSaving(true);
    try {
      const updated = await updateUserProfile(profileData);
      updateUser(updated);
      toast.success('Profile updated');
      setIsEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Photo upload ─────────────────────────────────────────────────────────
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('File size must be under 5MB');
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) return;
    setPhotoUploading(true);
    try {
      await uploadProfilePhoto(photoFile);
      toast.success('Profile photo uploaded');
      // Invalidate cache so fresh signed URL is fetched
      setCachedPhotoUrl(null);
      setCachedPhotoUrlState(null);
      setPhotoFile(null);
      setPhotoLoaded(false);
      await fetchVerificationStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Photo upload failed');
    } finally {
      setPhotoUploading(false);
    }
  };

  // ── Aadhaar upload ───────────────────────────────────────────────────────
  const handleAadhaarUpload = async () => {
    const clean = aadhaarNumber.replace(/\D/g, '');
    if (clean.length !== 12) return toast.error('Aadhaar number must be exactly 12 digits');
    if (!aadhaarFront) return toast.error('Upload the front of your Aadhaar');
    if (!aadhaarBack) return toast.error('Upload the back of your Aadhaar');
    setAadhaarUploading(true);
    try {
      await uploadAadhaar(clean, aadhaarFront, aadhaarBack);
      toast.success('Aadhaar uploaded successfully');
      setAadhaarFront(null);
      setAadhaarBack(null);
      await fetchVerificationStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Aadhaar upload failed');
    } finally {
      setAadhaarUploading(false);
    }
  };

  // ── DL upload ────────────────────────────────────────────────────────────
  const handleDLUpload = async () => {
    const cleanDL = dlNumber.replace(/[\s-]/g, '').toUpperCase();
    if (!cleanDL) return toast.error('Enter your driving license number');
    if (!dlExpiry) return toast.error('Enter license expiry date');
    if (new Date(dlExpiry) <= new Date()) return toast.error('License appears to be expired');
    if (!dlFront) return toast.error('Upload the front of your driving license');
    if (!dlBack) return toast.error('Upload the back of your driving license');
    setDlUploading(true);
    try {
      await uploadDrivingLicense(cleanDL, dlExpiry, dlFront, dlBack);
      toast.success('Driving license uploaded successfully');
      setDlFront(null);
      setDlBack(null);
      await fetchVerificationStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'DL upload failed');
    } finally {
      setDlUploading(false);
    }
  };

  // ── Submit for review ────────────────────────────────────────────────────
  const handleSubmitForReview = async () => {
    setSubmitting(true);
    try {
      await submitForReview();
      toast.success('Documents submitted! Review takes 24–48 hours.');
      await fetchVerificationStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  const formatAadhaar = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 12);
    return digits.replace(/(\d{4})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join('-')
    );
  };

  const isLocked = verif && ['submitted', 'approved'].includes(verif.status);
  const canSubmit = verif?.allStepsDone && !isLocked;
  // Use preview → fresh verif URL → session cache → stored in user object (fallback chain)
  const profilePhotoUrl = photoPreview || verif?.profilePhotoUrl || cachedPhotoUrl || user?.driverVerification?.profilePhoto?.url;

  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Account</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your profile and driver verification</p>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
          {[
            { key: 'profile', label: 'Profile' },
            {
              key: 'verification',
              label: (
                <span className="flex flex-wrap items-center justify-center gap-2">
                  <span>Driver Verification</span>
                  {verif && <VerificationBadge status={verif.status} />}
                </span>
              )
            }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 min-w-0 py-2.5 px-3 text-sm font-semibold rounded-xl transition-all ${activeTab === key
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md transform scale-[1.01]'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white'
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            TAB: PROFILE
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'profile' && (
          <div className="space-y-4">

            {/* Profile hero */}
            <SectionCard className="!p-0 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-green-600 px-6 pt-8 pb-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/10 ring-2 ring-white/20 shadow-xl flex-shrink-0">
                      {profilePhotoUrl ? (
                        <>
                          {/* Skeleton shown until image fully loads */}
                          {!photoLoaded && (
                            <div className="absolute inset-0 bg-white/20 animate-pulse rounded-2xl" />
                          )}
                          <img
                            key={profilePhotoUrl}
                            src={profilePhotoUrl}
                            alt="Profile"
                            loading="eager"
                            className={`w-full h-full object-cover transition-opacity duration-300 ${photoLoaded ? 'opacity-100' : 'opacity-0'}`}
                            onLoad={() => setPhotoLoaded(true)}
                          />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-10 h-10 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {user?.isDriverVerified && (
                      <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="text-center sm:text-left">
                    <h2 className="text-xl font-bold text-white">{user?.name || 'User'}</h2>
                    <p className="text-gray-400 text-sm text-white">{user?.email}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap justify-center sm:justify-start">
                      <span className="text-xs bg-white/10 text-gray-300 px-2.5 py-1 rounded-full">
                        Member since {user?.createdAt ? new Date(user.createdAt).getFullYear() : '2024'}
                      </span>
                      {user?.isDriverVerified && (
                        <span className="text-xs bg-green-500/20 text-green-300 border border-green-500/30 px-2.5 py-1 rounded-full font-semibold">
                          ✓ Verified Driver
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats strip */}
              <div className="grid grid-cols-3 divide-x divide-gray-100 bg-white">
                <div className="py-4 px-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{totalRides}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Total Rides</p>
                </div>
                <div className="py-4 px-4 text-center">
                  <p className="text-sm font-semibold text-green-600 flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 bg-green-400 rounded-full" /> Active
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Account</p>
                </div>
                <div className="py-4 px-4 text-center">
                  <p className="text-sm font-semibold">
                    {verif ? <VerificationBadge status={verif.status} /> : '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1.5">Driver Status</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirmed earnings</h3>
                  <p className="text-sm text-gray-500">Your verified earnings and recent completed ride details.</p>
                </div>
                <div className="rounded-3xl bg-slate-50 px-4 py-3 text-right">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Confirmed earnings</p>
                  <p className="mt-2 text-2xl font-bold text-green-600">₹{totalEarnings.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {completedCount} completed {user?.role === 'driver' ? 'rides' : 'trips'}
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                {profileStatsLoading ? (
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded-full w-28 animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded-full w-40 animate-pulse" />
                  </div>
                ) : recentCompletedRides.length ? (
                  recentCompletedRides.map((ride) => (
                    <div key={ride._id} className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-gray-100 bg-white shadow-sm">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">Ride {ride._id?.slice?.(0, 8) || 'N/A'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {ride.start || 'Unknown'} → {ride.end || 'Unknown'} · {ride.date ? new Date(ride.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Date unknown'}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-800">₹{ride.fare ?? ride.baseFare ?? 0}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                    No completed rides found yet. Confirmed earnings will appear here after a completed trip.
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Verification prompt */}
            {verif && verif.status !== 'approved' && (
              <button
                onClick={() => setActiveTab('verification')}
                className={`w-full rounded-2xl p-4 border text-left flex items-start gap-3 transition-all hover:shadow-md active:scale-[0.99]
                  ${verif.status === 'rejected' ? 'bg-red-50 border-red-200' :
                    verif.status === 'submitted' ? 'bg-blue-50 border-blue-200' :
                      'bg-amber-50 border-amber-200'}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                  ${verif.status === 'rejected' ? 'bg-red-100' :
                    verif.status === 'submitted' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                  {verif.status === 'submitted'
                    ? <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    : verif.status === 'rejected'
                      ? <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      : <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">
                    {verif.status === 'submitted' ? 'Verification under review' :
                      verif.status === 'rejected' ? 'Verification rejected — action required' :
                        'Complete driver verification to post rides'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {verif.status === 'submitted'
                      ? 'Your documents are being reviewed. Usually takes 24–48 hours.'
                      : verif.status === 'rejected'
                        ? verif.rejectionReason || 'Please re-submit your documents.'
                        : 'Upload your profile photo, Aadhaar, and driving license.'}
                  </p>
                </div>
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Edit profile form */}
            <SectionCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Personal Details</h3>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleProfileSave} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Full Name</label>
                  {isEditing ? (
                    <input
                      value={profileData.name}
                      onChange={e => setProfileData(p => ({ ...p, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="Your full name"
                      required
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">{user?.name || '—'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Email Address</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={e => setProfileData(p => ({ ...p, email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="you@example.com"
                      required
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">{user?.email || '—'}</p>
                  )}
                </div>

                {isEditing && (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isSaving || !hasChanges}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white py-2.5 rounded-xl font-semibold text-sm hover:from-blue-700 hover:to-blue-600 hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
                    >
                      {isSaving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setProfileData({ name: user?.name || '', email: user?.email || '' });
                      }}
                      className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </form>
            </SectionCard>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: DRIVER VERIFICATION
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'verification' && (
          <div className="space-y-4">

            {/* Status overview */}
            <SectionCard>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Driver Verification</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Required to post rides on ShareMyRide</p>
                </div>
                {verif && <VerificationBadge status={verif.status} />}
              </div>

              {verifLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-8 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : verif ? (
                <div className="space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <StepCheck done={verif.steps?.profilePhoto} label="Profile photo" sublabel="Clear face photo" />
                  <StepCheck done={verif.steps?.aadhaar} label="Aadhaar card (KYC)" sublabel="12-digit Aadhaar, both sides" />
                  <StepCheck done={verif.steps?.drivingLicense} label="Driving license" sublabel="Valid Indian DL, both sides" />
                </div>
              ) : null}

              {verif?.status === 'rejected' && verif.rejectionReason && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Rejection Reason
                  </p>
                  <p className="text-sm text-red-600 mt-1">{verif.rejectionReason}</p>
                </div>
              )}

              {verif?.status === 'approved' && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-green-800">You're a verified driver!</p>
                    <p className="text-xs text-green-600 mt-0.5">You can now post rides on ShareMyRide.</p>
                  </div>
                </div>
              )}

              {verif?.status === 'submitted' && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-blue-800">Documents submitted for review</p>
                  <p className="text-xs text-blue-600 mt-1">Our team reviews documents within 24–48 hours. You'll be notified once approved.</p>
                  {verif.submittedAt && (
                    <p className="text-xs text-blue-400 mt-1">
                      Submitted: {new Date(verif.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              )}
            </SectionCard>

            {/* ── Step 1: Profile Photo ─────────────────────────────── */}
            {!isLocked && (
              <SectionCard>
                <StepHeader num="1" done={verif?.steps?.profilePhoto} title="Profile Photo" subtitle="A clear photo of your face. No sunglasses or hats." />

                <div className="flex gap-4 items-start">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200 shadow-sm">
                    {profilePhotoUrl ? (
                      <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <DocUploadField
                      label="Select photo"
                      accept="image/jpeg,image/png,image/webp"
                      file={photoFile}
                      onChange={handlePhotoChange}
                      uploaded={verif?.steps?.profilePhoto}
                    />
                    {photoFile && (
                      <button
                        onClick={handlePhotoUpload}
                        disabled={photoUploading}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-600 hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
                      >
                        {photoUploading ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Uploading…
                          </span>
                        ) : 'Upload Photo'}
                      </button>
                    )}
                  </div>
                </div>
              </SectionCard>
            )}

            {/* ── Step 2: Aadhaar ───────────────────────────────────── */}
            {!isLocked && (
              <SectionCard>
                <StepHeader num="2" done={verif?.steps?.aadhaar} title="Aadhaar Card" subtitle="Government-issued identity verification (KYC)" />

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                      Aadhaar Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="1234-5678-9012"
                      value={aadhaarNumber}
                      onChange={e => setAadhaarNumber(formatAadhaar(e.target.value))}
                      maxLength={14}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                    {verif?.aadhaarMasked && (
                      <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" /></svg>
                        Saved: {verif.aadhaarMasked}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DocUploadField
                      label="Front side *"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      file={aadhaarFront}
                      onChange={e => setAadhaarFront(e.target.files[0])}
                      uploaded={verif?.aadhaarFrontUploaded}
                    />
                    <DocUploadField
                      label="Back side *"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      file={aadhaarBack}
                      onChange={e => setAadhaarBack(e.target.files[0])}
                      uploaded={verif?.aadhaarBackUploaded}
                    />
                  </div>

                  {(verif?.documents?.aadhaar?.frontImageUrl || verif?.documents?.aadhaar?.backImageUrl) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <DocumentPreviewCard label="Aadhaar front" url={verif?.documents?.aadhaar?.frontImageUrl} />
                      <DocumentPreviewCard label="Aadhaar back" url={verif?.documents?.aadhaar?.backImageUrl} />
                    </div>
                  )}

                  <button
                    onClick={handleAadhaarUpload}
                    disabled={aadhaarUploading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-600 hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
                  >
                    {aadhaarUploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Uploading…
                      </span>
                    ) : verif?.steps?.aadhaar ? 'Re-upload Aadhaar' : 'Upload Aadhaar'}
                  </button>
                </div>
              </SectionCard>
            )}

            {/* ── Step 3: Driving License ───────────────────────────── */}
            {!isLocked && (
              <SectionCard>
                <StepHeader num="3" done={verif?.steps?.drivingLicense} title="Driving License" subtitle="Valid Indian driving license — must not be expired" />

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                        DL Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="PB0120200012345"
                        value={dlNumber}
                        onChange={e => setDlNumber(e.target.value.toUpperCase())}
                        maxLength={20}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      />
                      {verif?.dlNumber && (
                        <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" /></svg>
                          Saved: {verif.dlNumber}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                        Expiry Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={dlExpiry}
                        onChange={e => setDlExpiry(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      />
                      {verif?.dlExpiry && (
                        <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" /></svg>
                          Expires: {new Date(verif.dlExpiry).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DocUploadField
                      label="Front side *"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      file={dlFront}
                      onChange={e => setDlFront(e.target.files[0])}
                      uploaded={verif?.dlFrontUploaded}
                    />
                    <DocUploadField
                      label="Back side *"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      file={dlBack}
                      onChange={e => setDlBack(e.target.files[0])}
                      uploaded={verif?.dlBackUploaded}
                    />
                  </div>

                  {(verif?.documents?.drivingLicense?.frontImageUrl || verif?.documents?.drivingLicense?.backImageUrl) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <DocumentPreviewCard label="Driving license front" url={verif?.documents?.drivingLicense?.frontImageUrl} />
                      <DocumentPreviewCard label="Driving license back" url={verif?.documents?.drivingLicense?.backImageUrl} />
                    </div>
                  )}

                  <button
                    onClick={handleDLUpload}
                    disabled={dlUploading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-600 hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
                  >
                    {dlUploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Uploading…
                      </span>
                    ) : verif?.steps?.drivingLicense ? 'Re-upload DL' : 'Upload Driving License'}
                  </button>
                </div>
              </SectionCard>
            )}

            {/* ── Submit for Review ─────────────────────────────────── */}
            {!isLocked && (
              <SectionCard>
                <h4 className="font-semibold text-gray-900 mb-1">Submit for Review</h4>
                <p className="text-xs text-gray-500 mb-4">
                  Once all 3 steps are complete, submit your documents. Our team will review and approve within 24–48 hours.
                </p>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>Completion</span>
                    <span>
                      {[verif?.steps?.profilePhoto, verif?.steps?.aadhaar, verif?.steps?.drivingLicense].filter(Boolean).length}/3 steps
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                      style={{
                        width: `${([verif?.steps?.profilePhoto, verif?.steps?.aadhaar, verif?.steps?.drivingLicense].filter(Boolean).length / 3) * 100}%`
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleSubmitForReview}
                  disabled={!canSubmit || submitting}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all
                    ${canSubmit
                      ? 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting…
                    </span>
                  ) : 'Submit Documents for Review'}
                </button>
                {!verif?.allStepsDone && (
                  <p className="text-xs text-center text-gray-400 mt-2">Complete all 3 steps above to enable submission</p>
                )}
              </SectionCard>
            )}

            {/* Locked — submitted */}
            {isLocked && verif.status === 'submitted' && (
              <div className="bg-blue-50 rounded-2xl border border-blue-200 p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-bold text-blue-900 text-lg">Documents Under Review</h4>
                <p className="text-sm text-blue-700 mt-2 max-w-xs mx-auto">
                  Our team is reviewing your documents. We'll notify you once approved — typically within 24–48 hours.
                </p>
                {verif.submittedAt && (
                  <p className="text-xs text-blue-400 mt-3">
                    Submitted on {new Date(verif.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;