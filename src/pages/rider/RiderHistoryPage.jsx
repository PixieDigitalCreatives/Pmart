import React, { useState, useEffect } from 'react';
import { TbHistory as History } from 'react-icons/tb';
import { riderService } from '@/services/riderService';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from '@/types/orderTypes';
import { PageHeader, Card, StatusBadge, EmptyState, LoadingState, Button } from '@/components/ui';
import { plural } from '@/utils/plural';

export const RiderHistoryPage = () => {
  const [data, setData] = useState({ orders: [], pagination: { page: 1, pages: 1 } });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    riderService
      .getHistory(page)
      .then(setData)
      .catch(() => setData({ orders: [], pagination: { page: 1, pages: 1 } }))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <PageHeader title="Delivery history" subtitle="Orders you completed or attempted" />
      {loading ? (
        <LoadingState text="Loading history..." />
      ) : data.orders.length === 0 ? (
        <Card className="text-center py-8">
          <EmptyState icon={History} title="No deliveries yet" description="Completed deliveries appear here." />
        </Card>
      ) : (
        <div className="space-y-3">
          {data.orders.map((o) => (
            <Card key={o._id}>
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-sm">#{o.orderNumber}</span>
                <StatusBadge status={ORDER_STATUS_LABELS[o.status]} type={ORDER_STATUS_TONE[o.status]} />
              </div>
              <div className="text-xs text-muted">
                {o.deliveryAddress?.recipientName} • {plural(o.itemCount, 'item')} • {[o.deliveryAddress?.area, o.deliveryAddress?.city].filter(Boolean).join(', ')}
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span>{new Date(o.deliveredAt || o.updatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <span className="font-bold">₹{o.totalAmount}</span>
              </div>
            </Card>
          ))}
          {data.pagination.pages > 1 && (
            <div className="actions-row" style={{ justifyContent: 'center' }}>
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <span className="muted-note">
                {page} / {data.pagination.pages}
              </span>
              <Button size="sm" variant="secondary" disabled={page >= data.pagination.pages} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
