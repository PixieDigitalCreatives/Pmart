import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { riderService } from '@/services/riderService';
import { Package, ArrowRight, MapPin, Clock } from 'lucide-react';
import { PageHeader, Card, StatusBadge, Button, EmptyState } from '@/components/ui';

export const RiderOrdersPage = () => {
  const [activeOrder, setActiveOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const data = await riderService.getActiveDelivery();
      setActiveOrder(data);
      setLoading(false);
    };

    fetch();
  }, []);

  return (
    <div className="rider-orders-page">
      <PageHeader 
        title="Active Deliveries Queue"
        subtitle="Assigned orders awaiting delivery run"
      />

      {activeOrder ? (
        <Card>
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-dark text-base">Order #{activeOrder.id}</span>
            <StatusBadge status={activeOrder.status.replace('_', ' ')} type="primary" />
          </div>

          <div className="space-y-2 text-sm text-secondary mb-4">
            <div className="flex items-start gap-2">
              <MapPin size={16} className="text-muted mt-0.5" />
              <span>{activeOrder.deliveryAddress?.street || 'Not available'}{activeOrder.deliveryAddress?.city ? `, ${activeOrder.deliveryAddress.city}` : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-muted" />
              <span>Target Handover: Express SLA</span>
            </div>
          </div>

          <Link to={`/rider/orders/${activeOrder.id}`} style={{ textDecoration: 'none', display: 'block' }}>
            <Button variant="primary" className="w-full flex justify-center items-center gap-2">
              <span>Open Delivery & Verify Handover</span>
              <ArrowRight size={16} />
            </Button>
          </Link>
        </Card>
      ) : (
        <Card className="text-center py-8">
          <EmptyState
            icon={Package}
            title="No active orders"
            description="You currently don't have any active deliveries assigned."
          />
        </Card>
      )}
    </div>
  );
};
