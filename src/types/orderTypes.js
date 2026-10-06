/**
 * PMart Order Flow Types & Status Definitions
 * Backend-ready constants and interfaces
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
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  DELIVERY_FAILED: 'DELIVERY_FAILED',
  RETRY: 'RETRY'
};

export const PAYMENT_METHOD = {
  COD: 'COD'
};

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  COLLECTED: 'COLLECTED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
};

export const DELIVERY_VERIFICATION_STATUS = {
  OTP_PENDING: 'OTP_PENDING',
  OTP_VERIFIED: 'OTP_VERIFIED'
};

/**
 * Standard 7-stage order status progression
 */
export const ORDER_PROGRESSION_STAGES = [
  { key: ORDER_STATUS.PENDING, label: 'ORDER PLACED', description: 'Order placed by customer' },
  { key: ORDER_STATUS.ACCEPTED, label: 'ORDER ACCEPTED', description: 'Confirmed by darkstore' },
  { key: ORDER_STATUS.PREPARING, label: 'PREPARING', description: 'Packing items in darkstore' },
  { key: ORDER_STATUS.READY, label: 'READY FOR PICKUP', description: 'Bagged & ready for rider' },
  { key: ORDER_STATUS.ASSIGNED, label: 'RIDER ASSIGNED', description: 'Rider assigned to order' },
  { key: ORDER_STATUS.PICKED_UP, label: 'PICKED UP', description: 'Order picked up by rider' },
  { key: ORDER_STATUS.OUT_FOR_DELIVERY, label: 'OUT FOR DELIVERY', description: 'Rider on the way to doorstep' },
  { key: ORDER_STATUS.ARRIVED, label: 'ARRIVED', description: 'Rider reached customer doorstep' },
  { key: ORDER_STATUS.DELIVERED, label: 'DELIVERED', description: 'Cash collected & OTP verified' }
];

/**
 * Normalizes legacy lowercase or snake_case statuses to canonical uppercase
 */
export const normalizeOrderStatus = (status) => {
  if (!status) return ORDER_STATUS.PENDING;
  const s = String(status).toUpperCase();
  if (s === 'PLACED' || s === 'PENDING') return ORDER_STATUS.PENDING;
  if (s === 'ACCEPTED' || s === 'CONFIRMED') return ORDER_STATUS.ACCEPTED;
  if (s === 'PREPARING') return ORDER_STATUS.PREPARING;
  if (s === 'READY' || s === 'READY_FOR_PICKUP') return ORDER_STATUS.READY;
  if (s === 'ASSIGNED' || s === 'RIDER_ASSIGNED') return ORDER_STATUS.ASSIGNED;
  if (s === 'PICKED_UP') return ORDER_STATUS.PICKED_UP;
  if (s === 'OUT_FOR_DELIVERY') return ORDER_STATUS.OUT_FOR_DELIVERY;
  if (s === 'ARRIVED') return ORDER_STATUS.ARRIVED;
  if (s === 'DELIVERED') return ORDER_STATUS.DELIVERED;
  if (s === 'CANCELLED') return ORDER_STATUS.CANCELLED;
  return s;
};

/**
 * Normalizes payment status
 */
export const normalizePaymentStatus = (status) => {
  if (!status) return PAYMENT_STATUS.PENDING;
  const s = String(status).toUpperCase();
  if (s === 'COLLECTED' || s === 'PAID') return PAYMENT_STATUS.COLLECTED;
  if (s === 'FAILED') return PAYMENT_STATUS.FAILED;
  if (s === 'REFUNDED') return PAYMENT_STATUS.REFUNDED;
  return PAYMENT_STATUS.PENDING;
};

export const normalizeVerificationStatus = (status) => {
  if (!status) return DELIVERY_VERIFICATION_STATUS.OTP_PENDING;
  const s = String(status).toUpperCase();
  if (s === 'OTP_VERIFIED' || s === 'VERIFIED') return DELIVERY_VERIFICATION_STATUS.OTP_VERIFIED;
  return DELIVERY_VERIFICATION_STATUS.OTP_PENDING;
};

/**
 * Customer-facing order status mapper.
 * Internal states like REJECTED are mapped to CANCELLED for the customer.
 */
export const getCustomerOrderStatus = (status) => {
  const norm = normalizeOrderStatus(status);
  if (norm === ORDER_STATUS.REJECTED) {
    return ORDER_STATUS.CANCELLED;
  }
  return norm;
};
