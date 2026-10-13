import React, { useState, useEffect } from 'react';
import { orderService } from '@/services/orderService';
import { Bike, Phone } from 'lucide-react';
import { PageHeader, Card, StatusBadge, EmptyState, LoadingState } from '@/components/ui';

const TONE = { AVAILABLE: 'success', BUSY: 'warning', OFFLINE: 'neutral' };
const LABEL = { AVAILABLE: 'Available', BUSY: 'On a delivery', OFFLINE: 'Offline' };

/** Read-only view of the delivery fleet to help store owners pick a rider. */
export const ShopRidersPage = () => {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () =>
      orderService
        .getFleet()
        .then(setRiders)
        .catch(() => setRiders([]))
        .finally(() => setLoading(false));
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const available = riders.filter((r) => r.availabilityStatus === 'AVAILABLE').length;

  return (
    <div>
      <PageHeader title="Delivery riders" subtitle={`${available} of ${riders.length} available right now`} />
      {loading ? (
        <LoadingState text="Loading riders..." />
      ) : riders.length === 0 ? (
        <EmptyState icon={Bike} title="No riders yet" description="The platform admin adds delivery riders." />
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {riders.map((r) => (
            <Card key={r.id}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold">{r.name}</h4>
                  <div className="muted-note">
                    {r.vehicleType} • {r.vehicleNumber}
                  </div>
                </div>
                <StatusBadge status={LABEL[r.availabilityStatus]} type={TONE[r.availabilityStatus]} />
              </div>
              <div className="text-sm mb-2">Completed deliveries: {r.completedDeliveries}</div>
              {r.phone && (
                <a href={`tel:${r.phone}`} className="btn btn-secondary btn-sm">
                  <Phone size={13} />
                  <span>{r.phone}</span>
                </a>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
