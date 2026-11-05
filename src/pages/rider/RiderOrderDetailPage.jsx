import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { orderService } from '@/services/orderService';
import { deliveryService } from '@/services/deliveryService';
import { riderService } from '@/services/riderService';
import { riderLocationService } from '@/services/riderLocationService';
import { getRoute } from '@/services/routingService';
import { useRider } from '@/components/rider/RiderLayout';
import { LiveTrackingMap } from '@/components/tracking/LiveTrackingMap';
import { CollectPaymentSection } from '@/components/delivery/CollectPaymentSection';
import { DeliveryVerificationSection } from '@/components/delivery/DeliveryVerificationSection';
import { DeliveryCompletionScreen } from '@/components/delivery/DeliveryCompletionScreen';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from '@/types/orderTypes';
import { getFullAddressString } from '@/utils/addressUtils';
import { TbNavigation as Navigation, TbPhone as Phone, TbCircleCheck as CheckCircle2, TbMapPin as MapPin, TbChevronLeft as ChevronLeft, TbAlertTriangle as AlertTriangle, TbBuildingStore as Store } from 'react-icons/tb';
import { Button, Card, StatusBadge, LoadingState, EmptyState, Modal, FormField, Input } from '@/components/ui';
import './RiderOrderDetailPage.scss';

const GPS_STATUSES = ['PICKED_UP', 'OUT_FOR_DELIVERY', 'ARRIVED'];

export const RiderOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { reloadProfile } = useRider();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [gps, setGps] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const [route, setRoute] = useState(null);
  const [failOpen, setFailOpen] = useState(false);
  const [failReason, setFailReason] = useState('');
  const lastRouteAt = useRef(0);

  const load = useCallback(async () => {
    try {
      setOrder(await orderService.getOrderById(id));
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const status = order?.status;
  const destination = order?.deliveryAddress?.location?.coordinates;

  // Broadcast GPS while the rider is carrying the order.
  useEffect(() => {
    if (!GPS_STATUSES.includes(status)) {
      riderLocationService.stopBroadcasting();
      return undefined;
    }
    if (!('geolocation' in navigator)) {
      setGpsError('This device cannot share its location.');
      return undefined;
    }
    riderLocationService.startBroadcasting(id, (loc) => {
      setGps(loc);
      setGpsError('');
      if (destination && Date.now() - lastRouteAt.current > 15000) {
        lastRouteAt.current = Date.now();
        getRoute([loc.lng, loc.lat], destination).then((r) => r && setRoute(r.geometry)).catch(() => {});
      }
    }, (message) => setGpsError(message));
    return () => riderLocationService.stopBroadcasting();
  }, [status, id, destination?.[0], destination?.[1]]);

  const run = async (fn, successText) => {
    setBusy(true);
    setNotice(null);
    try {
      const result = await fn();
      const next = result.order || result;
      setOrder(next);
      if (successText) setNotice({ type: 'success', text: successText });
      if (next.status === 'DELIVERED' || next.status === 'DELIVERY_FAILED') reloadProfile();
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Something went wrong.' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState text="Loading delivery..." />;
  if (!order) return <EmptyState icon={AlertTriangle} title="Delivery not found" description="It may have been re-assigned." action={<Button onClick={() => navigate('/rider')} variant="primary">Back to home</Button>} />;

  const addr = order.deliveryAddress || {};
  const shop = order.shop || {};
  const isArrived = status === 'ARRIVED';
  const cashCollected = order.paymentStatus === 'COLLECTED';

  return (
    <div className="rider-order-detail-page">
      <div className="detail-top-nav flex justify-between items-center">
        <Link to="/rider" className="back-link flex items-center gap-1">
          <ChevronLeft size={16} />
          <span>Rider home</span>
        </Link>
        <StatusBadge status={ORDER_STATUS_LABELS[status]} type={ORDER_STATUS_TONE[status]} />
      </div>

      {notice && (
        <div className={`alert ${notice.type === 'success' ? 'alert-success' : 'alert-error'} mb-3`}>
          {notice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{notice.text}</span>
        </div>
      )}

      {status === 'DELIVERED' && <DeliveryCompletionScreen order={order} onViewOrder={() => navigate('/rider')} />}

      {status === 'DELIVERY_FAILED' && (
        <div className="alert alert-warning mb-3">
          <AlertTriangle size={16} />
          <span>Delivery marked as failed. Return the items to {shop.name}.</span>
        </div>
      )}

      {isArrived && (
        <div className="rider-arrived-workflow-container mb-3">
          {!cashCollected ? (
            <CollectPaymentSection order={order} onPaymentSuccess={(o) => { setOrder(o); setNotice({ type: 'success', text: 'Cash collected. Now enter the delivery code.' }); }} isProcessing={busy} />
          ) : (
            <DeliveryVerificationSection order={order} onVerificationSuccess={(o) => { setOrder(o); setNotice(null); reloadProfile(); }} isProcessing={busy} />
          )}
        </div>
      )}

      {GPS_STATUSES.includes(status) && (
        <div className="gps-map-section-wrapper mb-3">
          <div className="text-xs mb-2">
            {gpsError ? <span className="text-error">{gpsError}</span> : gps ? <span className="text-success">Sharing live location</span> : <span className="text-muted">Waiting for GPS…</span>}
          </div>
          <LiveTrackingMap riderLocation={gps} customerLocation={addr} hubLocation={shop} route={route} height="280px" riderName="You" orderId={order._id} />
        </div>
      )}

      {['ASSIGNED', 'PICKED_UP'].includes(status) && (
        <Card className="mb-3">
          <div className="flex items-start gap-2">
            <Store size={18} />
            <div>
              <div className="text-xs text-muted">PICK UP FROM</div>
              <div className="font-semibold">{shop.name}</div>
              <div className="text-sm">{[shop.address?.street, shop.address?.area, shop.address?.city].filter(Boolean).join(', ')}</div>
              {shop.phone && <a href={`tel:${shop.phone}`} className="text-sm">{shop.phone}</a>}
            </div>
          </div>
        </Card>
      )}

      <Card className="mb-3">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs text-muted">DELIVER TO • {addr.label}</div>
            <h3 className="font-bold">{addr.recipientName}</h3>
            <p className="text-sm">{getFullAddressString(addr)}</p>
            {addr.landmark && <p className="text-sm muted-note">Landmark: {addr.landmark}</p>}
          </div>
          {addr.recipientPhone && (
            <a href={`tel:${addr.recipientPhone}`} className="btn btn-secondary btn-sm" aria-label="Call customer">
              <Phone size={16} />
            </a>
          )}
        </div>
        {order.deliveryInstructions && <div className="alert alert-info mt-2">Customer note: {order.deliveryInstructions}</div>}
        <div className="text-sm mt-2">
          Collect: <strong>₹{order.totalAmount}</strong> cash {cashCollected && '(collected)'}
        </div>
      </Card>

      <Card className="mb-3">
        <h4 className="font-bold mb-2">Items ({order.itemCount})</h4>
        <ul className="text-sm space-y-1">
          {order.items.map((item) => (
            <li key={String(item.product)}>
              {item.quantity} × {item.name} <span className="text-muted">({item.unit})</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="rider-action-bar space-y-2">
        {status === 'ASSIGNED' && (
          <Button variant="primary" size="lg" className="w-full" disabled={busy} isLoading={busy} onClick={() => run(() => riderService.pickup(order._id), 'Picked up. Start the delivery when you leave the store.')}>
            <Navigation size={18} style={{ marginRight: 8 }} />
            Confirm pickup from store
          </Button>
        )}
        {status === 'PICKED_UP' && (
          <Button variant="primary" size="lg" className="w-full" disabled={busy} isLoading={busy} onClick={() => run(() => deliveryService.startDeliveryRun(order._id), 'On the way. The customer can now see your location.')}>
            <Navigation size={18} style={{ marginRight: 8 }} />
            Start delivery
          </Button>
        )}
        {status === 'OUT_FOR_DELIVERY' && (
          <Button variant="primary" size="lg" className="w-full arrived-cta-btn" disabled={busy} isLoading={busy} onClick={() => run(() => deliveryService.markArrived(order._id), 'Marked arrived. Collect the cash.')}>
            <MapPin size={18} style={{ marginRight: 8 }} />
            I have arrived
          </Button>
        )}
        {['OUT_FOR_DELIVERY', 'ARRIVED'].includes(status) && (
          <Button variant="secondary" className="w-full" disabled={busy} onClick={() => { setFailReason(''); setFailOpen(true); }}>
            Could not deliver
          </Button>
        )}
      </div>

      <Modal isOpen={failOpen} onClose={() => setFailOpen(false)} title="Why could the order not be delivered?">
        <FormField label="Reason" htmlFor="fail-reason">
          <Input id="fail-reason" value={failReason} onChange={(e) => setFailReason(e.target.value)} maxLength={300} placeholder="e.g. Customer not reachable" autoFocus />
        </FormField>
        <div className="actions-row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => setFailOpen(false)}>
            Back
          </Button>
          <Button
            variant="primary"
            disabled={!failReason.trim() || busy}
            onClick={async () => {
              setFailOpen(false);
              await run(() => deliveryService.markFailed(order._id, failReason.trim()), 'Delivery marked as failed.');
            }}
          >
            Confirm
          </Button>
        </div>
      </Modal>
    </div>
  );
};
