import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bike,
  Navigation,
  MapPin,
  Clock,
  Phone,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  Store,
  ChevronRight,
  Layers,
  Crosshair,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiveDeliveryMap } from '../../components/admin/LiveDeliveryMap';
import { PageHeader, StatusBadge, Input, Button } from '@/components/ui';
import { io } from 'socket.io-client';
import api from '../../services/apiClient';
import './AdminLiveDeliveriesPage.scss';

// Note: Ensure your backend URL matches your environment
const SOCKET_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.VITE_API_BASE_URL?.replace('/api', '')) ||
  'http://localhost:5000';

export const AdminLiveDeliveriesPage = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'ASSIGNED' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'near_customer'
  const [search, setSearch] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDeliveries = async () => {
    try {
      const res = await api.get('/admin/deliveries');
      setDeliveries(res.data);
      if (res.data.length > 0 && !selectedDelivery) {
        setSelectedDelivery(res.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch deliveries', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();

    // Set up Socket.IO
    const token = localStorage.getItem('pmart_auth_token');
    const socket = io(SOCKET_URL, { 
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    socket.on('connect', () => {
      if (import.meta.env.DEV) console.log('[ADMIN SOCKET] connected, joining admin room');
      socket.emit('join_admin'); // backend joins 'admin_deliveries' room on this event
    });

    socket.on('connect_error', (err) => {
      if (import.meta.env.DEV) console.warn('[ADMIN SOCKET] connect error:', err.message);
    });

    socket.on('rider:location:update', (data) => {
      if (import.meta.env.DEV) console.log('[ADMIN GPS RECEIVED]', 'orderId:', data.orderId, 'lat:', data.latitude, 'lng:', data.longitude);
      setDeliveries(prev => prev.map(d => {
        if (d._id === data.orderId || d.id === data.orderId || String(d._id) === String(data.orderId)) {
          return {
            ...d,
            tracking: {
              ...d.tracking,
              location: { lat: data.latitude, lng: data.longitude },
              updatedAt: data.timestamp || new Date().toISOString()
            }
          };
        }
        return d;
      }));
    });

    const interval = setInterval(fetchDeliveries, 15000); // Polling fallback
    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  const filteredDeliveries = deliveries.filter(item => {
    if (filter !== 'all') {
      if (filter === 'near_customer') {
        // Simple logic for near_customer, skipping real distance calc for now
        if (item.status !== 'OUT_FOR_DELIVERY') return false;
      } else if (item.status !== filter) {
        return false;
      }
    }
    
    if (search) {
      const q = search.toLowerCase();
      const riderName = item.rider?.name || '';
      const customerName = item.customer?.name || '';
      const orderNum = item.orderNumber || '';
      return (
        orderNum.toLowerCase().includes(q) ||
        riderName.toLowerCase().includes(q) ||
        customerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="admin-live-deliveries-page">
      {/* Top Header */}
      <PageHeader
        title="Real-Time Fleet & Delivery Operations"
        subtitle="Live GPS telemetry of darkstore dispatch, moving riders, and active express customer drop-offs"
        action={
          <div className="header-stats-badge">
            <span className="live-pulsing-dot" />
            <span>{deliveries.length} Active Deliveries</span>
          </div>
        }
      />

      {/* Filter & Search Bar */}
      <div className="delivery-filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <Input
            type="text"
            placeholder="Search order ID, rider name, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-pill-group">
          {[
            { id: 'all', label: 'All Active' },
            { id: 'ASSIGNED', label: 'Assigned' },
            { id: 'PICKED_UP', label: 'Picked Up' },
            { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
            { id: 'near_customer', label: 'Near Customer (<500m)' }
          ].map(f => (
            <Button
              key={f.id}
              type="button"
              className={`filter-pill ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Grid: Logistics Map (70%) + Side Details Inspector (30%) */}
      <div className="operations-grid">
        {/* Logistics Operations Map */}
        <div className="logistics-map-card">
          <LiveDeliveryMap deliveries={filteredDeliveries} selectedDelivery={selectedDelivery} />
        </div>

        {/* Side Inspector Panel */}
        <div className="inspector-side-col">
          {selectedDelivery ? (
            <div className="rider-inspection-panel">
              <div className="panel-head">
                <div className="rider-profile">
                  <div className="avatar">
                    <Bike size={22} />
                  </div>
                  <div>
                    <h3 className="rider-name">{selectedDelivery.rider?.name || 'Unassigned'}</h3>
                    <p className="rider-sub">{selectedDelivery.rider?.vehicleNumber || 'No vehicle'} • ⭐ {selectedDelivery.rider?.rating || 'N/A'}</p>
                  </div>
                </div>
                <StatusBadge status={selectedDelivery.status.replace(/_/g, ' ')} type="neutral" />
              </div>

              <div className="panel-body">
                {/* Telemetry Strip */}
                <div className="telemetry-box">
                  <div className="tele-item">
                    <span className="label">Live ETA</span>
                    <span className="val text-success">Calculating...</span>
                  </div>
                  <div className="tele-item">
                    <span className="label">Distance</span>
                    <span className="val">Calculating...</span>
                  </div>
                  <div className="tele-item">
                    <span className="label">Speed</span>
                    <span className="val">{selectedDelivery.rider?.speed || '0'} km/h</span>
                  </div>
                  <div className="tele-item">
                    <span className="label">GPS</span>
                    <span className="val font-mono">
                      {selectedDelivery.tracking?.location?.lat?.toFixed(4) || 'N/A'}, 
                      {selectedDelivery.tracking?.location?.lng?.toFixed(4) || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Order & Hub Details */}
                <div className="detail-section">
                  <div className="section-label">Order Details</div>
                  <div className="detail-row">
                    <span className="key">Order ID:</span>
                    <Link to={`/admin/orders/${selectedDelivery._id}`} className="order-link">
                      #{selectedDelivery.orderNumber || selectedDelivery._id.slice(-6)}
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                  <div className="detail-row">
                    <span className="key">Basket:</span>
                    <span className="value">{selectedDelivery.items?.length || 0} items (₹{selectedDelivery.totalAmount || 0})</span>
                  </div>
                  <div className="detail-row">
                    <span className="key">Payment:</span>
                    <span className="value font-bold">{selectedDelivery.paymentMethod || 'COD'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="key">Payment Status:</span>
                    <span className="value text-warning font-bold">
                      {selectedDelivery.paymentStatus || 'PENDING'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="key">Delivery OTP:</span>
                    <span className="value text-muted font-bold">
                      {selectedDelivery.deliveryVerificationStatus === 'OTP_VERIFIED' ? 'OTP VERIFIED ✓' : 'OTP PENDING'}
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="section-label">Fulfillment Hub</div>
                  <div className="hub-card">
                    <Store size={16} className="hub-icon" />
                    <div>
                      <div className="hub-title">{selectedDelivery.shop?.name || 'Shop'}</div>
                      <div className="hub-address">{selectedDelivery.shop?.location?.address || 'Shop Address'}</div>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="section-label">Customer Delivery Point</div>
                  <div className="customer-card">
                    <MapPin size={16} className="cust-icon" />
                    <div>
                      <div className="cust-name">{selectedDelivery.customer?.name || 'Customer'}</div>
                      <div className="cust-address">{selectedDelivery.deliveryAddress?.street || 'Delivery Address'}</div>
                      <div className="cust-phone">Phone: {selectedDelivery.customer?.phone || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Operations Actions */}
                <div className="panel-actions">
                  <a href={`tel:${selectedDelivery.rider?.phone}`} className="btn btn-primary btn-sm btn-full">
                    <Phone size={14} />
                    <span>Contact Rider ({selectedDelivery.rider?.phone || 'N/A'})</span>
                  </a>
                  <Link to={`/admin/orders/${selectedDelivery._id}`} className="btn btn-secondary btn-sm btn-full">
                    <Eye size={14} />
                    <span>View Full Order Details</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-selection-card">
              <p>{loading ? 'Loading active deliveries...' : 'No active deliveries to inspect'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
