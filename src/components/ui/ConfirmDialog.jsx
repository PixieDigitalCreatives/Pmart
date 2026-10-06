import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  isConfirming = false
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="dialog-text">
        {message}
      </p>
      <div className="dialog-actions">
        <Button variant="neutral" onClick={onClose} disabled={isConfirming} className="badge-neutral" style={{ padding: '8px 16px' }}>
          {cancelText}
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} isLoading={isConfirming}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};
