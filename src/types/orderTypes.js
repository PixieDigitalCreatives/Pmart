/**
 * Order status constants shared by every portal. Values match the backend enums exactly.
 */

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  ASSIGNED: 'ASSIGNED',
  PICKED_UP: 'PICKED_UP',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  ARRIVED: 'ARRIVED',
  DELIVERED: 'DELIVERED',
  DELIVERY_FAILED: 'DELIVERY_FAILED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
};

export const PAYMENT_METHOD = { COD: 'COD' };

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  COLLECTED: 'COLLECTED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
};

export const DELIVERY_VERIFICATION_STATUS = {
  PENDING: 'PENDING',
  OTP_VERIFIED: 'OTP_VERIFIED'
};

export const ORDER_STATUS_LABELS = {
  PENDING: 'Order placed',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready for pickup',
  ASSIGNED: 'Rider assigned',
  PICKED_UP: 'Picked up',
  OUT_FOR_DELIVERY: 'Out for delivery',
  ARRIVED: 'Rider arrived',
  DELIVERED: 'Delivered',
  DELIVERY_FAILED: 'Delivery failed',
  REJECTED: 'Rejected by store',
  CANCELLED: 'Cancelled'
};

/** StatusBadge tone for each status. */
export const ORDER_STATUS_TONE = {
  PENDING: 'warning',
  ACCEPTED: 'info',
  PREPARING: 'warning',
  READY: 'info',
  ASSIGNED: 'info',
  PICKED_UP: 'primary',
  OUT_FOR_DELIVERY: 'primary',
  ARRIVED: 'primary',
  DELIVERED: 'success',
  DELIVERY_FAILED: 'error',
  REJECTED: 'error',
  CANCELLED: 'error'
};

export const ACTIVE_ORDER_STATUSES = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'ARRIVED', 'DELIVERY_FAILED'];
export const PAST_ORDER_STATUSES = ['DELIVERED', 'CANCELLED', 'REJECTED'];

/**
 * Display label and badge tone for an order's payment. A cash-on-delivery order that was cancelled or
 * rejected before payment owes nothing, so it reads "Not charged" rather than "Pending".
 */
export const paymentDisplay = (order) => {
  const ps = order?.paymentStatus || PAYMENT_STATUS.PENDING;
  if (ps === PAYMENT_STATUS.COLLECTED) return { label: 'Collected', tone: 'success' };
  if (ps === PAYMENT_STATUS.REFUNDED) return { label: 'Refunded', tone: 'neutral' };
  if (ps === PAYMENT_STATUS.FAILED) return { label: 'Failed', tone: 'error' };
  if (['CANCELLED', 'REJECTED'].includes(order?.status)) return { label: 'Not charged', tone: 'neutral' };
  return { label: 'Pending', tone: 'warning' };
};
export const CUSTOMER_CANCELLABLE = ['PENDING', 'ACCEPTED'];

/** The customer-facing progress steps. */
export const ORDER_PROGRESSION_STAGES = [
  { key: ORDER_STATUS.PENDING, label: 'ORDER PLACED', description: 'We have received your order' },
  { key: ORDER_STATUS.ACCEPTED, label: 'ACCEPTED', description: 'The store confirmed your order' },
  { key: ORDER_STATUS.PREPARING, label: 'PREPARING', description: 'Your items are being packed' },
  { key: ORDER_STATUS.READY, label: 'READY', description: 'Packed and waiting for a rider' },
  { key: ORDER_STATUS.ASSIGNED, label: 'RIDER ASSIGNED', description: 'A delivery partner is assigned' },
  { key: ORDER_STATUS.PICKED_UP, label: 'PICKED UP', description: 'The rider has your order' },
  { key: ORDER_STATUS.OUT_FOR_DELIVERY, label: 'OUT FOR DELIVERY', description: 'On the way to you' },
  { key: ORDER_STATUS.ARRIVED, label: 'ARRIVED', description: 'The rider is at your door' },
  { key: ORDER_STATUS.DELIVERED, label: 'DELIVERED', description: 'Delivered and paid' }
];

/** Statuses are already canonical from the API; this only guards against missing values. */
export const normalizeOrderStatus = (status) => (status ? String(status).toUpperCase() : ORDER_STATUS.PENDING);

/** Customers see a store rejection as a cancellation. */
export const getCustomerOrderStatus = (status) => {
  const norm = normalizeOrderStatus(status);
  return norm === ORDER_STATUS.REJECTED ? ORDER_STATUS.CANCELLED : norm;
};
