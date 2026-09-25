import React, { useState } from 'react';
import { mockRiders } from '@/data/mockRiders';
import { Bike, Phone, Star, CheckCircle, Clock } from 'lucide-react';

export const ShopRidersPage = () => {
  const [riders, setRiders] = useState(mockRiders);

  return (
    <div className="shop-riders-page">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-dark">Active Delivery Fleet</h1>
          <p className="text-muted text-sm">Delivery riders stationed at Sector 62 Darkstore Hub</p>
        </div>
        <span className="badge badge-primary">{riders.length} Riders Active</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {riders.map((r) => (
          <div key={r.id} className="pmart-card">
            <div className="flex items-center gap-3 mb-3">
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FFF1F1', color: '#F20D18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bike size={24} />
              </div>
              <div>
                <h4 className="font-bold text-dark">{r.name}</h4>
                <div className="text-muted text-xs">{r.vehicleType} • {r.vehicleNumber}</div>
              </div>
              <span className={`badge ${r.status === 'available' ? 'badge-success' : 'badge-warning'} ml-auto`}>
                {r.status === 'available' ? 'Available' : 'On Delivery'}
              </span>
            </div>

            <div className="text-sm text-secondary mb-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted">Phone:</span>
                <span className="font-medium text-dark">{r.phone}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Total Lifetime Deliveries:</span>
                <span className="font-medium text-dark">{r.totalDeliveries}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Customer Rating:</span>
                <span className="font-bold text-dark">★ {r.rating}</span>
              </div>
            </div>

            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-xs text-muted">Today: {r.todayDeliveries} deliveries</span>
              <a href={`tel:${r.phone}`} className="btn btn-secondary btn-sm">
                <Phone size={13} />
                <span>Call Fleet Partner</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
