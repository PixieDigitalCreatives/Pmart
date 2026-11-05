import React, { useState, useEffect } from 'react';
import { TbPackage as Package } from 'react-icons/tb';
import { riderService } from '@/services/riderService';
import { useRider } from '@/components/rider/RiderLayout';
import { ActiveDeliveryCard } from '@/components/rider/ActiveDeliveryCard';
import { PageHeader, Card, EmptyState, LoadingState } from '@/components/ui';

export const RiderOrdersPage = () => {
  const { profile } = useRider();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    riderService
      .getActiveOrder()
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [profile?.currentOrder]);

  return (
    <div>
      <PageHeader title="Active delivery" subtitle="You carry one order at a time" />
      {loading ? (
        <LoadingState text="Loading..." />
      ) : order ? (
        <ActiveDeliveryCard order={order} />
      ) : (
        <Card className="text-center py-8">
          <EmptyState icon={Package} title="No active delivery" description="When you are assigned an order it shows up here." />
        </Card>
      )}
    </div>
  );
};
