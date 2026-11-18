import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { IconContext } from 'react-icons';
import { AuthProvider } from '@/context/AuthContext';
import { LocationProvider } from '@/context/LocationContext';
import { CartProvider } from '@/context/CartContext';
import { ToastProvider } from '@/context/ToastContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { ScrollToTop } from '@/routes/ScrollToTop';
import { AppRoutes } from '@/routes/AppRoutes';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import '@/styles/main.scss';

// Icons come from react-icons (Tabler set). 24px matches the size the app was laid out with when no size is passed.
const ICON_DEFAULTS = { size: '24' };

function App() {
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        // Straight to the API (not through the Vercel /api rewrite), so the request counts against the user's own IP.
        fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/ping`, { method: 'GET', keepalive: true }).catch(() => {});
      }
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <IconContext.Provider value={ICON_DEFAULTS}>
      <ErrorBoundary>
        <LanguageProvider>
          <BrowserRouter>
            <AuthProvider>
              <LocationProvider>
                <CartProvider>
                  <ToastProvider>
                    <ScrollToTop />
                    <AppRoutes />
                  </ToastProvider>
                </CartProvider>
              </LocationProvider>
            </AuthProvider>
          </BrowserRouter>
        </LanguageProvider>
      </ErrorBoundary>
    </IconContext.Provider>
  );
}

export default App;
