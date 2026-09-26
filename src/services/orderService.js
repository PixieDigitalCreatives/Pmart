import { mockOrders } from '../data/mockOrders';
import {
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  DELIVERY_VERIFICATION_STATUS,
  ORDER_PROGRESSION_STAGES,
  normalizeOrderStatus
} from '../types/orderTypes';

let ordersDatabase = [...mockOrders];

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

export const orderService = {
  // Get all orders, optionally filtered by status or customer
  async getOrders(filter = {}) {
    let list = [...ordersDatabase];
    if (filter.status && filter.status !== 'all') {
      const targetNorm = normalizeOrderStatus(filter.status);
      list = list.filter(o => normalizeOrderStatus(o.status || o.orderStatus) === targetNorm);
    }
    if (filter.customerId) {
      list = list.filter(o => o.customer.id === filter.customerId);
    }
    return list;
  },

  // Get single order with detailed timeline and items
  async getOrderById(id) {
    const order = ordersDatabase.find(o => o.id === id);
    if (!order) {
      return ordersDatabase[0];
    }
    // Ensure all required fields exist
    if (!order.orderStatus) order.orderStatus = normalizeOrderStatus(order.status);
    if (!order.paymentMethod) order.paymentMethod = PAYMENT_METHOD.COD;
    if (!order.paymentStatus) {
      order.paymentStatus = (order.payment?.status === 'Paid' || order.status === 'delivered')
        ? PAYMENT_STATUS.COLLECTED
        : PAYMENT_STATUS.PENDING;
    }
    if (!order.deliveryVerificationStatus) {
      order.deliveryVerificationStatus = (order.status === 'delivered')
        ? DELIVERY_VERIFICATION_STATUS.OTP_VERIFIED
        : DELIVERY_VERIFICATION_STATUS.OTP_PENDING;
    }
    return order;
  },

  // Alias for getOrderById
  async getOrder(id) {
    return this.getOrderById(id);
  },

  // Create new order on checkout (COD only)
  async createOrder(orderPayload) {
    const newId = `PM-${Math.floor(10000 + Math.random() * 90000)}`;
    const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const newOrder = {
      id: newId,
      createdAt: new Date().toISOString(),
      customer: orderPayload.customer || {
        id: 'cust-1',
        name: 'Rohan Sharma',
        phone: '+91 98765 43210',
        email: 'rohan.sharma@example.com'
      },
      shop: {
        id: 'shop-101',
        name: 'PMart Darkstore Hub — Sector 62',
        address: 'Plot B-4, Sector 62, Noida, UP 201309'
      },
      deliveryAddress: orderPayload.deliveryAddress,
      deliveryInstructions: orderPayload.deliveryInstructions || '',
      rider: {
        id: 'rider-201',
        name: 'Vikram Singh',
        phone: '+91 98112 34567',
        vehicleNumber: 'UP 16 AX 4492',
        vehicleType: 'Electric Scooter (Hero Electric)',
        rating: 4.9,
        deliveriesCompleted: 1421
      },
      orderStatus: ORDER_STATUS.PLACED,
      status: ORDER_STATUS.PLACED,
      paymentMethod: PAYMENT_METHOD.COD,
      paymentStatus: PAYMENT_STATUS.PENDING,
      deliveryVerificationStatus: DELIVERY_VERIFICATION_STATUS.OTP_PENDING,
      deliveryOtp: randomOtp,
      timeline: createStandardTimeline(ORDER_STATUS.PLACED),
      items: orderPayload.items,
      billing: orderPayload.billing,
      payment: {
        method: 'Cash on Delivery',
        paymentMethod: PAYMENT_METHOD.COD,
        status: PAYMENT_STATUS.PENDING,
        transactionId: `COD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
      },
      estimatedDeliveryTime: '10–12 mins'
    };

    ordersDatabase.unshift(newOrder);
    return newOrder;
  },

  // Update status (e.g. for Shop and Rider portal interactions)
  async updateOrderStatus(id, newStatus) {
    const order = ordersDatabase.find(o => o.id === id);
    if (order) {
      const canonicalStatus = normalizeOrderStatus(newStatus);
      order.orderStatus = canonicalStatus;
      order.status = canonicalStatus;
      order.timeline = createStandardTimeline(canonicalStatus);
      return order;
    }
    throw new Error('Order not found');
  },

  // Update arbitrary partial fields on an order
  async updateOrderData(id, partialData) {
    const order = ordersDatabase.find(o => o.id === id);
    if (order) {
      Object.assign(order, partialData);
      if (partialData.orderStatus || partialData.status) {
        const canonical = normalizeOrderStatus(partialData.orderStatus || partialData.status);
        order.orderStatus = canonical;
        order.status = canonical;
        order.timeline = createStandardTimeline(canonical);
      }
      return order;
    }
    throw new Error('Order not found');
  }
};
