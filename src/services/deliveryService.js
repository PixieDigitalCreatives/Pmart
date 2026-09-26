import { orderService } from './orderService';
import { ORDER_STATUS, PAYMENT_STATUS, DELIVERY_VERIFICATION_STATUS } from '../types/orderTypes';

export const deliveryService = {
  /**
   * Rider marks that they have reached the customer doorstep.
   * Order status transitions to ARRIVED.
   */
  async arriveAtCustomer(orderId) {
    const order = await orderService.getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    const updated = await orderService.updateOrderData(orderId, {
      orderStatus: ORDER_STATUS.ARRIVED,
      status: ORDER_STATUS.ARRIVED,
      arrivedAt: new Date().toISOString()
    });

    return updated;
  },

  /**
   * Completes the delivery after verifying all prerequisite conditions:
   * 1. Status is ARRIVED
   * 2. Payment is COLLECTED
   * 3. Delivery OTP is OTP_VERIFIED
   */
  async completeDelivery(orderId) {
    const order = await orderService.getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    if (order.orderStatus !== ORDER_STATUS.ARRIVED && order.status !== ORDER_STATUS.ARRIVED) {
      throw new Error('Rider must arrive at the customer doorstep before completing delivery.');
    }

    if (order.paymentStatus !== PAYMENT_STATUS.COLLECTED) {
      throw new Error('Cash payment must be collected before completing delivery.');
    }

    if (order.deliveryVerificationStatus !== DELIVERY_VERIFICATION_STATUS.OTP_VERIFIED) {
      throw new Error('Customer delivery OTP must be verified before completing delivery.');
    }

    const updated = await orderService.updateOrderData(orderId, {
      orderStatus: ORDER_STATUS.DELIVERED,
      status: ORDER_STATUS.DELIVERED,
      deliveredAt: new Date().toISOString()
    });

    return {
      success: true,
      order: updated,
      message: 'Delivery Completed Successfully.'
    };
  }
};
