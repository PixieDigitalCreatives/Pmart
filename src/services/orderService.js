import apiClient from './apiClient';
import { ORDER_PROGRESSION_STAGES, normalizeOrderStatus } from '../types/orderTypes';

const stageIndex = (status) => ORDER_PROGRESSION_STAGES.findIndex((s) => s.key === status);

/** Builds the customer-facing progress timeline from the order's status history. */
const buildTimeline = (order) => {
  const history = order.statusHistory || [];
  const current = normalizeOrderStatus(order.status);
  const activeIdx = Math.max(0, stageIndex(current));

  return ORDER_PROGRESSION_STAGES.map((stage, idx) => {
    const entry = [...history].reverse().find((h) => h.status === stage.key);
    const reached = idx <= activeIdx;
    const changedAt = reached && entry ? entry.changedAt : null;
    return {
      status: stage.label,
      stageKey: stage.key,
      description: stage.description,
      changedAt,
      time: changedAt
        ? new Date(changedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : idx === activeIdx
          ? 'In progress'
          : reached
            ? 'Done'
            : 'Pending',
      completed: reached,
      current: idx === activeIdx
    };
  });
};

/** Adds convenience fields used across the UI; the API shape itself is unchanged. */
export const mapOrder = (order) => {
  if (!order) return order;
  return {
    ...order,
    id: order._id,
    status: normalizeOrderStatus(order.status),
    timeline: buildTimeline(order),
    itemCount: (order.items || []).reduce((n, i) => n + i.quantity, 0)
  };
};

export const orderService = {
  /** Role-scoped order list: { orders, pagination } */
  async getOrders(params = {}) {
    const res = await apiClient.get('/orders', { params });
    return { orders: (res.data.data || []).map(mapOrder), pagination: res.data.pagination };
  },

  async getOrderById(id) {
    const res = await apiClient.get(`/orders/${id}`);
    return mapOrder(res.data.data);
  },

  /** Places a COD order. The idempotency key must stay the same across retries of one checkout. */
  async checkout({ addressId, items, deliveryInstructions, idempotencyKey }) {
    const res = await apiClient.post('/orders/checkout', {
      addressId,
      items: items.map((i) => ({ product: i.id, quantity: i.quantity })),
      deliveryInstructions: deliveryInstructions || undefined,
      paymentMethod: 'COD',
      idempotencyKey
    });
    return mapOrder(res.data.data);
  },

  async updateStatus(id, status, reason) {
    const res = await apiClient.put(`/orders/${id}/status`, { status, reason: reason || undefined });
    return mapOrder(res.data.data);
  },

  async cancel(id, reason) {
    return this.updateStatus(id, 'CANCELLED', reason);
  },

  async assignRider(id, riderId) {
    const res = await apiClient.post(`/orders/${id}/assign-rider`, { riderId });
    return mapOrder(res.data.data);
  },

  async getDeliveryOtp(id) {
    try {
      const res = await apiClient.get(`/orders/${id}/otp`);
      return res.data.data;
    } catch {
      return null;
    }
  },

  async getTracking(id) {
    const res = await apiClient.get(`/orders/${id}/tracking`);
    return res.data.data;
  },

  async getFleet() {
    const res = await apiClient.get('/rider/fleet');
    return res.data.data;
  }
};
