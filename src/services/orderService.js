import apiClient from './apiClient';
import {
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  DELIVERY_VERIFICATION_STATUS,
  ORDER_PROGRESSION_STAGES,
  normalizeOrderStatus
} from '../types/orderTypes';

const createStandardTimeline = (currentStatus = ORDER_STATUS.PLACED) => {
  const normCurrent = normalizeOrderStatus(currentStatus);
  const statusOrder = [
    ORDER_STATUS.PLACED,
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.PREPARING,
    ORDER_STATUS.READY_FOR_PICKUP,
    ORDER_STATUS.OUT_FOR_DELIVERY,
    ORDER_STATUS.ARRIVED,
    ORDER_STATUS.DELIVERED
  ];
  const activeIdx = Math.max(0, statusOrder.indexOf(normCurrent));

  return ORDER_PROGRESSION_STAGES.map((stage, idx) => ({
    status: stage.label,
    stageKey: stage.key,
    time: idx < activeIdx ? 'Completed' : idx === activeIdx ? 'Just now' : 'Pending',
    completed: idx <= activeIdx,
    current: idx === activeIdx
  }));
};

const mapBackendOrderToFrontend = (order) => {
  if (!order) return order;
  
  const history = order.statusHistory || [];
  const currentStatusNorm = normalizeOrderStatus(order.status);
  const statusOrder = ORDER_PROGRESSION_STAGES.map(s => s.key);
  const activeIdx = Math.max(0, statusOrder.indexOf(currentStatusNorm));

  const standardTimeline = ORDER_PROGRESSION_STAGES.map((stage, idx) => {
    // Find matching history entry from backend
    const h = history.find(entry => normalizeOrderStatus(entry.status) === stage.key);
    
    let timeDisplay = 'Pending';
    let changedAt = null;
    let isCompleted = false;
    let isCurrent = idx === activeIdx;

    if (h && h.changedAt) {
      isCompleted = true;
      const d = new Date(h.changedAt);
      if (!Number.isNaN(d.getTime())) {
        timeDisplay = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        changedAt = h.changedAt;
      } else {
        timeDisplay = 'Completed';
      }
    } else if (idx < activeIdx) {
      // It was skipped in history, but we are past it.
      isCompleted = true;
      timeDisplay = 'Completed';
    }

    if (isCurrent && !changedAt) {
      timeDisplay = 'In progress';
    }

    // STRICT FIX: Never mark a future state as completed or show a time for it
    if (idx > activeIdx) {
      isCompleted = false;
      isCurrent = false;
      timeDisplay = 'Pending';
      changedAt = null;
    }

    return {
      status: stage.label,
      stageKey: stage.key,
      time: timeDisplay,
      changedAt: changedAt,
      completed: isCompleted || isCurrent,
      current: isCurrent
    };
  });

  const mapped = {
    ...order,
    id: order._id,
    orderNumber: order.orderNumber,
    orderStatus: currentStatusNorm,
    timeline: standardTimeline,
    paymentStatus: order.paymentStatus || PAYMENT_STATUS.PENDING,
    paymentMethod: order.paymentMethod || PAYMENT_METHOD.COD,
    deliveryVerificationStatus: (order.status === 'DELIVERED') 
        ? DELIVERY_VERIFICATION_STATUS.OTP_VERIFIED
        : DELIVERY_VERIFICATION_STATUS.OTP_PENDING,
  };
  return mapped;
};

export const orderService = {
  // Get all orders, optionally filtered by status or customer
  async getOrders(filter = {}) {
    const res = await apiClient.get('/orders');
    let list = (res.data.data || []).map(mapBackendOrderToFrontend);
    
    if (filter.status && filter.status !== 'all') {
      const targetNorm = normalizeOrderStatus(filter.status);
      list = list.filter(o => normalizeOrderStatus(o.status || o.orderStatus) === targetNorm);
    }
    if (filter.customerId) {
      list = list.filter(o => o.customer === filter.customerId || (o.customer && o.customer._id === filter.customerId));
    }
    return list;
  },

  // Get single order with detailed timeline and items
  async getOrderById(id) {
    const res = await apiClient.get(`/orders/${id}`);
    return mapBackendOrderToFrontend(res.data.data);
  },

  // Alias for getOrderById
  async getOrder(id) {
    return this.getOrderById(id);
  },

  // Create new order on checkout (COD only)
  async createOrder(orderPayload) {
    const formattedItems = orderPayload.items.map(item => ({
      product: item.id,
      quantity: item.quantity,
      shop: item.shop || null
    }));

    const payload = {
      items: formattedItems,
      addressId: orderPayload.addressId,
      deliveryAddress: orderPayload.deliveryAddress,
      deliveryInstructions: orderPayload.deliveryInstructions,
      paymentMethod: orderPayload.paymentMethod || 'COD',
      idempotencyKey: `idemp-${Date.now()}`
    };

    const res = await apiClient.post('/orders/checkout', payload);
    return mapBackendOrderToFrontend(res.data.data);
  },

  // Update status (e.g. for Shop and Rider portal interactions)
  async updateOrderStatus(id, newStatus) {
    const canonicalStatus = normalizeOrderStatus(newStatus);
    const res = await apiClient.put(`/orders/${id}/status`, { status: canonicalStatus });
    return mapBackendOrderToFrontend(res.data.data);
  },

  // Update arbitrary partial fields on an order
  async updateOrderData(id, partialData) {
    if (partialData.orderStatus || partialData.status) {
      return this.updateOrderStatus(id, partialData.orderStatus || partialData.status);
    }
    throw new Error('Partial update not fully supported in backend for other fields');
  },

  // Fetch decrypted OTP for customer
  async getDeliveryOtp(id) {
    try {
      const res = await apiClient.get(`/orders/${id}/otp`);
      return res.data?.data?.deliveryOtp;
    } catch (e) {
      console.error('Failed to get OTP', e);
      return null;
    }
  }
};
