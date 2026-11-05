import React, { useState, useEffect } from 'react';
import { TbCircleCheck as CheckCircle2, TbPower as Power } from 'react-icons/tb';
import { riderService } from '@/services/riderService';
import { useRider } from '@/components/rider/RiderLayout';
import { ActiveDeliveryCard } from '@/components/rider/ActiveDeliveryCard';
import { Card, EmptyState, LoadingState } from '@/components/ui';
import './RiderDashboardPage.scss';

export const RiderDashboardPage = () => {
  const { profile } = useRider();
  const [activeOrder, setActiveOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // The layout reloads the profile on every status push; refresh the active order alongside it.
  useEffect(() => {
    riderService
      .getActiveOrder()
      .then(setActiveOrder)
      .catch(() => setActiveOrder(null))
      .finally(() => setLoading(false));
  }, [profile?.currentOrder, profile?.availabilityStatus]);

  const offline = profile?.availabilityStatus === 'OFFLINE';

  return (
    <div className="rider-dashboard-page">
      <div className="rider-stats-grid">
        <div className="stat-card">
          <div className="stat-label">DELIVERED TODAY</div>
          <div className="stat-val">{profile?.todayDeliveries ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">CASH COLLECTED TODAY</div>
          <div className="stat-val">₹{profile?.todayCashCollected ?? 0}</div>
        </div>
      </div>

      <div className="active-order-section">
        <div className="section-label-row">
          {activeOrder && <span className="live-pulse" />}
          <h2 className="title">CURRENT DELIVERY</h2>
        </div>
        {loading ? (
          <LoadingState text="Checking for deliveries..." />
        ) : activeOrder ? (
          <ActiveDeliveryCard order={activeOrder} />
        ) : (
          <Card className="text-center py-8">
            {offline ? (
              <EmptyState icon={Power} title="You are offline" description="Tap OFFLINE at the top to go online and receive deliveries." />
            ) : (
              <EmptyState icon={CheckCircle2} title="No delivery assigned" description="Stay online. New assignments appear here automatically." />
            )}
          </Card>
        )}
      </div>

      {cashReminder(activeOrder)}
    </div>
  );
};

function cashReminder(order) {
  if (!order || order.paymentMethod !== 'COD') return null;
  return (
    <Card className="mt-5">
      <h4 className="font-bold text-sm mb-2">Before you hand over</h4>
      <ul className="text-xs list-disc pl-4 space-y-1">
        <li>Collect ₹{order.totalAmount} in cash.</li>
        <li>Ask the customer for the delivery code shown in their app.</li>
      </ul>
    </Card>
  );
}
