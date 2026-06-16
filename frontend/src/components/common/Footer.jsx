import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import BrandAnimation from '../BrandAnimation/BrandAnimation.jsx';

const FOOTER_LINKS = {
  product: {
    label: 'Product',
    links: [
      { label: 'Find a Ride', to: '/ride/search' },
      { label: 'Offer a Ride', to: '/ride/post' },
      { label: 'My Bookings', to: '/bookings/my-bookings' },
      { label: 'Upcoming Trips', to: '/upcoming-rides' },
    ],
  },
  company: {
    label: 'Company',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'How It Works', to: '/how-it-works' },
      { label: 'Community Guidelines', to: '/guidelines' },
      { label: 'Blog', to: '/blog' },
    ],
  },
  support: {
    label: 'Support',
    links: [
      { label: 'Help Centre', to: '/help' },
      { label: 'Contact Us', to: '/contact' },
      { label: 'Report an Issue', to: '/report' },
      { label: 'FAQs', to: '/faq' },
    ],
  },
  legal: {
    label: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/terms-and-privacy' },
      { label: 'Terms of Service', to: '/terms-and-privacy' },
      { label: 'Cookie Policy', to: '/cookies' },
    ],
  },
};

const SOCIAL_LINKS = [
  {
    label: 'X (Twitter)',
    href: 'https://twitter.com',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://instagram.com',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
];

function Footer() {
  const [showAnim, setShowAnim] = useState(false);

  const triggerAnim = useCallback((e) => {
    e.preventDefault();
    setShowAnim(true);
  }, []);

  return (
    <>
      {/* Brand animation overlay — triggered by logo click */}
      <BrandAnimation show={showAnim} onClose={() => setShowAnim(false)} />

      <footer className="bg-gray-950 text-gray-400">
        {/* ── Main content ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8 sm:pt-16 sm:pb-10">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">

            {/* Brand column */}
            <div className="col-span-2 sm:col-span-2 lg:col-span-1">
              {/* ── Clickable brand logo triggers animation ── */}
              <button
                onClick={triggerAnim}
                className="flex items-center gap-2 mb-4 group w-fit cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
                aria-label="View ShareMyRide brand animation"
                type="button"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-500 group-hover:scale-110 transition-all duration-200">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                    <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                  </svg>
                </div>
                <span className="text-white font-bold text-base group-hover:text-blue-400 transition-colors duration-200">
                  ShareMyRide
                </span>
                {/* Subtle sparkle hint on hover */}
                <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs">✨</span>
              </button>

              <p className="text-sm leading-relaxed mb-5 max-w-xs">
                A community-driven carpooling marketplace making travel affordable, sustainable, and social across India.
              </p>

              {/* Social links */}
              <div className="flex items-center gap-2">
                {SOCIAL_LINKS.map(s => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-150"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {Object.values(FOOTER_LINKS).map(col => (
              <div key={col.label}>
                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-widest mb-4">{col.label}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(link => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="text-sm text-gray-400 hover:text-white transition-colors duration-150"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-gray-500 text-center sm:text-left">
                &copy; {new Date().getFullYear()} ShareMyRide. All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                <Link to="/terms-and-privacy" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                  Privacy
                </Link>
                <Link to="/terms-and-privacy" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                  Terms
                </Link>
                {/* Bottom logo also triggers animation */}
                <button
                  onClick={triggerAnim}
                  className="text-xs text-gray-600 hover:text-blue-400 transition-colors duration-150 flex items-center gap-1 focus:outline-none"
                  type="button"
                  aria-label="View ShareMyRide brand animation"
                >
                  Made with 🚗 in India
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

export default Footer;