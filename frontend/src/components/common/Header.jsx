import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import NotificationDropdown from '../NotificationDropdown.jsx';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const sidebarRef = useRef(null);

  // Shrink header on scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when sidebar open
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isMenuOpen && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) =>
    `relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${isActive(path)
      ? 'bg-white/20 text-white'
      : 'text-blue-100 hover:text-white hover:bg-white/10'
    }`;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${scrolled
          ? 'bg-blue-700/98 backdrop-blur-md shadow-lg shadow-blue-900/20'
          : 'bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500'
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex items-center justify-between transition-all duration-200 ${scrolled ? 'h-14' : 'h-16'}`}>

            {/* ── Logo ── */}
            <Link
              to="/"
              className="flex items-center gap-2 group flex-shrink-0"
              aria-label="ShareMyRide home"
            >
              <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center group-hover:bg-white/25 transition-colors duration-150">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                </svg>
              </div>
              <span className="text-white font-bold text-lg tracking-tight leading-none">
                ShareMyRide
              </span>
            </Link>

            {/* ── Desktop Nav ── */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Primary navigation">
              <Link to="/ride/search" className={navLinkClass('/ride/search')}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Find a Ride</span>
              </Link>

              <Link to="/ride/post" className={navLinkClass('/ride/post')}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Offer a Ride</span>
              </Link>

              {user && (
                <>
                  <Link to="/upcoming-rides" className={navLinkClass('/upcoming-rides')}>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>My Trips</span>
                  </Link>

                  <Link to="/bookings/my-bookings" className={navLinkClass('/bookings/my-bookings')}>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>Bookings</span>
                  </Link>
                </>
              )}
            </nav>

            {/* ── Desktop Right Actions ── */}
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <>
                  <NotificationDropdown />

                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-blue-100 hover:text-white hover:bg-white/10 transition-all duration-150"
                  >
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm font-medium hidden lg:block">
                      {user?.name?.split(' ')[0] || 'Profile'}
                    </span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 bg-white text-blue-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-50 hover:shadow-md transition-all duration-150"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign out</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-blue-100 hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-all duration-150"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    className="bg-white text-blue-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-50 hover:shadow-md transition-all duration-150"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>

            {/* ── Mobile: Bell + Hamburger ── */}
            <div className="md:hidden flex items-center gap-1">
              {user && <NotificationDropdown />}

              <button
                onClick={() => setIsMenuOpen(true)}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-white hover:bg-white/10 transition-colors duration-150"
                aria-label="Open navigation menu"
                aria-expanded={isMenuOpen}
                aria-controls="mobile-sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* ── Mobile Sidebar Overlay ── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        aria-hidden="true"
        onClick={() => setIsMenuOpen(false)}
      />

      {/* Sidebar Panel */}
      <aside
        id="mobile-sidebar"
        ref={sidebarRef}
        className={`fixed top-0 right-0 bottom-0 z-[70] w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out md:hidden ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        aria-label="Mobile navigation"
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-700 to-blue-600 flex-shrink-0">
          <Link
            to="/"
            className="flex items-center gap-2"
            onClick={() => setIsMenuOpen(false)}
          >
            <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
              </svg>
            </div>
            <span className="text-white font-bold text-base">ShareMyRide</span>
          </Link>

          <button
            onClick={() => setIsMenuOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User block (when logged in) */}
        {user && (
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{user?.name || 'Traveller'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav Links — scrollable */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Rides</p>

          <MobileNavLink to="/ride/search" icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          } onClick={() => setIsMenuOpen(false)} active={isActive('/ride/search')}>
            Find a Ride
          </MobileNavLink>

          <MobileNavLink to="/ride/post" icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          } onClick={() => setIsMenuOpen(false)} active={isActive('/ride/post')}>
            Offer a Ride
          </MobileNavLink>

          {user && (
            <>
              <div className="pt-3 pb-1">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">My Account</p>
              </div>

              <MobileNavLink to="/upcoming-rides" icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              } onClick={() => setIsMenuOpen(false)} active={isActive('/upcoming-rides')}>
                Upcoming Trips
              </MobileNavLink>

              <MobileNavLink to="/bookings/my-bookings" icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              } onClick={() => setIsMenuOpen(false)} active={isActive('/bookings/my-bookings')}>
                My Bookings
              </MobileNavLink>

              <MobileNavLink to="/notifications" icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              } onClick={() => setIsMenuOpen(false)} active={isActive('/notifications')}>
                Ride Requests
              </MobileNavLink>

              <MobileNavLink to="/profile" icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              } onClick={() => setIsMenuOpen(false)} active={isActive('/profile')}>
                Profile & Settings
              </MobileNavLink>
            </>
          )}
        </nav>

        {/* Bottom CTA */}
        <div className="px-4 py-5 border-t border-gray-100 flex-shrink-0 space-y-2">
          {user ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors duration-150"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          ) : (
            <>
              <Link
                to="/signup"
                className="block w-full text-center bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-3 rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-600 transition-all duration-150"
                onClick={() => setIsMenuOpen(false)}
              >
                Get started — it's free
              </Link>
              <Link
                to="/login"
                className="block w-full text-center bg-gray-100 text-gray-700 px-4 py-3 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors duration-150"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </aside>

      {/* Spacer to prevent content going under fixed header */}
      <div className="h-16" aria-hidden="true" />
    </>
  );
}

function MobileNavLink({ to, icon, children, onClick, active }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${active
        ? 'bg-blue-50 text-blue-700'
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        }`}
    >
      <span className={active ? 'text-blue-600' : 'text-gray-400'}>{icon}</span>
      {children}
      {active && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" aria-hidden="true" />
      )}
    </Link>
  );
}

export default Header;