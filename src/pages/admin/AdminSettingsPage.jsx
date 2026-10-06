import React, { useState, useEffect } from 'react';
import { Settings, Save, Check, AlertCircle, RefreshCw } from 'lucide-react';
import api from '@/services/apiClient';
import { PageHeader, Card, Button, Input, LoadingState, ErrorMessage } from '@/components/ui';

const validateField = (value, name) => {
  const n = Number(value);
  if (value === '' || value === null || value === undefined) return `${name} is required`;
  if (!Number.isFinite(n)) return `${name} must be a number`;
  if (n < 0) return `${name} cannot be negative`;
  if (n > 100000) return `${name} is too large`;
  return null;
};

const FieldGroup = ({ label, hint, value, onChange, fieldKey, fieldErrors, setFieldErrors, isSaving }) => (
  <div className="form-group mb-4">
    <label htmlFor={fieldKey} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <Input
      id={fieldKey}
      type="number"
      min="0"
      step="0.01"
      required
      error={!!fieldErrors[fieldKey]}
      value={value}
      onChange={e => {
        onChange(e.target.value);
        if (fieldErrors[fieldKey]) {
          setFieldErrors(prev => ({ ...prev, [fieldKey]: null }));
        }
      }}
      disabled={isSaving}
    />
    {fieldErrors[fieldKey] ? (
      <div className="text-xs text-red-600 mt-1">{fieldErrors[fieldKey]}</div>
    ) : (
      <div className="form-hint text-xs text-gray-500 mt-1">{hint}</div>
    )}
  </div>
);

export const AdminSettingsPage = () => {
  const [freeDelThreshold, setFreeDelThreshold] = useState('299');
  const [baseDelFee, setBaseDelFee] = useState('15');
  const [platformFee, setPlatformFee] = useState('5');
  const [fieldErrors, setFieldErrors] = useState({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setError('');
      const { data } = await api.get('/admin/settings');
      if (data) {
        setFreeDelThreshold(data.freeDeliveryThreshold?.toString() ?? '299');
        setBaseDelFee(data.baseDeliveryFee?.toString() ?? '15');
        setPlatformFee(data.platformHandlingFee?.toString() ?? '5');
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) {
        setError('You do not have permission to view system settings.');
      } else {
        setError('Failed to load settings. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);

    const errs = {
      freeDelThreshold: validateField(freeDelThreshold, 'Free Delivery Threshold'),
      baseDelFee: validateField(baseDelFee, 'Standard Delivery Fee'),
      platformFee: validateField(platformFee, 'Platform Handling Fee'),
    };
    if (Object.values(errs).some(Boolean)) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    try {
      setIsSaving(true);
      await api.put('/admin/settings', {
        freeDeliveryThreshold: Number(freeDelThreshold),
        baseDeliveryFee: Number(baseDelFee),
        platformHandlingFee: Number(platformFee),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) {
        setError('You do not have permission to update system settings.');
      } else if (status === 400) {
        setError(err.response?.data?.message || 'Invalid input. Please check your values.');
      } else {
        setError(err.response?.data?.message || 'Failed to save settings. Please check your connection.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingState text="Loading settings..." fullHeight />;
  }


  return (
    <div className="admin-settings-page">
      <PageHeader
        title={<span className="flex items-center gap-2"><Settings size={24} className="text-primary" /> Platform System Settings</span>}
        subtitle="Configure commerce delivery rules, minimum order fees, and SLA tolerances"
      />

      <Card className="max-w-xl">
        {saved && (
          <div className="badge badge-success mb-4 p-3 text-sm flex items-center gap-2 bg-green-50 text-green-700 rounded-md border border-green-200">
            <Check size={18} /> Settings saved successfully! Checkout will use these values immediately.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 text-sm flex items-center justify-between gap-2 bg-red-50 text-red-700 rounded-md border border-red-200">
            <span className="flex items-center gap-2"><AlertCircle size={18} /> {error}</span>
            <Button
              type="button"
              onClick={fetchSettings}
              className="flex items-center gap-1 text-xs underline opacity-75 hover:opacity-100"
            >
              <RefreshCw size={12} /> Retry
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <FieldGroup
            label="Free Delivery Order Minimum (&#8377;)"
            hint="Orders subtotaling above this threshold receive free doorstep delivery"
            value={freeDelThreshold}
            onChange={setFreeDelThreshold}
            fieldKey="freeDelThreshold"
            fieldErrors={fieldErrors}
            setFieldErrors={setFieldErrors}
            isSaving={isSaving}
          />
          <FieldGroup
            label="Standard Delivery Fee (&#8377;)"
            hint="Base fee charged when the order does not meet the free delivery minimum"
            value={baseDelFee}
            onChange={setBaseDelFee}
            fieldKey="baseDelFee"
            fieldErrors={fieldErrors}
            setFieldErrors={setFieldErrors}
            isSaving={isSaving}
          />
          <FieldGroup
            label="Platform Handling Fee (&#8377;)"
            hint="Additional handling fee added to all non-free deliveries"
            value={platformFee}
            onChange={setPlatformFee}
            fieldKey="platformFee"
            fieldErrors={fieldErrors}
            setFieldErrors={setFieldErrors}
            isSaving={isSaving}
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
              loading={isSaving}
              loadingText="Saving..."
            >
              {!isSaving && <><Save size={16} style={{ marginRight: '8px' }} /> Save System Parameters</>}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
