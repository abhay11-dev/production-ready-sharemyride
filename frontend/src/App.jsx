import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, useLocation, useNavigate } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import { UserProvider } from './contexts/UserContext';
import { GoogleMapsProvider } from './contexts/GoogleMapsContext';
import { SocketProvider } from './contexts/SocketContext';
import { Toaster, useToasterStore, toast as hotToast } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <GoogleMapsProvider>
        <UserProvider>
          <SocketProvider>
            <AppShell />
          </SocketProvider>
        </UserProvider>
      </GoogleMapsProvider>
    </Router>
  );
}

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleInternalLinkClick = (event) => {
      const link = event.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return;

      const targetPath = `${url.pathname}${url.search}`;
      const currentPath = `${location.pathname}${location.search}`;

      if (targetPath === currentPath) {
        event.preventDefault();
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        return;
      }

      event.preventDefault();
      navigate(targetPath);
    };

    document.addEventListener('click', handleInternalLinkClick);

    return () => document.removeEventListener('click', handleInternalLinkClick);
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
  }, [location.pathname, location.search]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <Toaster
          position="top-right"
          reverseOrder={false}
          containerStyle={{ top: 72, right: 16, zIndex: 9999 }}
          toastOptions={{
            duration: 4000,
            style: {},
          }}
        />
      <main className="flex-1">
        <AppRoutes />
      </main>
      <Footer />
      <ScrollToTop />
      <ToastLimiter />
    </div>
  );
}

const ToastLimiter = () => {
  const { toasts } = useToasterStore();

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const TOAST_LIMIT = isMobile ? 2 : 3;

    const visibleToasts = toasts.filter((t) => t.visible);
    if (visibleToasts.length > TOAST_LIMIT) {
      const toastsToDismiss = visibleToasts.slice(TOAST_LIMIT);
      toastsToDismiss.forEach((t) => hotToast.dismiss(t.id));
    }
  }, [toasts]);

  return null;
};

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.pageYOffset > 300);
    };

    window.addEventListener('scroll', toggleVisibility);
    toggleVisibility();

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, [pathname]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4 rounded-full shadow-xl hover:from-blue-700 hover:to-blue-600 hover:shadow-2xl transform hover:scale-110 transition-all duration-300 z-50 group"
          aria-label="Scroll to top"
        >
          <svg
            className="w-6 h-6 transform group-hover:-translate-y-1 transition-transform duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}
    </>
  );
};

export default App;