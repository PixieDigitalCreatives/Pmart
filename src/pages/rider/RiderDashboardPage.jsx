import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { riderService } from '@/services/riderService';
import {
  Bike,
  Package,
  Navigation,
  Phone,
  Clock,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { Card, StatusBadge, Button, EmptyState } from '@/components/ui';
import './RiderDashboardPage.scss';

export const RiderDashboardPage = () => {
  const [profile, setProfile] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadRiderData = async () => {
      setLoading(true);
      const p = await riderService.getRiderProfile();
      const o = await riderService.getActiveDelivery();
      setProfile(p);
      setActiveOrder(o);
      setLoading(false);
    };

    loadRiderData();
  }, []);

  return (
    <div className="rider-dashboard-page">
      {/* Rider Stats Bar */}
      <div className="rider-stats-grid">
        <div className="stat-card">
          <div className="stat-label">TODAY'S DELIVERIES</div>
          <div className="stat-val">{profile?.todayDeliveries || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">TODAY'S EARNINGS</div>
          <div className="stat-val">₹{profile?.todayEarnings || 0}</div>
        </div>
      </div>

      {/* Primary Active Delivery Card */}
      <div className="active-order-section">
        <div className="section-label-row">
          <span className="live-pulse" />
          <h2 className="title">CURRENT ACTIVE RUN</h2>
        </div>

        {activeOrder ? (
          <div className="active-delivery-card">
            <div className="card-top">
              <div className="order-id-group">
                <span className="order-id">Order #{activeOrder.id || activeOrder.orderNumber || 'Unknown'}</span>
                <StatusBadge status={(activeOrder.status || '').replace('_', ' ')} type="primary" />
              </div>
              <span className="eta-countdown">ETA: Unavailable</span>
            </div>

            {/* Pickup & Drop Off Route */}
            <div className="route-indicator-block">
              <div className="point-item pickup">
                <div className="marker-dot green" />
                <div className="point-info">
                  <div className="label">PICKUP FROM</div>
                  <div className="name">{activeOrder.shop?.name || 'Not available'}</div>
                </div>
              </div>

              <div className="route-connector-line" />

              <div className="point-item drop">
                <div className="marker-dot red" />
                <div className="point-info">
                  <div className="label">DELIVER TO</div>
                  <div className="name">{activeOrder.deliveryAddress?.street || 'Not available'}{activeOrder.deliveryAddress?.city ? `, ${activeOrder.deliveryAddress.city}` : ''}</div>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="customer-strip">
              <div>
                <div className="cust-name font-semibold">{activeOrder.customer?.name || 'Customer'}</div>
                <div className="cust-items text-muted text-xs">{activeOrder.items?.length || 0} items ({activeOrder.items?.map(i => i.name).filter(Boolean).slice(0, 2).join(', ') || 'N/A'})</div>
              </div>
              <a href={`tel:${activeOrder.customer?.phone}`} className="phone-btn" title="Call Customer">
                <Phone size={16} />
              </a>
            </div>

            {/* Primary Action Button */}
            <Link to={`/rider/orders/${activeOrder.id}`} style={{ textDecoration: 'none', display: 'block' }}>
              <Button variant="primary" size="lg" className="w-full flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <Navigation size={18} />
                  <span>Open Delivery Navigation & Verify</span>
                </div>
                <ArrowRight size={18} />
              </Button>
            </Link>
          </div>
        ) : (
          <Card className="text-center py-8">
            <EmptyState
              icon={CheckCircle2}
              title="No active deliveries right now"
              description="Stay online! You will be automatically assigned darkstore orders."
            />
          </Card>
        )}
      </div>

      {/* Quick Delivery Checklist */}
      <Card className="mt-5">
        <h4 className="font-bold text-sm text-dark mb-2">Fleet Safety & Service Checklist</h4>
        <ul className="text-xs text-secondary space-y-1.5 list-disc pl-4">
          <li>Check thermally insulated delivery bag before leaving the hub</li>
          <li>Wear safety helmet & PMart fleet uniform</li>
          <li>Always verify the 4-digit OTP from customer before marking delivered</li>
        </ul>
      </Card>
    </div>
  );
};
