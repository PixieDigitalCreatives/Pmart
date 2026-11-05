import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { IconContext } from 'react-icons';
import { AuthProvider } from '@/context/AuthContext';
import { LocationProvider } from '@/context/LocationContext';
import { CartProvider } from '@/context/CartContext';
import { ToastProvider } from '@/context/ToastContext';
import { ScrollToTop } from '@/routes/ScrollToTop';
import { AppRoutes } from '@/routes/AppRoutes';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import '@/styles/main.scss';

// Icons come from react-icons (Tabler set). 24px matches the size the app was laid out with when no size is passed.
const ICON_DEFAULTS = { size: '24' };

function App() {
  return (
    <IconContext.Provider value={ICON_DEFAULTS}>
      <ErrorBoundary>
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
      </ErrorBoundary>
    </IconContext.Provider>
  );
}

export default App;
