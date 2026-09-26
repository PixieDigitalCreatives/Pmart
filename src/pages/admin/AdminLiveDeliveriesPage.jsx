import React, { useState } from 'react';
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
import './AdminLiveDeliveriesPage.scss';

// Mock active fleet deliveries across regional darkstores
const MOCK_ACTIVE_DELIVERIES = [
  {
    id: 'DEL-8921',
    orderId: 'PM-88291',
    rider: {
      id: 'rider-201',
      name: 'Vikram Singh',
      phone: '+91 98112 34567',
      vehicle: 'Hero Electric NYX',
      vehicleNumber: 'BR 24 AX 4492',
      rating: 4.9,
      speed: '28 km/h',
      lat: 24.9542,
      lng: 84.0210,
      x: 320,
      y: 280
    },
    shop: {
      id: 'shop-101',
      name: 'P Mart Sasaram',
      address: 'P Mart, Panjar Colony, Near Sasaram Junction, Rohtas, Bihar 821115'
    },
    customer: {
      name: 'Rohan Sharma',
      phone: '+91 98765 43210',
      address: 'House 14, Gaurakshani Colony, Sasaram'
    },
    status: 'out_for_delivery',
    statusLabel: 'Out for Delivery',
    etaMinutes: 7,
    distanceKm: 1.4,
    itemsCount: 6,
    orderTotal: 494
  },
  {
    id: 'DEL-8922',
    orderId: 'PM-88292',
    rider: {
      id: 'rider-202',
      name: 'Rahul Sharma',
      phone: '+91 98223 55110',
      vehicle: 'Ather 450X',
      vehicleNumber: 'BR 24 CG 9912',
      rating: 4.8,
      speed: '31 km/h',
      lat: 24.9490,
      lng: 84.0268,
      x: 620,
      y: 490
    },
    shop: {
      id: 'shop-101',
      name: 'P Mart Sasaram',
      address: 'P Mart, Panjar Colony, Near Sasaram Junction, Rohtas, Bihar 821115'
    },
    customer: {
      name: 'Pooja Verma',
      phone: '+91 98110 44229',
      address: 'Plot 42, Gaurakshani Sector 2, Sasaram'
    },
    status: 'near_customer',
    statusLabel: 'Near Customer (<400m)',
    etaMinutes: 2,
    distanceKm: 0.3,
    itemsCount: 4,
    orderTotal: 320
  },
  {
    id: 'DEL-8923',
    orderId: 'PM-88293',
    rider: {
      id: 'rider-203',
      name: 'Amit Kumar',
      phone: '+91 98334 66221',
      vehicle: 'Honda Activa 6G',
      vehicleNumber: 'UP 16 BD 7721',
      rating: 4.7,
      speed: '22 km/h',
      lat: 28.6180,
      lng: 77.3680,
      x: 210,
      y: 110
    },
    shop: {
      id: 'shop-101',
      name: 'PMart Darkstore Hub — Sector 62',
      address: 'Plot B-4, Sector 62, Noida'
    },
    customer: {
      name: 'Ananya Deshmukh',
      phone: '+91 98450 77123',
      address: 'Tower 3, Cleo County, Sector 121, Noida'
    },
    status: 'picked_up',
    statusLabel: 'Picked Up (Departing Hub)',
    etaMinutes: 11,
    distanceKm: 2.2,
    itemsCount: 9,
    orderTotal: 780
  },
  {
    id: 'DEL-8924',
    orderId: 'PM-88294',
    rider: {
      id: 'rider-204',
      name: 'Sunil Yadav',
      phone: '+91 98445 77332',
      vehicle: 'TVS iQube',
      vehicleNumber: 'DL 4S BN 8812',
      rating: 4.9,
      speed: '0 km/h (At Hub)',
      lat: 28.6280,
      lng: 77.3649,
      x: 90,
      y: 110
    },
    shop: {
      id: 'shop-101',
      name: 'PMart Darkstore Hub — Sector 62',
      address: 'Plot B-4, Sector 62, Noida'
    },
    customer: {
      name: 'Manish Taneja',
      phone: '+91 98771 22883',
      address: 'Villa 12, Gulshan Bellina, Noida Extension'
    },
    status: 'assigned',
    statusLabel: 'Rider Assigned (Packing in Progress)',
    etaMinutes: 14,
    distanceKm: 3.1,
    itemsCount: 5,
    orderTotal: 410
  }
];

export const AdminLiveDeliveriesPage = () => {
  const [filter, setFilter] = useState('all'); // 'all' | 'assigned' | 'picked_up' | 'out_for_delivery' | 'near_customer'
  const [search, setSearch] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(MOCK_ACTIVE_DELIVERIES[0]);

  const filteredDeliveries = MOCK_ACTIVE_DELIVERIES.filter(item => {
    if (filter !== 'all' && item.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.orderId.toLowerCase().includes(q) ||
        item.rider.name.toLowerCase().includes(q) ||
        item.customer.name.toLowerCase().includes(q) ||
        item.rider.vehicleNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="admin-live-deliveries-page">
      {/* Top Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Real-Time Fleet & Delivery Operations</h1>
          <p className="page-subtitle">
            Live GPS telemetry of darkstore dispatch, moving riders, and active express customer drop-offs
          </p>
        </div>
        <div className="header-stats-badge">
          <span className="live-pulsing-dot" />
          <span>{MOCK_ACTIVE_DELIVERIES.length} Active Deliveries • 100% SLA Adherence</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="delivery-filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search order ID, rider name, vehicle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-pill-group">
          {[
            { id: 'all', label: 'All Active' },
            { id: 'assigned', label: 'Assigned' },
            { id: 'picked_up', label: 'Picked Up' },
            { id: 'out_for_delivery', label: 'Out for Delivery' },
            { id: 'near_customer', label: 'Near Customer (<500m)' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              className={`filter-pill ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Logistics Map (70%) + Side Details Inspector (30%) */}
      <div className="operations-grid">
        {/* Logistics Operations Map */}
        <div className="logistics-map-card">
          <div className="map-viewport">
            <svg viewBox="0 0 1000 600" className="logistics-svg-canvas" preserveAspectRatio="xMidYMid slice">
              {/* Land Base */}
              <rect width="1000" height="600" fill="#f4f3f0" />

              {/* Park Areas */}
              <path d="M 40,240 Q 120,200 240,230 L 260,380 Q 140,410 40,360 Z" fill="#d4edd4" />
              <path d="M 680,80 Q 820,60 920,120 L 890,260 Q 750,230 670,180 Z" fill="#d4edd4" />
              {/* Canal */}
              <path d="M 0,540 Q 300,510 520,550 T 1000,530 L 1000,600 L 0,600 Z" fill="#aad3df" />

              {/* Major Roads Network */}
              <g stroke="#f7b243" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round">
                <line x1="0" y1="110" x2="1000" y2="110" />
                <line x1="320" y1="0" x2="320" y2="600" />
                <line x1="0" y1="280" x2="1000" y2="280" />
                <line x1="620" y1="0" x2="620" y2="600" />
                <line x1="0" y1="490" x2="1000" y2="490" />
              </g>
              <g stroke="#fde293" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round">
                <line x1="0" y1="110" x2="1000" y2="110" />
                <line x1="320" y1="0" x2="320" y2="600" />
                <line x1="0" y1="280" x2="1000" y2="280" />
                <line x1="620" y1="0" x2="620" y2="600" />
                <line x1="0" y1="490" x2="1000" y2="490" />
              </g>

              {/* Local Streets */}
              <g stroke="#ffffff" strokeWidth="10" strokeLinecap="round">
                <line x1="160" y1="110" x2="160" y2="280" />
                <line x1="470" y1="110" x2="470" y2="280" />
                <line x1="470" y1="280" x2="470" y2="490" />
                <line x1="780" y1="280" x2="780" y2="490" />
                <line x1="880" y1="110" x2="880" y2="350" />
              </g>

              {/* Street Names */}
              <g fill="#5f6368" fontSize="11" fontWeight="500" fontFamily="Roboto, sans-serif">
                <text x="110" y="98">GT Road (Grand Trunk Rd / NH 19)</text>
                <text x="430" y="268">Dharamsala Road Crossing</text>
                <text x="690" y="478">Gaurakshani Corridor</text>
              </g>

              {/* Regional Darkstore Hub Marker */}
              <g transform="translate(90, 110)">
                <circle cx="0" cy="0" r="18" fill="#F20D18" stroke="#ffffff" strokeWidth="3" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.3))" />
                <text x="0" y="6" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="900">P</text>
                <a href="https://maps.app.goo.gl/rpyAd9tmiLKiQFyQ9" target="_blank" rel="noopener noreferrer">
                  <g transform="translate(0, -28)">
                    <rect x="-65" y="-12" width="130" height="24" rx="4" fill="#ffffff" stroke="#dadce0" strokeWidth="1" filter="drop-shadow(0 1px 3px rgba(0,0,0,0.15))" />
                    <text x="0" y="4" textAnchor="middle" fill="#202124" fontSize="10.5" fontWeight="700">P Mart Sasaram</text>
                  </g>
                </a>
              </g>

              {/* Active Riders Plot */}
              {filteredDeliveries.map((del) => {
                const isSelected = selectedDelivery?.id === del.id;
                const statusColor = del.status === 'near_customer' ? '#16a34a' : del.status === 'out_for_delivery' ? '#2563eb' : '#d97706';

                return (
                  <g
                    key={del.id}
                    transform={`translate(${del.rider.x}, ${del.rider.y})`}
                    onClick={() => setSelectedDelivery(del)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Pulsing selection ring */}
                    {isSelected && (
                      <circle cx="0" cy="0" r="26" fill="none" stroke="#F20D18" strokeWidth="2.5" strokeDasharray="4 4" className="admin-selected-pulse" />
                    )}

                    {/* Rider Marker Circle */}
                    <circle
                      cx="0"
                      cy="0"
                      r={isSelected ? 16 : 13}
                      fill={statusColor}
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      filter="drop-shadow(0 2px 6px rgba(0,0,0,0.3))"
                    />

                    <g transform="translate(-7, -7) scale(0.7)">
                      <Bike size={20} color="#ffffff" />
                    </g>

                    {/* Floating Rider & Order Callout */}
                    <g transform="translate(0, -22)">
                      <rect
                        x="-52"
                        y="-10"
                        width="104"
                        height="20"
                        rx="10"
                        fill={isSelected ? '#111318' : 'rgba(32, 33, 36, 0.88)'}
                        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))"
                      />
                      <circle cx="-42" cy="0" r="3.5" fill={statusColor} />
                      <text x="-34" y="3.5" fill="#ffffff" fontSize="9" fontWeight="600" fontFamily="Roboto, sans-serif">
                        {del.rider.name.split(' ')[0]} • #{del.orderId.slice(-4)}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>

            {/* Google Maps Controls */}
            <div className="gmap-watermark-strip">
              <span className="google-font-logo">
                <span style={{ color: '#4285F4' }}>G</span>
                <span style={{ color: '#EA4335' }}>o</span>
                <span style={{ color: '#FBBC05' }}>o</span>
                <span style={{ color: '#4285F4' }}>g</span>
                <span style={{ color: '#34A853' }}>l</span>
                <span style={{ color: '#EA4335' }}>e</span>
              </span>
              <span className="logistics-engine-pill">Enterprise Fleet Map</span>
            </div>
          </div>
        </div>

        {/* Side Inspector Panel (Requirement 17) */}
        <div className="inspector-side-col">
          {selectedDelivery ? (
            <div className="rider-inspection-panel">
              <div className="panel-head">
                <div className="rider-profile">
                  <div className="avatar">
                    <Bike size={22} />
                  </div>
                  <div>
                    <h3 className="rider-name">{selectedDelivery.rider.name}</h3>
                    <p className="rider-sub">{selectedDelivery.rider.vehicle} • {selectedDelivery.rider.vehicleNumber}</p>
                  </div>
                </div>
                <span className={`status-badge-chip ${selectedDelivery.status}`}>
                  {selectedDelivery.statusLabel}
                </span>
              </div>

              <div className="panel-body">
                {/* Telemetry Strip */}
                <div className="telemetry-box">
                  <div className="tele-item">
                    <span className="label">Live ETA</span>
                    <span className="val text-success">{selectedDelivery.etaMinutes} mins</span>
                  </div>
                  <div className="tele-item">
                    <span className="label">Distance Remaining</span>
                    <span className="val">{selectedDelivery.distanceKm} km</span>
                  </div>
                  <div className="tele-item">
                    <span className="label">Current Speed</span>
                    <span className="val">{selectedDelivery.rider.speed}</span>
                  </div>
                  <div className="tele-item">
                    <span className="label">GPS Coordinates</span>
                    <span className="val font-mono">{selectedDelivery.rider.lat.toFixed(4)}, {selectedDelivery.rider.lng.toFixed(4)}</span>
                  </div>
                </div>

                {/* Order & Hub Details */}
                <div className="detail-section">
                  <div className="section-label">Order Details</div>
                  <div className="detail-row">
                    <span className="key">Order ID:</span>
                    <Link to={`/orders/${selectedDelivery.orderId}`} className="order-link">
                      #{selectedDelivery.orderId}
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                  <div className="detail-row">
                    <span className="key">Basket:</span>
                    <span className="value">{selectedDelivery.itemsCount} packed items (₹{selectedDelivery.orderTotal})</span>
                  </div>
                  <div className="detail-row">
                    <span className="key">Payment:</span>
                    <span className="value font-bold">Cash on Delivery (COD)</span>
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
                      <div className="hub-title">{selectedDelivery.shop.name}</div>
                      <div className="hub-address">{selectedDelivery.shop.address}</div>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="section-label">Customer Delivery Point</div>
                  <div className="customer-card">
                    <MapPin size={16} className="cust-icon" />
                    <div>
                      <div className="cust-name">{selectedDelivery.customer.name}</div>
                      <div className="cust-address">{selectedDelivery.customer.address}</div>
                      <div className="cust-phone">Phone: {selectedDelivery.customer.phone}</div>
                    </div>
                  </div>
                </div>

                {/* Operations Actions */}
                <div className="panel-actions">
                  <a href={`tel:${selectedDelivery.rider.phone}`} className="btn btn-primary btn-sm btn-full">
                    <Phone size={14} />
                    <span>Contact Rider ({selectedDelivery.rider.phone})</span>
                  </a>
                  <Link to={`/orders/${selectedDelivery.orderId}`} className="btn btn-secondary btn-sm btn-full">
                    <Eye size={14} />
                    <span>View Customer Audit View</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-selection-card">
              <p>Select any active rider marker on the map to inspect telemetry</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
