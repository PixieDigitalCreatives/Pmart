import React, { useState } from 'react';
import { Settings, Save, Check } from 'lucide-react';

export const AdminSettingsPage = () => {
  const [freeDelThreshold, setFreeDelThreshold] = useState('299');
  const [baseDelFee, setBaseDelFee] = useState('15');
  const [platformFee, setPlatformFee] = useState('5');
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="admin-settings-page">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-dark">Platform System Settings</h1>
        <p className="text-muted text-sm">Configure commerce delivery rules, minimum order fees, and SLA tolerances</p>
      </div>

      <div className="pmart-card max-w-xl">
        {saved && (
          <div className="badge badge-success mb-4 p-2 text-sm flex items-center gap-2">
            <Check size={16} /> Global settings saved successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label>Free Delivery Order Minimum (₹)</label>
            <input
              type="number"
              className="form-control"
              value={freeDelThreshold}
              onChange={e => setFreeDelThreshold(e.target.value)}
            />
            <div className="form-hint">Orders above this threshold receive free doorstep delivery</div>
          </div>

          <div className="form-group">
            <label>Standard Delivery Fee (₹)</label>
            <input
              type="number"
              className="form-control"
              value={baseDelFee}
              onChange={e => setBaseDelFee(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Platform Handling Fee (₹)</label>
            <input
              type="number"
              className="form-control"
              value={platformFee}
              onChange={e => setPlatformFee(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary mt-4">
            <Save size={16} />
            <span>Save System Parameters</span>
          </button>
        </form>
      </div>
    </div>
  );
};
