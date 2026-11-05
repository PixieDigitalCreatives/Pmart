import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getFullAddressString } from '@/utils/addressUtils';
import { orderService } from '@/services/orderService';
import { openSocket } from '@/services/socket';
import { apiErrorMessage } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { ShopTrackRiderModal } from '@/components/shop/ShopTrackRiderModal';
import { AssignRiderPanel } from '@/components/order/AssignRiderPanel';
import { OrderStatusTimeline } from '@/components/order/OrderStatusTimeline';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, paymentDisplay } from '@/types/orderTypes';
import { TbChevronLeft as ChevronLeft, TbCheck as Check, TbNavigation as Navigation, TbUser as User, TbMapPin as MapPin, TbPackage as Package, TbAlertTriangle as AlertTriangle, TbPhone as Phone } from 'react-icons/tb';
import { Button, StatusBadge, Card, LoadingState, EmptyState, Modal, FormField, Input } from '@/components/ui';
import './ShopOrderDetailPage.scss';

/**
 * Order management for store owners (own store) and operations staff (any order).
 * Every action is validated again by the API; buttons only reflect what the current status allows.
 */
export const OrderManagePage = ({ backTo = '/shop/orders' }) => {
  const { id } = useParams();
  const { role, can } = useAuth();
  const isStaff = role === 'ADMIN' || role === 'EMPLOYEE';
  const canManage = !isStaff || can('orders.manage');

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [reasonDialog, setReasonDialog] = useState(null); // { status, title }
  const [reason, setReason] = useState('');
  const [trackOpen, setTrackOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setOrder(await orderService.getOrderById(id));
    } catch (err) {
      if ([403, 404, 400].includes(err.response?.status)) setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Navigating between orders reuses this component, so clear the previous order's messages.
    setNotice(null);
    setReasonDialog(null);
    setTrackOpen(false);
    load();
    const socket = openSocket();
    socket.on('connect', () => socket.emit('join_order', id));
    socket.on('order_status_update', (p) => String(p.orderId) === String(id) && load());
    return () => socket.close();
  }, [id, load]);

  const changeStatus = async (status, why) => {
    setBusy(true);
    setNotice(null);
    try {
      const updated = await orderService.updateStatus(id, status, why);
      setOrder(updated);
      setNotice({ type: 'success', text: `Order marked ${ORDER_STATUS_LABELS[status].toLowerCase()}.` });
    } catch (err) {
      setNotice({ type: 'error', text: apiErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const confirmWithReason = async () => {
    const { status } = reasonDialog;
    setReasonDialog(null);
    await changeStatus(status, reason.trim());
    setReason('');
  };

  if (loading) return <LoadingState text="Loading order..." />;
  if (!order) {
    return <EmptyState icon={Package} title="Order not found" action={<Button component={Link} to={backTo} variant="primary">Back to orders</Button>} />;
  }

  const s = order.status;
  const addr = order.deliveryAddress || {};
  const askReason = (status, title) => {
    setReason('');
    setReasonDialog({ status, title });
  };

  const actions = [];
  if (canManage) {
    if (s === 'PENDING') {
      actions.push({ label: 'Accept order', onClick: () => changeStatus('ACCEPTED'), variant: 'primary' });
      actions.push({ label: 'Reject order', onClick: () => askReason('REJECTED', 'Why are you rejecting this order?'), variant: 'secondary' });
    }
    if (s === 'ACCEPTED') actions.push({ label: 'Start packing', onClick: () => changeStatus('PREPARING'), variant: 'primary' });
    if (s === 'PREPARING') actions.push({ label: 'Mark ready for pickup', onClick: () => changeStatus('READY'), variant: 'primary' });
    if (s === 'DELIVERY_FAILED') actions.push({ label: 'Send out again', onClick: () => changeStatus('READY'), variant: 'primary' });
    if (['ACCEPTED', 'PREPARING', 'READY'].includes(s) || (isStaff && ['ASSIGNED', 'DELIVERY_FAILED'].includes(s))) {
      actions.push({ label: 'Cancel order', onClick: () => askReason('CANCELLED', 'Why is this order being cancelled?'), variant: 'secondary' });
    }
  }

  return (
    <div className="shop-order-detail-page">
      <div className="detail-top-nav">
        <Link to={backTo} className="back-link">
          <ChevronLeft size={16} />
          <span>Back to orders</span>
        </Link>
      </div>

      <div className="order-detail-title-card">
        <div className="title-left">
          <h1 className="order-heading">Order #{order.orderNumber}</h1>
          <p className="created-time">Placed {new Date(order.createdAt).toLocaleString('en-IN')}{order.shop?.name ? ` • ${order.shop.name}` : ''}</p>
        </div>
        <div className="status-indicator-box flex items-center gap-2">
          <StatusBadge status={ORDER_STATUS_LABELS[s]} type={ORDER_STATUS_TONE[s]} />
          {['PICKED_UP', 'OUT_FOR_DELIVERY', 'ARRIVED'].includes(s) && (
            <Button variant="primary" size="sm" onClick={() => setTrackOpen(true)}>
              <Navigation size={14} style={{ marginRight: 6 }} />
              Track rider
            </Button>
          )}
        </div>
      </div>

      {notice && (
        <div className={`alert ${notice.type === 'success' ? 'alert-success' : 'alert-error'} mb-4`}>
          {notice.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          <span>{notice.text}</span>
        </div>
      )}
      {order.cancellationReason && ['CANCELLED', 'REJECTED'].includes(s) && (
        <div className="alert alert-error mb-4">
          <AlertTriangle size={16} />
          <span>Reason: {order.cancellationReason}</span>
        </div>
      )}

      <div className="detail-grid">
        <div className="detail-left-col">
          <Card className="detail-card mb-4">
            <h3 className="card-heading">Items ({order.itemCount})</h3>
            <div className="items-list">
              {order.items.map((item) => (
                <div key={String(item.product)} className="manifest-row flex items-center gap-3 py-2 border-b">
                  {item.imageUrl ? <img src={item.imageUrl} alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} /> : <Package size={20} className="text-gray-400" />}
                  <div className="flex-1">
                    <div className="font-semibold">{item.name}</div>
                    <div className="muted-note">{item.unit}</div>
                  </div>
                  <div>×{item.quantity}</div>
                  <div className="font-semibold" style={{ minWidth: 70, textAlign: 'right' }}>₹{Math.round(item.price * item.quantity * 100) / 100}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-sm space-y-1">
              <div className="flex justify-between"><span>Items</span><span>₹{order.subTotal}</span></div>
              <div className="flex justify-between"><span>Delivery fee</span><span>₹{order.deliveryFee}</span></div>
              <div className="flex justify-between"><span>Handling fee</span><span>₹{order.platformFee}</span></div>
              <div className="flex justify-between font-bold"><span>Total (COD)</span><span>₹{order.totalAmount}</span></div>
              <div className="flex justify-between"><span>Payment</span><span>{paymentDisplay(order).label}</span></div>
              <div className="flex justify-between"><span>Delivery code</span><span>{order.deliveryVerificationStatus === 'OTP_VERIFIED' ? 'Verified' : 'Not verified'}</span></div>
            </div>
          </Card>

          <Card className="detail-card mb-4">
            <h3 className="card-heading">Customer and delivery address</h3>
            <div className="text-sm space-y-2">
              <div className="flex items-center gap-2"><User size={15} /> {addr.recipientName} {order.customer?.name && order.customer.name !== addr.recipientName ? `(account: ${order.customer.name})` : ''}</div>
              <div className="flex items-center gap-2">
                <Phone size={15} /> <a href={`tel:${addr.recipientPhone}`}>{addr.recipientPhone}</a>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={15} style={{ marginTop: 2 }} />
                <span>
                  {getFullAddressString(addr)}
                  {addr.landmark && <span className="muted-note block">Landmark: {addr.landmark}</span>}
                </span>
              </div>
              {order.deliveryInstructions && (
                <div className="alert alert-info">
                  <span>Note: {order.deliveryInstructions}</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="detail-card">
            <OrderStatusTimeline status={s === 'REJECTED' ? 'CANCELLED' : s} timeline={order.statusHistory} compact />
          </Card>
        </div>

        <div className="detail-right-col">
          {actions.length > 0 && (
            <Card className="detail-card mb-4">
              <h3 className="card-heading">Actions</h3>
              <div className="space-y-2">
                {actions.map((a) => (
                  <Button key={a.label} variant={a.variant} style={{ width: '100%' }} disabled={busy} onClick={a.onClick}>
                    {a.label}
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {canManage && ['READY', 'ASSIGNED'].includes(s) && (
            <Card className="detail-card mb-4">
              <h3 className="card-heading">Delivery rider</h3>
              <AssignRiderPanel order={order} onAssigned={(o) => { setOrder(o); setNotice({ type: 'success', text: `Assigned to ${o.rider?.name}.` }); }} />
            </Card>
          )}

          {order.rider && (
            <Card className="detail-card">
              <h3 className="card-heading">Assigned rider</h3>
              <div className="text-sm">
                <div className="font-semibold">{order.rider.name}</div>
                <div className="muted-note">{[order.rider.vehicleType, order.rider.vehicleNumber].filter(Boolean).join(' • ')}</div>
                {order.rider.phone && <a href={`tel:${order.rider.phone}`}>{order.rider.phone}</a>}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal isOpen={Boolean(reasonDialog)} onClose={() => setReasonDialog(null)} title={reasonDialog?.title || ''}>
        <FormField label="Reason (shared with the customer)" htmlFor="status-reason">
          <Input id="status-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} autoFocus />
        </FormField>
        <div className="actions-row mt-3" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => setReasonDialog(null)}>
            Back
          </Button>
          <Button variant="primary" disabled={!reason.trim()} onClick={confirmWithReason}>
            Confirm
          </Button>
        </div>
      </Modal>

      <ShopTrackRiderModal isOpen={trackOpen} onClose={() => setTrackOpen(false)} order={order} />
    </div>
  );
};
