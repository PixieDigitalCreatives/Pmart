import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';

/**
 * useAdminShortcuts - Global Keyboard Shortcuts for PMart Admin ERP
 * Allows keyboard-only navigation across the ERP terminal just like Marg ERP & Tally.
 */
export const useAdminShortcuts = ({ onOpenHelp }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, setLang, speak } = useLanguage();

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

      // F1 / '?' -> Open Shortcut Cheat Sheet
      if (e.key === 'F1' || (!isInput && e.key === '?')) {
        e.preventDefault();
        onOpenHelp?.();
        return;
      }

      // F2 -> New Invoice (POS Billing)
      if (e.key === 'F2') {
        e.preventDefault();
        if (location.pathname === '/admin/billing/new' || location.pathname === '/admin/billing/invoices/new') {
          // If already on billing, focus the scanner or search input
          const scanInput = document.querySelector('.scanner-input, input[type="search"], .product-search input');
          if (scanInput) {
            scanInput.focus();
            scanInput.select?.();
          }
        } else {
          navigate('/admin/billing/new');
        }
        return;
      }

      // F3 -> Restock (स्टॉक बढ़ाएं)
      if (e.key === 'F3') {
        e.preventDefault();
        navigate('/admin/inventory/restock');
        return;
      }

      // F4 -> Products List (सामान सूची)
      if (e.key === 'F4') {
        e.preventDefault();
        navigate('/admin/products');
        return;
      }

      // F6 -> Customers & Ledger (ग्राहक सूची व पूरा खाता)
      if (e.key === 'F6') {
        e.preventDefault();
        navigate('/admin/customers');
        return;
      }

      // F7 -> Past Invoices (पुराने बिल)
      if (e.key === 'F7') {
        e.preventDefault();
        navigate('/admin/billing/invoices');
        return;
      }

      // F8 -> Outstandings (बाकी पैसे)
      if (e.key === 'F8') {
        e.preventDefault();
        navigate('/admin/billing/outstandings');
        return;
      }

      // F9 -> Payments History (भुगतान विवरण)
      if (e.key === 'F9') {
        e.preventDefault();
        navigate('/admin/billing/payments');
        return;
      }

      // F10 -> Reports (व्यापार रिपोर्ट्स)
      if (e.key === 'F10') {
        e.preventDefault();
        navigate('/admin/reports');
        return;
      }

      // Alt + H -> Billing ERP Home (डैशबोर्ड)
      if (e.altKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        navigate('/admin/billing');
        return;
      }

      // Alt + L -> Toggle Language (हिंदी / English)
      if (e.altKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        const nextLang = lang === 'hi' ? 'en' : 'hi';
        setLang(nextLang);
        speak?.(nextLang === 'hi' ? 'भाषा हिंदी चुनी गई' : 'Language set to English');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location.pathname, lang, setLang, speak, onOpenHelp]);
};

