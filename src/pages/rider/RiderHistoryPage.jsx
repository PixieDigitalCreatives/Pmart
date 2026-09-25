import React, { useState, useEffect } from 'react';
import { riderService } from '@/services/riderService';
import { CheckCircle2, Clock } from 'lucide-react';

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
      <div className="mb-4">
        <h1 className="text-xl font-bold text-dark">Completed Runs</h1>
        <p className="text-muted text-sm">Past successful customer grocery deliveries</p>
      </div>

      <div className="space-y-3">
        {history.map((order) => (
          <div key={order.id} className="pmart-card">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-dark text-sm">#{order.id}</span>
              <span className="badge badge-success">Completed</span>
            </div>
            <div className="text-xs text-secondary mb-1">
              Customer: {order.customer.name} • {order.items.length} items
            </div>
            <div className="text-xs text-muted mb-2">
              {order.deliveryAddress.line1}
            </div>
            <div className="flex justify-between items-center border-t pt-2 text-xs">
              <span className="text-muted">Earned: ₹65 + ₹10 Tip</span>
              <span className="font-bold text-dark">Total: ₹{order.billing.grandTotal}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
