import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import './ToastContainer.scss';

export const ToastContainer = ({ toasts, onRemove }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} className="toast-icon success" />;
      case 'error':
        return <AlertCircle size={18} className="toast-icon error" />;
      case 'warning':
        return <AlertTriangle size={18} className="toast-icon warning" />;
      case 'info':
      default:
        return <Info size={18} className="toast-icon info" />;
    }
  };

  return (
    <div className="pmart-toast-portal" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`pmart-toast-item type-${t.type}`}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            layout
          >
            <div className="toast-icon-wrap">{getIcon(t.type)}</div>
            <div className="toast-body">
              {t.title && <div className="toast-title">{t.title}</div>}
              <div className="toast-message">{t.message}</div>
            </div>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => onRemove(t.id)}
              aria-label="Close notification"
            >
              <X size={15} />
            </button>
            {t.duration > 0 && (
              <div
                className="toast-progress-bar"
                style={{ animationDuration: `${t.duration}ms` }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
