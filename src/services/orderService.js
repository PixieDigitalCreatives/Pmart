import { mockOrders } from '../data/mockOrders';

let ordersDatabase = [...mockOrders];

export const orderService = {
  // Get all orders, optionally filtered by status or customer
  async getOrders(filter = {}) {
    let list = [...ordersDatabase];
    if (filter.status && filter.status !== 'all') {
      list = list.filter(o => o.status === filter.status);
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
      // Fallback: return first order if demoing non-existent id
      return ordersDatabase[0];
    }
    return order;
  },

  // Create new order on checkout
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
      status: 'placed',
      deliveryOtp: randomOtp,
      timeline: [
        { status: 'Order Placed', time: 'Just now', completed: true, current: true },
        { status: 'Order Accepted', time: 'Pending', completed: false },
        { status: 'Preparing', time: 'Pending', completed: false },
        { status: 'Ready', time: 'Pending', completed: false },
        { status: 'Rider Assigned', time: 'Pending', completed: false },
        { status: 'Picked Up', time: 'Pending', completed: false },
        { status: 'Out for Delivery', time: 'Pending', completed: false },
        { status: 'Delivered', time: 'Pending', completed: false }
      ],
      items: orderPayload.items,
      billing: orderPayload.billing,
      payment: {
        method: orderPayload.paymentMethod,
        status: orderPayload.paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Paid',
        transactionId: `TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
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
      order.status = newStatus;
      // update timeline
      const statusMap = {
        'placed': 0,
        'accepted': 1,
        'preparing': 2,
        'ready': 3,
        'rider_assigned': 4,
        'picked_up': 5,
        'out_for_delivery': 6,
        'delivered': 7
      };
      const activeIdx = statusMap[newStatus] ?? 0;
      order.timeline.forEach((step, idx) => {
        step.completed = idx <= activeIdx;
        step.current = idx === activeIdx;
      });
      return order;
    }
    throw new Error('Order not found');
  }
};
