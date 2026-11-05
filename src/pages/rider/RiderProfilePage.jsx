import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TbLogout as LogOut, TbMotorbike as Bike, TbKey as KeyRound, TbCheck as Check } from 'react-icons/tb';
import { useAuth } from '@/context/AuthContext';
import { useRider } from '@/components/rider/RiderLayout';
import { riderService } from '@/services/riderService';
import { apiErrorMessage } from '@/services/apiClient';
import { Card, Button, FormField, Input, Select, LoadingState } from '@/components/ui';

const VEHICLES = ['Bike', 'Scooter', 'Electric Bike', 'Bicycle'];

export const RiderProfilePage = () => {
  const { user, logout } = useAuth();
  const { profile, reloadProfile } = useRider();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (profile && !form) setForm({ vehicleType: profile.vehicleType, vehicleNumber: profile.vehicleNumber, licenseNumber: profile.licenseNumber || '' });
  }, [profile, form]);

  if (!profile || !form) return <LoadingState text="Loading profile..." />;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await riderService.updateVehicle(form);
      await reloadProfile();
      setMessage({ type: 'success', text: 'Vehicle details saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: apiErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Card className="text-center mb-4">
        <div className="flex justify-center mb-2">
          <Bike size={32} />
        </div>
        <h2 className="text-lg font-bold">{user?.name}</h2>
        <div className="text-muted text-sm">{user?.phone}</div>
        <div className="text-sm mt-2">Completed deliveries: {profile.completedDeliveries}</div>
      </Card>

      <Card className="mb-4">
        <h3 className="font-bold mb-3">Vehicle</h3>
        {message && <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'} mb-3`}>{message.type === 'success' && <Check size={16} />}<span>{message.text}</span></div>}
        <form onSubmit={save}>
          <FormField label="Vehicle type" htmlFor="rv-type">
            <Select id="rv-type" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
              {VEHICLES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Vehicle number" htmlFor="rv-number">
            <Input id="rv-number" value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })} maxLength={20} />
          </FormField>
          <FormField label="Driving licence number" htmlFor="rv-license">
            <Input id="rv-license" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value.toUpperCase() })} maxLength={30} />
          </FormField>
          <Button type="submit" variant="primary" className="w-full" isLoading={saving}>
            Save vehicle details
          </Button>
        </form>
      </Card>

      <Button component={Link} to="/account/change-password" variant="secondary" className="w-full mb-3">
        <KeyRound size={16} style={{ marginRight: 8 }} />
        Change password
      </Button>
      <Button
        variant="secondary"
        className="w-full"
        disabled={profile.availabilityStatus === 'BUSY'}
        title={profile.availabilityStatus === 'BUSY' ? 'Finish your delivery first' : undefined}
        onClick={async () => {
          if (profile.availabilityStatus === 'AVAILABLE') await riderService.setAvailability('OFFLINE').catch(() => {});
          await logout();
          navigate('/login');
        }}
      >
        <LogOut size={16} style={{ marginRight: 8 }} />
        Go offline and sign out
      </Button>
    </div>
  );
};
