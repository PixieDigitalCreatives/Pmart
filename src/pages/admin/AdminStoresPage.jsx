import React, { useState, useEffect, useCallback } from 'react';
import { Store, Plus, Edit, MapPin } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { locationService } from '@/services/locationService';
import { apiErrorMessage } from '@/services/apiClient';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Button, StatusBadge, EmptyState, LoadingState, Modal, FormField, Input } from '@/components/ui';
import { plural } from '@/utils/plural';

const EMPTY = {
  name: '',
  phone: '',
  description: '',
  street: '',
  area: '',
  city: '',
  state: '',
  pincode: '',
  lat: '',
  lng: '',
  openTime: '08:00',
  closeTime: '22:00',
  deliveryRadiusKm: '5',
  isActive: true,
  isAcceptingOrders: true,
  ownerName: '',
  ownerPhone: '',
  ownerPassword: ''
};

const toForm = (s) => ({
  ...EMPTY,
  name: s.name,
  phone: s.phone || '',
  description: s.description || '',
  street: s.address.street,
  area: s.address.area || '',
  city: s.address.city,
  state: s.address.state,
  pincode: s.address.pincode,
  lat: String(s.location.lat),
  lng: String(s.location.lng),
  openTime: s.openTime,
  closeTime: s.closeTime,
  deliveryRadiusKm: String(s.deliveryRadiusKm),
  isActive: s.isActive,
  isAcceptingOrders: s.isAcceptingOrders
});

const StoreFormModal = ({ store, isOpen, onClose, onSaved }) => {
  const editing = Boolean(store);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setForm(store ? toForm(store) : EMPTY);
  }, [isOpen, store]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const useMyLocation = async () => {
    setLocating(true);
    setError('');
    try {
      const pos = await locationService.getCurrentLocation();
      setForm((f) => ({ ...f, lat: pos.lat.toFixed(6), lng: pos.lng.toFixed(6) }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLocating(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!form.name.trim() || !form.street.trim() || !form.city.trim() || !form.state.trim()) return setError('Name and full address are required.');
    if (!/^\d{6}$/.test(form.pincode.trim())) return setError('Pincode must be 6 digits.');
    if (!form.lat || !form.lng || !Number.isFinite(lat) || !Number.isFinite(lng)) return setError('Enter the store location (latitude and longitude).');
    if (!editing && (!form.ownerName.trim() || !form.ownerPhone.trim() || form.ownerPassword.length < 8)) {
      return setError('Store owner name, mobile number and a temporary password (8+ characters) are required.');
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      description: form.description.trim(),
      address: { street: form.street.trim(), area: form.area.trim(), city: form.city.trim(), state: form.state.trim(), pincode: form.pincode.trim() },
      location: { lat, lng },
      openTime: form.openTime,
      closeTime: form.closeTime,
      deliveryRadiusKm: Number(form.deliveryRadiusKm) || 5,
      isAcceptingOrders: form.isAcceptingOrders
    };
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await adminService.updateShop(store._id, { ...payload, isActive: form.isActive });
        onSaved('Store updated.');
      } else {
        await adminService.createShop({ ...payload, owner: { name: form.ownerName.trim(), phone: form.ownerPhone.trim(), password: form.ownerPassword } });
        onSaved('Store created. The owner must change the temporary password at first sign-in.');
      }
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the store.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !saving && onClose()} title={editing ? 'Edit store' : 'Add store'}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <FormField label="Store name *" htmlFor="st-name">
            <Input id="st-name" value={form.name} onChange={set('name')} maxLength={120} />
          </FormField>
          <FormField label="Store phone" htmlFor="st-phone">
            <Input id="st-phone" type="tel" value={form.phone} onChange={set('phone')} />
          </FormField>
        </div>
        <FormField label="Street *" htmlFor="st-street">
          <Input id="st-street" value={form.street} onChange={set('street')} />
        </FormField>
        <div className="form-grid">
          <FormField label="Area" htmlFor="st-area">
            <Input id="st-area" value={form.area} onChange={set('area')} />
          </FormField>
          <FormField label="City *" htmlFor="st-city">
            <Input id="st-city" value={form.city} onChange={set('city')} />
          </FormField>
          <FormField label="State *" htmlFor="st-state">
            <Input id="st-state" value={form.state} onChange={set('state')} />
          </FormField>
          <FormField label="Pincode *" htmlFor="st-pin">
            <Input id="st-pin" value={form.pincode} onChange={set('pincode')} maxLength={6} inputMode="numeric" />
          </FormField>
        </div>
        <div className="form-grid">
          <FormField label="Latitude *" htmlFor="st-lat">
            <Input id="st-lat" value={form.lat} onChange={set('lat')} inputMode="decimal" />
          </FormField>
          <FormField label="Longitude *" htmlFor="st-lng">
            <Input id="st-lng" value={form.lng} onChange={set('lng')} inputMode="decimal" />
          </FormField>
        </div>
        <Button variant="secondary" size="sm" className="mb-3" onClick={useMyLocation} isLoading={locating}>
          <MapPin size={14} style={{ marginRight: 6 }} />
          Use my current location
        </Button>
        <div className="form-grid">
          <FormField label="Opens at" htmlFor="st-open">
            <Input id="st-open" type="time" value={form.openTime} onChange={set('openTime')} />
          </FormField>
          <FormField label="Closes at" htmlFor="st-close">
            <Input id="st-close" type="time" value={form.closeTime} onChange={set('closeTime')} />
          </FormField>
          <FormField label="Delivery radius (km)" htmlFor="st-radius">
            <Input id="st-radius" type="number" min="0.5" max="50" step="0.5" value={form.deliveryRadiusKm} onChange={set('deliveryRadiusKm')} />
          </FormField>
        </div>
        <div className="flex flex-wrap gap-4 mb-3 text-sm">
          <label htmlFor="st-accepting" className="flex items-center gap-2">
            <input id="st-accepting" type="checkbox" checked={form.isAcceptingOrders} onChange={set('isAcceptingOrders')} />
            Accepting orders
          </label>
          {editing && (
            <label htmlFor="st-active" className="flex items-center gap-2">
              <input id="st-active" type="checkbox" checked={form.isActive} onChange={set('isActive')} />
              Store active (inactive stores and their products are hidden)
            </label>
          )}
        </div>

        {!editing && (
          <>
            <h4 className="font-semibold mb-2">Store owner account</h4>
            <div className="form-grid">
              <FormField label="Owner name *" htmlFor="st-owner-name">
                <Input id="st-owner-name" value={form.ownerName} onChange={set('ownerName')} />
              </FormField>
              <FormField label="Owner mobile *" htmlFor="st-owner-phone" hint="Used to sign in">
                <Input id="st-owner-phone" type="tel" value={form.ownerPhone} onChange={set('ownerPhone')} />
              </FormField>
              <FormField label="Temporary password *" htmlFor="st-owner-pass" hint="At least 8 characters">
                <Input id="st-owner-pass" type="password" value={form.ownerPassword} onChange={set('ownerPassword')} autoComplete="new-password" />
              </FormField>
            </div>
          </>
        )}

        {error && <div className="alert alert-error mb-3">{error}</div>}
        <div className="actions-row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={saving}>
            {editing ? 'Save store' : 'Create store'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export const AdminStoresPage = () => {
  const toast = useToast();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(undefined);

  const load = useCallback(() => {
    adminService
      .getShops()
      .then(setStores)
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(load, [load]);

  return (
    <div>
      <PageHeader
        title="Stores"
        subtitle="Darkstores that fulfil orders, their delivery areas and owners"
        action={
          <Button variant="primary" onClick={() => setEditing(null)}>
            <Plus size={16} style={{ marginRight: 6 }} />
            Add store
          </Button>
        }
      />
      {loading ? (
        <LoadingState />
      ) : stores.length === 0 ? (
        <EmptyState icon={Store} title="No stores yet" description="Create a store, then add products to it." action={<Button variant="primary" onClick={() => setEditing(null)}>Add store</Button>} />
      ) : (
        <div className="pmart-table-wrapper">
          <table className="pmart-table">
            <thead>
              <tr>
                <th>Store</th>
                <th>Address</th>
                <th>Owner</th>
                <th>Hours</th>
                <th>Radius</th>
                <th>Today</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s._id}>
                  <td className="font-semibold">{s.name}</td>
                  <td className="text-sm">{[s.address.street, s.address.area, s.address.city, s.address.pincode].filter(Boolean).join(', ')}</td>
                  <td>
                    <div>{s.owner?.name}</div>
                    <div className="muted-note">{s.owner?.phone}</div>
                  </td>
                  <td>
                    {s.openTime}–{s.closeTime}
                  </td>
                  <td>{s.deliveryRadiusKm} km</td>
                  <td className="text-sm">
                    {plural(s.todayOrders, 'order')} • ₹{s.todayRevenue.toLocaleString('en-IN')}
                  </td>
                  <td>
                    {!s.isActive ? (
                      <StatusBadge status="Inactive" type="error" />
                    ) : s.isAcceptingOrders ? (
                      <StatusBadge status="Open" type="success" />
                    ) : (
                      <StatusBadge status="Paused" type="warning" />
                    )}
                  </td>
                  <td>
                    <Button size="sm" variant="secondary" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}>
                      <Edit size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <StoreFormModal
        isOpen={editing !== undefined}
        store={editing || null}
        onClose={() => setEditing(undefined)}
        onSaved={(msg) => {
          toast.success(msg);
          setEditing(undefined);
          load();
        }}
      />
    </div>
  );
};
