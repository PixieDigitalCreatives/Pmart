import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TbMotorbike as Bike, TbMapPin as MapPin, TbPhone as Phone, TbSearch as Search, TbEye as Eye, TbBuildingStore as Store, TbChevronRight as ChevronRight } from 'react-icons/tb';
import { LiveDeliveryMap } from '@/components/admin/LiveDeliveryMap';
import { adminService } from '@/services/adminService';
import { openSocket } from '@/services/socket';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from '@/types/orderTypes';
import { PageHeader, StatusBadge, Input, Button } from '@/components/ui';
import './AdminLiveDeliveriesPage.scss';

const FILTERS = [
  { id: 'all', label: 'All active' },
  { id: 'ASSIGNED', label: 'Assigned' },
  { id: 'PICKED_UP', label: 'Picked up' },
  { id: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  { id: 'ARRIVED', label: 'Arrived' },
  { id: 'DELIVERY_FAILED', label: 'Failed' }
];

/** Adds `riderLocation` ({lat,lng}) from the order's last tracked point, the shape LiveDeliveryMap reads. */
const withRiderLocation = (d) => ({
  ...d,
  riderLocation: d.tracking?.lat != null ? { lat: d.tracking.lat, lng: d.tracking.lng, updatedAt: d.tracking.updatedAt } : null
});

export const AdminLiveDeliveriesPage = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const list = (await adminService.getActiveDeliveries()).map(withRiderLocation);
      setDeliveries(list);
      setSelectedId((cur) => cur || list[0]?._id || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const socket = openSocket();
    socket.on('connect', () => socket.emit('join_admin'));
    socket.on('order_status_update', load);
    socket.on('rider:location:update', (p) => {
      setDeliveries((prev) =>
        prev.map((d) => (String(d._id) === String(p.orderId) ? { ...d, riderLocation: { lat: p.latitude, lng: p.longitude, updatedAt: p.timestamp } } : d))
      );
    });
    const interval = setInterval(load, 30000);
    return () => {
      clearInterval(interval);
      socket.close();
    };
  }, [load]);

  const q = search.trim().toLowerCase();
  const filtered = deliveries.filter(
    (d) =>
      (filter === 'all' || d.status === filter) &&
      (!q || [d.orderNumber, d.rider?.name, d.customer?.name, d.deliveryAddress?.recipientName].some((v) => (v || '').toLowerCase().includes(q)))
  );
  const selected = deliveries.find((d) => d._id === selectedId) || null;
  const addr = selected?.deliveryAddress || {};

  return (
    <div className="admin-live-deliveries-page">
      <PageHeader
        title="Live deliveries"
        subtitle="Orders assigned to riders, with their last reported position"
        action={
          <div className="header-stats-badge">
            <span className="live-pulsing-dot" />
            <span>{deliveries.length} active</span>
          </div>
        }
      />

      <div className="delivery-filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <Input placeholder="Order number, rider or customer" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filter-pill-group">
          {FILTERS.map((f) => (
            <Button key={f.id} type="button" className={`filter-pill ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="operations-grid">
        <div className="logistics-map-card">
          <LiveDeliveryMap deliveries={filtered} selectedDelivery={selected} onSelect={(d) => setSelectedId(d._id)} />
          {filtered.length > 0 && (
            <div className="pmart-table-wrapper mt-3">
              <table className="pmart-table">
                <tbody>
                  {filtered.map((d) => (
                    <tr key={d._id} onClick={() => setSelectedId(d._id)} style={{ cursor: 'pointer', background: d._id === selectedId ? 'rgba(242,13,24,0.05)' : undefined }}>
                      <td className="font-semibold">#{d.orderNumber}</td>
                      <td>{d.rider?.name || '—'}</td>
                      <td>
                        <StatusBadge status={ORDER_STATUS_LABELS[d.status]} type={ORDER_STATUS_TONE[d.status]} />
                      </td>
                      <td className="muted-note">{d.riderLocation?.updatedAt ? `GPS ${new Date(d.riderLocation.updatedAt).toLocaleTimeString('en-IN')}` : 'No GPS yet'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="inspector-side-col">
          {selected ? (
            <div className="rider-inspection-panel">
              <div className="panel-head">
                <div className="rider-profile">
                  <div className="avatar">
                    <Bike size={22} />
                  </div>
                  <div>
                    <h3 className="rider-name">{selected.rider?.name || 'No rider'}</h3>
                    <p className="rider-sub">{[selected.rider?.vehicleType, selected.rider?.vehicleNumber].filter(Boolean).join(' • ') || '—'}</p>
                  </div>
                </div>
                <StatusBadge status={ORDER_STATUS_LABELS[selected.status]} type={ORDER_STATUS_TONE[selected.status]} />
              </div>

              <div className="panel-body">
                <div className="telemetry-box">
                  <div className="tele-item">
                    <span className="label">Last GPS update</span>
                    <span className="val">{selected.riderLocation?.updatedAt ? new Date(selected.riderLocation.updatedAt).toLocaleTimeString('en-IN') : 'None yet'}</span>
                  </div>
                  <div className="tele-item">
                    <span className="label">Position</span>
                    <span className="val font-mono">{selected.riderLocation ? `${selected.riderLocation.lat.toFixed(4)}, ${selected.riderLocation.lng.toFixed(4)}` : '—'}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="section-label">Order</div>
                  <div className="detail-row">
                    <span className="key">Number:</span>
                    <Link to={`/admin/orders/${selected._id}`} className="order-link">
                      #{selected.orderNumber}
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                  <div className="detail-row">
                    <span className="key">Amount:</span>
                    <span className="value">₹{selected.totalAmount} COD • {selected.paymentStatus === 'COLLECTED' ? 'collected' : 'pending'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="key">Delivery code:</span>
                    <span className="value">{selected.deliveryVerificationStatus === 'OTP_VERIFIED' ? 'Verified' : 'Not verified'}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="section-label">Store</div>
                  <div className="hub-card">
                    <Store size={16} className="hub-icon" />
                    <div>
                      <div className="hub-title">{selected.shop?.name}</div>
                      <div className="hub-address">{[selected.shop?.address?.street, selected.shop?.address?.city].filter(Boolean).join(', ')}</div>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="section-label">Customer</div>
                  <div className="customer-card">
                    <MapPin size={16} className="cust-icon" />
                    <div>
                      <div className="cust-name">{addr.recipientName}</div>
                      <div className="cust-address">{[addr.houseNumber, addr.street, addr.area, addr.city, addr.pincode].filter(Boolean).join(', ')}</div>
                      <div className="cust-phone">{addr.recipientPhone}</div>
                    </div>
                  </div>
                </div>

                <div className="panel-actions">
                  {selected.rider?.phone && (
                    <a href={`tel:${selected.rider.phone}`} className="btn btn-primary btn-sm btn-full">
                      <Phone size={14} />
                      <span>Call rider</span>
                    </a>
                  )}
                  <Link to={`/admin/orders/${selected._id}`} className="btn btn-secondary btn-sm btn-full">
                    <Eye size={14} />
                    <span>Open order</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-selection-card">
              <p>{loading ? 'Loading active deliveries…' : 'No active deliveries right now.'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
