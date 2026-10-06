import React, { useState } from 'react';
import { Settings, Save, Clock, MapPin, Store, Check } from 'lucide-react';
import { PageHeader, Card, FormField, Input, Button } from '@/components/ui';

export const ShopSettingsPage = () => {
  const [storeName, setStoreName] = useState('PMart Darkstore Hub — Sector 62');
  const [phone, setPhone] = useState('+91 98102 99881');
  const [hours, setHours] = useState('6:00 AM – 11:30 PM');
  const [radius, setRadius] = useState('3.5');
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="shop-settings-page">
      <PageHeader 
        title="Darkstore Settings"
        subtitle="Configure store operating hours, delivery radius, and facility info"
      />

      <Card className="max-w-2xl">
        {saved && (
          <div className="badge badge-success mb-4 p-2 text-sm flex items-center gap-2">
            <Check size={16} /> Store settings updated successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Store / Darkstore Name" htmlFor="storeName">
            <Input
              id="storeName"
              type="text"
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Hub Manager Hotline" htmlFor="storePhone">
            <Input
              id="storePhone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Daily Operating Hours" htmlFor="storeHours">
            <Input
              id="storeHours"
              type="text"
              value={hours}
              onChange={e => setHours(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Service Delivery Radius (in Kilometers)" htmlFor="storeRadius">
            <Input
              id="storeRadius"
              type="number"
              step="0.1"
              value={radius}
              onChange={e => setRadius(e.target.value)}
              required
            />
            <div className="form-hint" style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Standard quick-commerce radius is 2.5km to 3.5km</div>
          </FormField>

          <Button type="submit" variant="primary" style={{ marginTop: '16px' }}>
            <Save size={16} style={{ marginRight: '8px' }} />
            <span>Save Hub Configuration</span>
          </Button>
        </form>
      </Card>
    </div>
  );
};
