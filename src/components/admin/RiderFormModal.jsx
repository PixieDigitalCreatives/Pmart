import React, { useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import { apiErrorMessage } from '@/services/apiClient';
import { Modal, FormField, Input, Select, Button } from '@/components/ui';

const VEHICLES = ['Bike', 'Scooter', 'Electric Bike', 'Bicycle'];
const EMPTY = { name: '', phone: '', vehicleType: 'Bike', vehicleNumber: '', licenseNumber: '', password: '', confirmPassword: '' };

/** Create a rider (with a temporary password) or edit an existing rider's details. */
export const RiderFormModal = ({ isOpen, rider, onClose, onSaved }) => {
  const editing = Boolean(rider);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setForm(
      rider
        ? { ...EMPTY, name: rider.name || '', phone: rider.phone || '', vehicleType: rider.vehicleType || 'Bike', vehicleNumber: rider.vehicleNumber || '', licenseNumber: rider.licenseNumber || '' }
        : EMPTY
    );
  }, [isOpen, rider]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.vehicleNumber.trim()) return setError('Name, phone and vehicle number are required.');
    if (!editing) {
      if (form.password.length < 8) return setError('The temporary password must be at least 8 characters.');
      if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    }
    setSaving(true);
    setError('');
    try {
      const payload = { name: form.name.trim(), phone: form.phone.trim(), vehicleType: form.vehicleType, vehicleNumber: form.vehicleNumber.trim(), licenseNumber: form.licenseNumber.trim() };
      if (editing) await adminService.updateRider(rider.id, payload);
      else await adminService.createRider({ ...payload, password: form.password });
      onSaved(editing ? 'Rider updated.' : 'Rider created. They will be asked to change the password on first sign-in.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the rider.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !saving && onClose()} title={editing ? 'Edit rider' : 'Add rider'}>
      <form onSubmit={submit}>
        <FormField label="Full name *" htmlFor="rider-name">
          <Input id="rider-name" value={form.name} onChange={set('name')} maxLength={100} />
        </FormField>
        <FormField label="Mobile number *" htmlFor="rider-phone" hint="Used to sign in">
          <Input id="rider-phone" type="tel" value={form.phone} onChange={set('phone')} />
        </FormField>
        <div className="form-grid">
          <FormField label="Vehicle type" htmlFor="rider-vtype">
            <Select id="rider-vtype" value={form.vehicleType} onChange={set('vehicleType')}>
              {VEHICLES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Vehicle number *" htmlFor="rider-vnum">
            <Input id="rider-vnum" value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })} maxLength={20} />
          </FormField>
        </div>
        <FormField label="Driving licence number" htmlFor="rider-license">
          <Input id="rider-license" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value.toUpperCase() })} maxLength={30} />
        </FormField>
        {!editing && (
          <div className="form-grid">
            <FormField label="Temporary password *" htmlFor="rider-pass" hint="At least 8 characters">
              <Input id="rider-pass" type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
            </FormField>
            <FormField label="Confirm password *" htmlFor="rider-pass2">
              <Input id="rider-pass2" type="password" value={form.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" />
            </FormField>
          </div>
        )}
        {error && <div className="alert alert-error mb-3">{error}</div>}
        <div className="actions-row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={saving}>
            {editing ? 'Save' : 'Create rider'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
