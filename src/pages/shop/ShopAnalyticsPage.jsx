import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Clock, AlertCircle } from 'lucide-react';
import { shopService } from '@/services/shopService';

export const ShopAnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    shopService.getShopMetrics().then(res => {
      setData(res);
      setLoading(false);
    }).catch(() => {
      setData(null);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-4">Loading analytics...</div>;
  }

  if (!data || !data.hasData) {
    return (
      <div className="shop-analytics-page flex flex-col items-center justify-center p-12 text-center text-muted">
        <AlertCircle size={48} className="mb-4 text-border" />
        <h2 className="text-xl font-bold text-dark mb-2">No Data Available</h2>
        <p>There is currently not enough data to generate analytics for this darkstore.</p>
      </div>
    );
  }

  return (
    <div className="shop-analytics-page">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-dark">Darkstore Operational Analytics</h1>
        <p className="text-muted text-sm">Throughput, revenue performance, and hourly rush breakdown</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="pmart-card">
          <div className="text-muted text-xs font-semibold mb-1">TOTAL SALES (THIS MONTH)</div>
          <div className="text-2xl font-extrabold text-dark mb-1">₹{data.monthlySales || 0}</div>
        </div>

        <div className="pmart-card">
          <div className="text-muted text-xs font-semibold mb-1">AVERAGE TICKET SIZE</div>
          <div className="text-2xl font-extrabold text-dark mb-1">₹{data.avgTicketSize || 0}</div>
          <div className="text-xs text-muted">Across {data.completedOrders || 0} completed orders</div>
        </div>

        <div className="pmart-card">
          <div className="text-muted text-xs font-semibold mb-1">AVG PACKING TIME</div>
          <div className="text-2xl font-extrabold text-dark mb-1">{data.avgPackingTime || 'N/A'}</div>
        </div>

        <div className="pmart-card">
          <div className="text-muted text-xs font-semibold mb-1">ON-TIME DELIVERY SLA</div>
          <div className="text-2xl font-extrabold text-dark mb-1">{data.onTimeRate ? `${data.onTimeRate}%` : 'N/A'}</div>
        </div>
      </div>
    </div>
  );
};
