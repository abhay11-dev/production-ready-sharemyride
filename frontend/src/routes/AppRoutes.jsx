import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from '../pages/Home/Home';
import Login from '../pages/Auth/Login';
import Signup from '../pages/Auth/Signup';
import ForgotPassword from '../pages/Auth/ForgotPassword.jsx';
import Terms from '../pages/Auth/Terms.jsx';
import RideSearch from '../pages/RideSearch/RideSearch';
import RidePost from '../pages/RidePost/RidePost';
import Profile from '../pages/Profile/Profile.jsx';
import NotificationsPage from '../pages/NotificationsPage';
import MyBookings from '../pages/bookings/MyBookings.jsx';
import DriverBookings from '../pages/bookings/DriverBookings.jsx';
import { useAuth } from '../hooks/useAuth';
import PaymentSetupForm from '../pages/PaymentSetupForm.jsx';
import UpcomingRides from '../pages/rides/UpcomingRides';
import DriverUpcomingRides from '../pages/driver/DriverUpcomingRides';

import PaymentSuccess from "../pages/PaymentSuccess.jsx";
import PaymentFailed from "../pages/PaymentFailed.jsx";
// Add these routes

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirects to home if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return !user ? children : <Navigate to="/" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      
      {/* Auth Routes - Redirect to home if already logged in */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />

       <Route 
        path="/terms" 
        element={
          <PublicRoute>
            <Terms />
          </PublicRoute>
        } 
      />

       <Route 
        path="/forgot-password" 
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        } 
      />

      <Route 
        path="/signup" 
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        } 
      />


      <Route path="/upcoming-rides" element={<UpcomingRides />} />
<Route path="/driver/upcoming-rides" element={<DriverUpcomingRides />} />
      
      {/* Protected Routes - Require authentication */}
      <Route 
        path="/ride/search" 
        element={
          <ProtectedRoute>
            <RideSearch />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/ride/post" 
        element={
          <ProtectedRoute>
            <RidePost />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } 
      />

      {/* Notification Routes */}
      <Route 
        path="/notifications" 
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        } 
      />

      {/* Booking Routes */}
      <Route 
        path="/bookings/my-bookings" 
        element={
          <ProtectedRoute>
            <MyBookings />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/bookings/driver" 
        element={
          <ProtectedRoute>
            <DriverBookings />
          </ProtectedRoute>
        } 
      />
<Route 
  path="/payment/setup" 
  element={<ProtectedRoute><PaymentSetupForm /></ProtectedRoute>} 
/>

<Route path="/payment-success/:bookingId" element={<PaymentSuccess />} />
<Route path="/payment-failed/:bookingId" element={<PaymentFailed />} />

      {/* 404 Not Found Route */}
      <Route 
        path="*" 
        element={
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 px-4">
            <div className="text-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">Page Not Found</h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                The page you're looking for doesn't exist or has been moved.
              </p>
              <a 
                href="/" 
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-600 hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Back to Home
              </a>
            </div>
          </div>
        } 
      />
    </Routes>




  );
}

export default AppRoutes;