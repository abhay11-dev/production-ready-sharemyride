import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import { UserProvider } from './contexts/UserContext';

function App() {
  return (
    <Router>
      <UserProvider>
        <div className="min-h-screen flex flex-col bg-gray-50">
          {/* Header */}
          <Header />
          
          {/* Main Content */}
          <main className="flex-1">
            <AppRoutes />
          </main>
          
          {/* Footer */}
          <Footer />
          
          {/* Scroll to Top Button */}
          <ScrollToTop />
        </div>
      </UserProvider>
    </Router>
  );
}

// Scroll to Top Component
const ScrollToTop = () => {
  const [isVisible, setIsVisible] = React.useState(false);

  // Show button when page is scrolled down
  React.useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  // Scroll to top smoothly
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
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