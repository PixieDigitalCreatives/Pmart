import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { riderService } from '@/services/riderService';
import { Package, ArrowRight, MapPin, Clock } from 'lucide-react';

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
      <div className="mb-4">
        <h1 className="text-xl font-bold text-dark">Active Deliveries Queue</h1>
        <p className="text-muted text-sm">Assigned orders awaiting delivery run</p>
      </div>

      {activeOrder ? (
        <div className="pmart-card">
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-dark text-base">Order #{activeOrder.id}</span>
            <span className="badge badge-primary">{activeOrder.status.replace('_', ' ')}</span>
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

          <Link to={`/rider/orders/${activeOrder.id}`} className="btn btn-primary btn-full">
            <span>Open Delivery & Verify Handover</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="pmart-card text-center py-8">
          <p className="text-muted">No active orders right now.</p>
        </div>
      )}
    </div>
  );
};
