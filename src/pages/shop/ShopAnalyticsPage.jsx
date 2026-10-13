import React, { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { shopService } from '@/services/shopService';
import { PageHeader, LoadingState, EmptyState } from '@/components/ui';
import { plural } from '@/utils/plural';

const Kpi = ({ label, value, hint }) => (
  <div className="kpi-tile">
    <div className="kpi-tile-label">{label}</div>
    <div className="kpi-tile-value">{value}</div>
    {hint && <div className="kpi-tile-hint">{hint}</div>}
  </div>
);

const minutes = (m) => (m == null ? 'No data yet' : `${m} min`);

export const ShopAnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    shopService
      .getMyMetrics()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState text="Loading analytics..." />;
  if (!data) return <EmptyState icon={BarChart3} title="Analytics unavailable" description="Your store could not be loaded." />;

  const m = data.last30Days;
  return (
    <div>
      <PageHeader title="Analytics" subtitle="Delivered orders over the last 30 days" />
      {m.completedOrders === 0 ? (
        <EmptyState icon={BarChart3} title="No delivered orders yet" description="Figures appear here once orders are delivered." />
      ) : (
        <div className="kpi-grid">
          <Kpi label="Sales (30 days)" value={`₹${m.sales.toLocaleString('en-IN')}`} hint={plural(m.completedOrders, 'delivered order')} />
          <Kpi label="Average order value" value={`₹${m.avgTicketSize.toLocaleString('en-IN')}`} />
          <Kpi label="Order to ready" value={minutes(m.avgFulfillmentMinutes)} hint="Average time from placement to packed" />
          <Kpi label="Order to delivery" value={minutes(m.avgDeliveryMinutes)} hint="Average time from placement to doorstep" />
        </div>
      )}
    </div>
  );
};
