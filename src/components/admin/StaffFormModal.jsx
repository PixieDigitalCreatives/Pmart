import React, { useEffect, useState } from 'react';
import { TbCopy as Copy, TbCheck as Check } from 'react-icons/tb';
import { adminService } from '@/services/adminService';
import { apiErrorMessage } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { PermissionSelector } from './PermissionSelector';
import { Modal, FormField, Input, Button } from '@/components/ui';

const EMPTY = { name: '', phone: '', email: '', permissions: [], isActive: true };

/** Shows the one-time activation link the new staff member uses to set a password. */
export const ActivationLink = ({ path }) => {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}${path}`;
  return (
    <div>
      <p className="text-sm mb-2">Send this one-time link to the employee. It expires in 72 hours and can be used once.</p>
      <div className="flex gap-2 items-center">
        <Input readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Activation link" />
        <Button
          variant="secondary"
          onClick={() => {
            navigator.clipboard?.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          aria-label="Copy link"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </Button>
      </div>
    </div>
  );
};

/** Create an employee (who activates via a link) or edit a staff account. */
export const StaffFormModal = ({ isOpen, staff, onClose, onSaved }) => {
  const { user: me } = useAuth();
  const editing = Boolean(staff);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activationPath, setActivationPath] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setActivationPath('');
    setForm(staff ? { name: staff.name || '', phone: staff.phone || '', email: staff.email || '', permissions: staff.permissions || [], isActive: staff.isActive } : EMPTY);
  }, [isOpen, staff]);

  const isAdminAccount = staff?.role === 'ADMIN';
  const isSelf = staff && String(staff.id) === String(me?.id);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return setError('Name and phone are required.');
    setSaving(true);
    setError('');
    try {
      if (editing) {
        const payload = { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), isActive: form.isActive };
        if (!isAdminAccount) payload.permissions = form.permissions;
        await adminService.updateEmployee(staff.id, payload);
        onSaved('Staff account updated.');
      } else {
        const res = await adminService.createEmployee({ name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), permissions: form.permissions });
        setActivationPath(res.activationPath);
        onSaved('Employee created.', { keepOpen: true });
      }
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !saving && onClose()} title={editing ? `Edit ${isAdminAccount ? 'administrator' : 'employee'}` : 'Add employee'}>
      {activationPath ? (
        <>
          <ActivationLink path={activationPath} />
          <div className="actions-row mt-4" style={{ justifyContent: 'flex-end' }}>
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </>
      ) : (
        <form onSubmit={submit}>
          <div className="form-grid">
            <FormField label="Full name *" htmlFor="staff-name">
              <Input id="staff-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} />
            </FormField>
            <FormField label="Mobile number *" htmlFor="staff-phone">
              <Input id="staff-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </FormField>
          </div>
          <FormField label="Email" htmlFor="staff-email">
            <Input id="staff-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          {isAdminAccount ? (
            <p className="muted-note mb-3">Administrators have every permission.</p>
          ) : (
            <div className="mb-3">
              <span className="text-sm font-semibold block mb-2">Permissions</span>
              <PermissionSelector value={form.permissions} onChange={(permissions) => setForm({ ...form, permissions })} />
            </div>
          )}
          {editing && !isSelf && (
            <label htmlFor="staff-active" className="flex items-center gap-2 mb-3 text-sm">
              <input id="staff-active" type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Account active
            </label>
          )}
          {error && <div className="alert alert-error mb-3">{error}</div>}
          <div className="actions-row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              {editing ? 'Save' : 'Create and get link'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
