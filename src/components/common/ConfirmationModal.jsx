import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';
import './ConfirmationModal.scss';
import { Button } from '@/components/ui';

export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  icon = null,
  loading = false
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  const renderIcon = () => {
    if (icon) return icon;
    if (variant === 'danger') return <Trash2 size={24} className="modal-lead-icon danger" />;
    if (variant === 'warning') return <AlertTriangle size={24} className="modal-lead-icon warning" />;
    return <Info size={24} className="modal-lead-icon info" />;
  };

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={() => !loading && onClose()}>
        <motion.div
          className={`modal-content confirmation-modal variant-${variant}`}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
        >
          <Button
            type="button"
            className="modal-close-icon"
            onClick={() => !loading && onClose()}
            disabled={loading}
            aria-label="Close dialog"
          >
            <X size={18} />
          </Button>

          <div className="confirmation-modal-body">
            <div className={`icon-badge variant-${variant}`}>
              {renderIcon()}
            </div>

            <h3 className="modal-title">{title}</h3>
            <p className="modal-message">{message}</p>

            <div className="modal-actions">
              <Button
                type="button"
                
                onClick={onClose}
                disabled={loading}
               variant="secondary">
                {cancelText}
              </Button>
              <Button
                type="button"
                className={`btn ${variant === 'danger' ? 'btn-primary' : variant === 'warning' ? 'btn-primary' : 'btn-primary'}`}
                style={
                  variant === 'danger'
                    ? { backgroundColor: '#F20D18', borderColor: '#F20D18' }
                    : variant === 'warning'
                    ? { backgroundColor: '#d97706', borderColor: '#d97706' }
                    : {}
                }
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? 'Processing...' : confirmText}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
