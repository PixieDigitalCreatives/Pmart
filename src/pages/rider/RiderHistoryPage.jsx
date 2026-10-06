import React, { useState, useEffect } from 'react';
import { riderService } from '@/services/riderService';
import { CheckCircle2, Clock, History } from 'lucide-react';
import { PageHeader, Card, StatusBadge, EmptyState } from '@/components/ui';

export const RiderHistoryPage = () => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const loadHistory = async () => {
      const data = await riderService.getRiderHistory();
      setHistory(data);
    };

    loadHistory();
  }, []);

  return (
    <div className="rider-history-page">
      <PageHeader 
        title="Completed Runs"
        subtitle="Past successful customer grocery deliveries"
      />

      <div className="space-y-3">
        {history.length === 0 && (
          <Card className="text-center py-8">
            <EmptyState 
              icon={History}
              title="No completed deliveries yet"
              description="Your completed runs will appear here."
            />
          </Card>
        )}
        {history.map((order) => (
          <Card key={order.id}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-dark text-sm">#{order.orderNumber || order.id}</span>
              <StatusBadge status="Completed" type="success" />
            </div>
            <div className="text-xs text-secondary mb-1">
              Customer: {order.customer?.name || 'N/A'} • {order.items?.length || 0} items
            </div>
            <div className="text-xs text-muted mb-2">
              {order.deliveryAddress?.street || 'Address not available'}
            </div>
            <div className="flex justify-between items-center border-t pt-2 text-xs">
              <span className="text-muted">
                Earned: {order.deliveryFee != null ? `₹${order.deliveryFee}` : 'Not available'}
                {order.tip != null ? ` + ₹${order.tip} Tip` : ''}
              </span>
              <span className="font-bold text-dark">Total: ₹{order.totalAmount || 0}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
