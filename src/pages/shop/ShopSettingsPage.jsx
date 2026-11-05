import React, { useEffect, useState } from 'react';
import { TbDeviceFloppy as Save, TbCheck as Check, TbAlertTriangle as AlertTriangle } from 'react-icons/tb';
import { shopService } from '@/services/shopService';
import { apiErrorMessage } from '@/services/apiClient';
import { useMyShop } from '@/components/shop/ShopLayout';
import { PageHeader, Card, FormField, Input, Button, LoadingState } from '@/components/ui';

/** Store owners edit how their store operates; address, location and radius are managed by the platform admin. */
export const ShopSettingsPage = () => {
  const { shop, setShop } = useMyShop();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (shop && !form) {
      setForm({
        name: shop.name || '',
        phone: shop.phone || '',
        description: shop.description || '',
        openTime: shop.openTime || '',
        closeTime: shop.closeTime || '',
        isAcceptingOrders: Boolean(shop.isAcceptingOrders)
      });
    }
  }, [shop, form]);

  if (!form) return <LoadingState text="Loading store settings..." />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updated = await shopService.updateMyShop({ ...form, phone: form.phone.trim(), description: form.description.trim() });
      setShop(updated);
      setMessage({ type: 'success', text: 'Store settings saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: apiErrorMessage(err, 'Could not save settings.') });
    } finally {
      setSaving(false);
    }
  };

  const address = shop.address ? [shop.address.street, shop.address.area, shop.address.city, shop.address.state, shop.address.pincode].filter(Boolean).join(', ') : '';

  return (
    <div>
      <PageHeader title="Store settings" subtitle="Opening hours, contact number and order intake" />
      <Card className="max-w-2xl">
        {message && (
          <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'} mb-4`}>
            {message.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
            <span>{message.text}</span>
          </div>
        )}
        <form onSubmit={save}>
          <FormField label="Store name" htmlFor="store-name">
            <Input id="store-name" value={form.name} onChange={set('name')} maxLength={120} required />
          </FormField>
          <FormField label="Store phone" htmlFor="store-phone" hint="Shown to the platform team; optional">
            <Input id="store-phone" type="tel" value={form.phone} onChange={set('phone')} />
          </FormField>
          <FormField label="Description" htmlFor="store-desc">
            <Input id="store-desc" value={form.description} onChange={set('description')} maxLength={500} />
          </FormField>
          <div className="form-grid">
            <FormField label="Opens at" htmlFor="store-open">
              <Input id="store-open" type="time" value={form.openTime} onChange={set('openTime')} required />
            </FormField>
            <FormField label="Closes at" htmlFor="store-close">
              <Input id="store-close" type="time" value={form.closeTime} onChange={set('closeTime')} required />
            </FormField>
          </div>
          <label htmlFor="store-accepting" className="flex items-center gap-2 mb-4" style={{ cursor: 'pointer' }}>
            <input id="store-accepting" type="checkbox" checked={form.isAcceptingOrders} onChange={set('isAcceptingOrders')} />
            <span>Accepting new orders</span>
          </label>
          <Button type="submit" variant="primary" isLoading={saving}>
            <Save size={16} style={{ marginRight: 8 }} />
            Save settings
          </Button>
        </form>
      </Card>

      <Card className="max-w-2xl mt-6">
        <h3 className="section-heading mb-2">Managed by the platform admin</h3>
        <p className="text-sm"><strong>Address:</strong> {address}</p>
        <p className="text-sm"><strong>Delivery radius:</strong> {shop.deliveryRadiusKm} km</p>
      </Card>
    </div>
  );
};
