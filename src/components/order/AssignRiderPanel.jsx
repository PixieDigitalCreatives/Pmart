import React, { useEffect, useState } from 'react';
import { Bike } from 'lucide-react';
import { orderService } from '@/services/orderService';
import { apiErrorMessage } from '@/services/apiClient';
import { Button, Select } from '@/components/ui';

/** Lets store or operations staff assign (or re-assign before pickup) an available rider. */
export const AssignRiderPanel = ({ order, onAssigned }) => {
  const [riders, setRiders] = useState([]);
  const [riderId, setRiderId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => orderService.getFleet().then(setRiders).catch(() => setRiders([]));
  // Riders go online and finish deliveries all the time, so keep the list fresh while the panel is open.
  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order._id, order.status]);

  const available = riders.filter((r) => r.availabilityStatus === 'AVAILABLE' && r.id !== String(order.rider?._id || ''));

  const assign = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await orderService.assignRider(order._id, riderId);
      setRiderId('');
      onAssigned(updated);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not assign the rider.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <label htmlFor="assign-rider-select" className="text-sm font-semibold block mb-1">
        {order.rider ? 'Re-assign to another rider' : 'Assign a rider'}
      </label>
      <Select id="assign-rider-select" value={riderId} onChange={(e) => setRiderId(e.target.value)}>
        <option value="">{available.length ? 'Choose an available rider' : 'No riders are available right now'}</option>
        {available.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name} • {r.vehicleType} {r.vehicleNumber}
          </option>
        ))}
      </Select>
      {error && <div className="alert alert-error mt-2">{error}</div>}
      <Button variant="dark" className="mt-3" style={{ width: '100%' }} disabled={!riderId || saving} isLoading={saving} onClick={assign}>
        <Bike size={15} style={{ marginRight: 6 }} />
        {order.rider ? 'Re-assign rider' : 'Assign rider'}
      </Button>
      <p className="muted-note mt-2">
        Only riders who are online and not on another delivery are listed. The list refreshes every 15 seconds.{' '}
        <button type="button" className="link-button" onClick={load}>
          Refresh now
        </button>
      </p>
    </div>
  );
};
