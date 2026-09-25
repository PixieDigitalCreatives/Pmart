import React, { useState } from 'react';
import { Settings, Save, Clock, MapPin, Store, Check } from 'lucide-react';

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
      <div className="mb-6">
        <h1 className="text-xl font-bold text-dark">Darkstore Settings</h1>
        <p className="text-muted text-sm">Configure store operating hours, delivery radius, and facility info</p>
      </div>

      <div className="pmart-card max-w-2xl">
        {saved && (
          <div className="badge badge-success mb-4 p-2 text-sm flex items-center gap-2">
            <Check size={16} /> Store settings updated successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label>Store / Darkstore Name</label>
            <input
              type="text"
              className="form-control"
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Hub Manager Hotline</label>
            <input
              type="tel"
              className="form-control"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Daily Operating Hours</label>
            <input
              type="text"
              className="form-control"
              value={hours}
              onChange={e => setHours(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Service Delivery Radius (in Kilometers)</label>
            <input
              type="number"
              step="0.1"
              className="form-control"
              value={radius}
              onChange={e => setRadius(e.target.value)}
              required
            />
            <div className="form-hint">Standard quick-commerce radius is 2.5km to 3.5km</div>
          </div>

          <button type="submit" className="btn btn-primary mt-4">
            <Save size={16} />
            <span>Save Hub Configuration</span>
          </button>
        </form>
      </div>
    </div>
  );
};
