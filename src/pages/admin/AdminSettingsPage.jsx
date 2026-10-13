import React, { useState, useEffect } from 'react';
import { Save, Check, AlertCircle } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { apiErrorMessage } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card, Button, Input, FormField, LoadingState } from '@/components/ui';

const NUMBER_FIELDS = [
  { key: 'freeDeliveryThreshold', label: 'Free delivery above (₹)', hint: 'Orders with an item total at or above this pay no delivery fee' },
  { key: 'baseDeliveryFee', label: 'Delivery fee (₹)', hint: 'Charged when the item total is below the free-delivery amount' },
  { key: 'platformHandlingFee', label: 'Handling fee (₹)', hint: 'Added to every order' },
  { key: 'deliverySlaMinutes', label: 'Delivery time target (minutes)', hint: 'Used to count late deliveries in Reports' },
  { key: 'lowStockThreshold', label: 'Low-stock alert at (units)', hint: 'Store dashboards flag products at or below this' }
];

export const AdminSettingsPage = () => {
  const { can } = useAuth();
  const canEdit = can('settings.manage');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    adminService
      .getSettings()
      .then((s) =>
        setForm({
          ...Object.fromEntries(NUMBER_FIELDS.map((f) => [f.key, String(s[f.key] ?? '')])),
          supportPhone: s.supportPhone || '',
          supportEmail: s.supportEmail || ''
        })
      )
      .catch((err) => setMessage({ type: 'error', text: apiErrorMessage(err, 'Could not load settings.') }));
  }, []);

  if (!form) return message ? <div className="alert alert-error">{message.text}</div> : <LoadingState text="Loading settings..." />;

  const save = async (e) => {
    e.preventDefault();
    const payload = { supportPhone: form.supportPhone.trim(), supportEmail: form.supportEmail.trim() };
    for (const f of NUMBER_FIELDS) {
      const n = Number(form[f.key]);
      if (form[f.key] === '' || !Number.isFinite(n) || n < 0) {
        setMessage({ type: 'error', text: `${f.label} must be a number of 0 or more.` });
        return;
      }
      payload[f.key] = f.key === 'deliverySlaMinutes' || f.key === 'lowStockThreshold' ? Math.round(n) : n;
    }
    setSaving(true);
    setMessage(null);
    try {
      await adminService.updateSettings(payload);
      setMessage({ type: 'success', text: 'Settings saved. New orders use these values immediately.' });
    } catch (err) {
      setMessage({ type: 'error', text: apiErrorMessage(err, 'Could not save settings.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Fees, delivery targets and customer support contact" />
      <Card className="max-w-2xl">
        {message && (
          <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'} mb-4`}>
            {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{message.text}</span>
          </div>
        )}
        <form onSubmit={save} noValidate>
          <h3 className="font-bold mb-2">Fees and operations</h3>
          <div className="form-grid">
            {NUMBER_FIELDS.map((f) => (
              <FormField key={f.key} label={f.label} htmlFor={`set-${f.key}`} hint={f.hint}>
                <Input id={`set-${f.key}`} type="number" min="0" step="any" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} disabled={!canEdit || saving} />
              </FormField>
            ))}
          </div>
          <h3 className="font-bold mb-2 mt-4">Customer support</h3>
          <p className="muted-note mb-2">Shown on the Help page and in the footer. Leave empty to hide.</p>
          <div className="form-grid">
            <FormField label="Support phone" htmlFor="set-support-phone">
              <Input id="set-support-phone" type="tel" value={form.supportPhone} onChange={(e) => setForm({ ...form, supportPhone: e.target.value })} disabled={!canEdit || saving} />
            </FormField>
            <FormField label="Support email" htmlFor="set-support-email">
              <Input id="set-support-email" type="email" value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} disabled={!canEdit || saving} />
            </FormField>
          </div>
          {canEdit ? (
            <Button type="submit" variant="primary" isLoading={saving} className="mt-2">
              <Save size={16} style={{ marginRight: 6 }} />
              Save settings
            </Button>
          ) : (
            <p className="muted-note">You can view but not change settings.</p>
          )}
        </form>
      </Card>
    </div>
  );
};
