import React, { useState, useEffect } from 'react';
import { TbDeviceFloppy as Save, TbCheck as Check, TbAlertCircle as AlertCircle } from 'react-icons/tb';
import { adminService } from '@/services/adminService';
import { apiErrorMessage } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card, Button, Input, Select, FormField, LoadingState } from '@/components/ui';

const BILLING_DEFAULTS = {
  businessName: '',
  businessAddress: '',
  businessPhone: '',
  gstin: '',
  invoicePrefix: 'INV',
  taxMode: 'NONE',
  defaultTaxRate: 0,
  taxLabel: 'GST',
  gstSplit: 'NONE',
  roundTotal: false,
  paymentTermsDays: 0,
  allowNegativeStock: false,
  invoiceFooter: ''
};

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
          supportEmail: s.supportEmail || '',
          billing: Object.fromEntries(Object.entries(BILLING_DEFAULTS).map(([k, d]) => [k, typeof d === 'boolean' ? Boolean(s.billing?.[k] ?? d) : String(s.billing?.[k] ?? d)]))
        })
      )
      .catch((err) => setMessage({ type: 'error', text: apiErrorMessage(err, 'Could not load settings.') }));
  }, []);

  const setBilling = (key, value) => setForm((f) => ({ ...f, billing: { ...f.billing, [key]: value } }));

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
    const b = form.billing;
    const rate = Number(b.defaultTaxRate);
    const terms = Number(b.paymentTermsDays);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) return setMessage({ type: 'error', text: 'Default tax rate must be between 0 and 100.' });
    if (!Number.isInteger(terms) || terms < 0 || terms > 365) return setMessage({ type: 'error', text: 'Payment terms must be 0 to 365 days.' });
    if (!/^[A-Z0-9-]{1,10}$/.test(b.invoicePrefix.trim().toUpperCase())) return setMessage({ type: 'error', text: 'Invoice prefix: 1-10 letters, digits or -.' });
    payload.billing = {
      businessName: b.businessName.trim(),
      businessAddress: b.businessAddress.trim(),
      businessPhone: b.businessPhone.trim(),
      gstin: b.gstin.trim().toUpperCase(),
      invoicePrefix: b.invoicePrefix.trim().toUpperCase(),
      taxMode: b.taxMode,
      defaultTaxRate: rate,
      taxLabel: b.taxLabel.trim() || 'GST',
      gstSplit: b.gstSplit,
      roundTotal: b.roundTotal,
      paymentTermsDays: terms,
      allowNegativeStock: b.allowNegativeStock,
      invoiceFooter: b.invoiceFooter.trim()
    };
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
      <PageHeader title="Settings" subtitle="Fees, delivery targets, support contact and in-store billing" />
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
          <h3 className="font-bold mb-2 mt-4">In-store billing</h3>
          <p className="muted-note mb-2">Printed on invoices. Tax is off until you choose a mode; no GST rate is assumed.</p>
          <div className="form-grid">
            {[
              ['businessName', 'Business name', 'Defaults to the store name'],
              ['businessPhone', 'Business phone'],
              ['gstin', 'GSTIN', '15 characters; leave empty if not registered'],
              ['invoicePrefix', 'Invoice number prefix', 'e.g. INV gives INV-000001']
            ].map(([key, label, hint]) => (
              <FormField key={key} label={label} htmlFor={`bill-${key}`} hint={hint}>
                <Input id={`bill-${key}`} value={form.billing[key]} onChange={(e) => setBilling(key, e.target.value)} disabled={!canEdit || saving} />
              </FormField>
            ))}
          </div>
          <FormField label="Business address" htmlFor="bill-address">
            <Input id="bill-address" value={form.billing.businessAddress} onChange={(e) => setBilling('businessAddress', e.target.value)} disabled={!canEdit || saving} />
          </FormField>
          <div className="form-grid">
            <FormField label="Default invoice type" htmlFor="bill-taxmode">
              <Select id="bill-taxmode" value={form.billing.taxMode} onChange={(e) => setBilling('taxMode', e.target.value)} disabled={!canEdit || saving}>
                <option value="NONE">Non-GST invoice</option>
                <option value="EXCLUSIVE">GST added to prices</option>
                <option value="INCLUSIVE">Prices include GST</option>
              </Select>
            </FormField>
            <FormField label="Default tax rate (%)" htmlFor="bill-rate" hint="For products without their own rate">
              <Input id="bill-rate" type="number" min="0" max="100" step="0.01" value={form.billing.defaultTaxRate} onChange={(e) => setBilling('defaultTaxRate', e.target.value)} disabled={!canEdit || saving} />
            </FormField>
            <FormField label="Tax label" htmlFor="bill-label">
              <Input id="bill-label" value={form.billing.taxLabel} onChange={(e) => setBilling('taxLabel', e.target.value)} disabled={!canEdit || saving} />
            </FormField>
            <FormField label="Show tax as" htmlFor="bill-split">
              <Select id="bill-split" value={form.billing.gstSplit} onChange={(e) => setBilling('gstSplit', e.target.value)} disabled={!canEdit || saving}>
                <option value="NONE">One tax line</option>
                <option value="CGST_SGST">CGST + SGST (half each)</option>
                <option value="IGST">IGST</option>
              </Select>
            </FormField>
            <FormField label="Payment terms (days)" htmlFor="bill-terms" hint="Unpaid invoices become overdue after this">
              <Input id="bill-terms" type="number" min="0" max="365" step="1" value={form.billing.paymentTermsDays} onChange={(e) => setBilling('paymentTermsDays', e.target.value)} disabled={!canEdit || saving} />
            </FormField>
          </div>
          <FormField label="Invoice footer" htmlFor="bill-footer">
            <Input id="bill-footer" value={form.billing.invoiceFooter} onChange={(e) => setBilling('invoiceFooter', e.target.value)} disabled={!canEdit || saving} maxLength={300} />
          </FormField>
          <label className="flex items-center gap-2 text-sm mb-2" htmlFor="bill-round">
            <input id="bill-round" type="checkbox" checked={form.billing.roundTotal} onChange={(e) => setBilling('roundTotal', e.target.checked)} disabled={!canEdit || saving} />
            Round invoice totals to the nearest rupee
          </label>
          <label className="flex items-center gap-2 text-sm mb-4" htmlFor="bill-negative">
            <input id="bill-negative" type="checkbox" checked={form.billing.allowNegativeStock} onChange={(e) => setBilling('allowNegativeStock', e.target.checked)} disabled={!canEdit || saving} />
            Let everyone bill products below zero stock (otherwise only users allowed to bill below zero can, per invoice)
          </label>
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
