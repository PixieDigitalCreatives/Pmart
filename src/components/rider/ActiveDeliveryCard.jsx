import React from 'react';
import { Link } from 'react-router-dom';
import { Navigation, Phone, ArrowRight } from 'lucide-react';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from '@/types/orderTypes';
import { getFullAddressString } from '@/utils/addressUtils';
import { Button, StatusBadge } from '@/components/ui';
import '@/pages/rider/RiderDashboardPage.scss';
import { plural } from '@/utils/plural';

/** Summary of the rider's current delivery with a link to the handover screen. */
export const ActiveDeliveryCard = ({ order }) => {
  const addr = order.deliveryAddress || {};
  const shopAddress = order.shop?.address;
  return (
    <div className="active-delivery-card">
      <div className="card-top">
        <div className="order-id-group">
          <span className="order-id">Order #{order.orderNumber}</span>
          <StatusBadge status={ORDER_STATUS_LABELS[order.status]} type={ORDER_STATUS_TONE[order.status]} />
        </div>
        <span className="eta-countdown">₹{order.totalAmount} COD</span>
      </div>

      <div className="route-indicator-block">
        <div className="point-item pickup">
          <div className="marker-dot green" />
          <div className="point-info">
            <div className="label">PICK UP FROM</div>
            <div className="name">{order.shop?.name}</div>
            {shopAddress && <div className="muted-note">{[shopAddress.street, shopAddress.area, shopAddress.city].filter(Boolean).join(', ')}</div>}
          </div>
        </div>
        <div className="route-connector-line" />
        <div className="point-item drop">
          <div className="marker-dot red" />
          <div className="point-info">
            <div className="label">DELIVER TO</div>
            <div className="name">{addr.recipientName}</div>
            <div className="muted-note">{getFullAddressString(addr)}</div>
          </div>
        </div>
      </div>

      <div className="customer-strip">
        <div>
          <div className="cust-name font-semibold">{addr.recipientName}</div>
          <div className="cust-items text-muted text-xs">
            {plural(order.itemCount, 'item')}: {order.items.map((i) => i.name).slice(0, 2).join(', ')}
            {order.items.length > 2 ? '…' : ''}
          </div>
        </div>
        {addr.recipientPhone && (
          <a href={`tel:${addr.recipientPhone}`} className="phone-btn" title="Call customer" aria-label="Call customer">
            <Phone size={16} />
          </a>
        )}
      </div>

      <Button component={Link} to={`/rider/orders/${order._id}`} variant="primary" size="lg" className="w-full flex items-center justify-between mt-4">
        <span className="flex items-center gap-2">
          <Navigation size={18} />
          <span>Open delivery</span>
        </span>
        <ArrowRight size={18} />
      </Button>
    </div>
  );
};
