import React, { useState } from 'react';
import { TbAlertTriangle as AlertTriangle, TbTrash as Trash2 } from 'react-icons/tb';
import { billingService } from '@/services/billingService';
import { apiErrorMessage } from '@/services/apiClient';
import { useToast } from '@/context/ToastContext';
import { Modal, Button, FormField, Input, Select } from '@/components/ui';
import { money, PAYMENT_METHODS } from '@/utils/format';

const deletedMessage = (result) => {
  if (result.replayed) return `${result.number} was already deleted.`;
  if (!result.stockRestored) return `${result.number} deleted.`;
  return `${result.number} deleted. Stock put back${result.refunded > 0 ? `, ${money(result.refunded)} refunded` : ''}.`;
};

// Mounted only while open, so every opening starts with an empty form.
const DeleteInvoiceDialog = ({ invoice, onClose, onDeleted }) => {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('CASH');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cancelled = invoice.status === 'CANCELLED';
  const refund = cancelled ? 0 : invoice.amountPaid || 0;
  const close = () => !busy && onClose();
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await billingService.deleteInvoice(invoice._id, { reason: reason.trim(), refundMethod: refund > 0 ? refundMethod : undefined });
      toast.success(deletedMessage(result));
      onDeleted(result);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not delete the invoice.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={close} title={`Delete ${invoice.number}?`}>
      <p className="dialog-text">
        {cancelled
          ? 'The invoice and its payment and refund records are removed for good. Its stock was already put back when it was cancelled.'
          : `The invoice is cancelled first: every item not already returned goes back into stock${refund > 0 ? ` and the ${money(refund)} paid is refunded` : ''}. Then the invoice and its payment records are removed for good.`}{' '}
        The stock ledger and the audit log keep their record, and the number {invoice.number} is not reused. This cannot be undone.
      </p>
      <FormField label="Reason *" htmlFor="del-reason">
        <Input id="del-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} autoFocus />
      </FormField>
      {refund > 0 && (
        <FormField label={`Refund ${money(refund)} by`} htmlFor="del-method">
          <Select id="del-method" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </FormField>
      )}
      {error && (
        <div className="alert alert-error mb-3">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}
      <div className="dialog-actions">
        <Button variant="secondary" onClick={close} disabled={busy}>
          Keep invoice
        </Button>
        <Button variant="primary" isLoading={busy} disabled={reason.trim().length < 3} onClick={submit}>
          <Trash2 size={16} style={{ marginRight: 6 }} />
          Delete invoice
        </Button>
      </div>
    </Modal>
  );
};

/**
 * Confirms and performs a permanent invoice delete (admin only). The server cancels an invoice that is not cancelled
 * yet (stock goes back, what was paid is refunded by the chosen method), then removes it and its payment records.
 * `invoice` needs _id, number, status and amountPaid, so a list row is enough. Open it by passing an invoice; it
 * shows the result as a toast and then calls onDeleted.
 */
export const DeleteInvoiceModal = ({ invoice, ...props }) => (invoice ? <DeleteInvoiceDialog invoice={invoice} {...props} /> : null);
