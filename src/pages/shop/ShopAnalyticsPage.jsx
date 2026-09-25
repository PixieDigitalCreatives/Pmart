import React from 'react';
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Clock } from 'lucide-react';

export const ShopAnalyticsPage = () => {
  return (
    <div className="shop-analytics-page">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-dark">Darkstore Operational Analytics</h1>
        <p className="text-muted text-sm">Throughput, revenue performance, and hourly rush breakdown</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="pmart-card">
          <div className="text-muted text-xs font-semibold mb-1">TOTAL SALES (THIS MONTH)</div>
          <div className="text-2xl font-extrabold text-dark mb-1">₹14,82,400</div>
          <div className="text-xs text-success font-semibold flex items-center gap-1">
            <TrendingUp size={13} /> +12.4% vs last month
          </div>
        </div>

        <div className="pmart-card">
          <div className="text-muted text-xs font-semibold mb-1">AVERAGE TICKET SIZE</div>
          <div className="text-2xl font-extrabold text-dark mb-1">₹342</div>
          <div className="text-xs text-muted">Across 4,320 completed orders</div>
        </div>

        <div className="pmart-card">
          <div className="text-muted text-xs font-semibold mb-1">AVG PACKING TIME</div>
          <div className="text-2xl font-extrabold text-dark mb-1">2m 48s</div>
          <div className="text-xs text-success font-semibold">12 seconds faster than target</div>
        </div>

        <div className="pmart-card">
          <div className="text-muted text-xs font-semibold mb-1">ON-TIME DELIVERY SLA</div>
          <div className="text-2xl font-extrabold text-dark mb-1">98.6%</div>
          <div className="text-xs text-muted">Target: 98.0%</div>
        </div>
      </div>

      {/* Hourly Rush Breakdown Visual */}
      <div className="pmart-card mb-6">
        <h3 className="font-bold text-dark text-base mb-4">Hourly Demand Peaks (Orders per hour)</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '180px', gap: '12px', paddingBottom: '10px', borderBottom: '1px solid #E5E7EB' }}>
          {[
            { time: '7 AM', val: 35 },
            { time: '9 AM', val: 78 },
            { time: '11 AM', val: 52 },
            { time: '1 PM', val: 40 },
            { time: '4 PM', val: 65 },
            { time: '6 PM', val: 95 },
            { time: '8 PM', val: 110 },
            { time: '10 PM', val: 60 }
          ].map((bar, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>{bar.val}</span>
              <div
                style={{
                  width: '100%',
                  height: `${(bar.val / 110) * 100}%`,
                  backgroundColor: bar.val > 90 ? '#F20D18' : '#111318',
                  borderRadius: '4px 4px 0 0'
                }}
              />
              <span style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px' }}>{bar.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
