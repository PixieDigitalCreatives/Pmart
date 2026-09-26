import { orderService } from './orderService';
import { PAYMENT_STATUS } from '../types/orderTypes';

export const paymentService = {
  /**
   * Fetch current payment status for an order
   */
  async getPaymentStatus(orderId) {
    const order = await orderService.getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    return {
      orderId: order.id,
      paymentMethod: order.paymentMethod || 'COD',
      paymentStatus: order.paymentStatus || PAYMENT_STATUS.PENDING,
      amount: order.billing?.grandTotal || 0,
      currency: 'INR'
    };
  },

  /**
   * Mark cash payment collected by the rider upon reaching customer.
   * CRITICAL: Does NOT mark delivery as complete!
   */
  async markPaymentCollected(orderId) {
    const order = await orderService.getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    // Prevent duplicate events
    if (order.paymentStatus === PAYMENT_STATUS.COLLECTED) {
      return { success: true, order, alreadyCollected: true };
    }

    const updated = await orderService.updateOrderData(orderId, {
      paymentStatus: PAYMENT_STATUS.COLLECTED,
      payment: {
        ...(order.payment || {}),
        status: PAYMENT_STATUS.COLLECTED,
        collectedAt: new Date().toISOString()
      }
    });

    return {
      success: true,
      order: updated,
      message: 'Cash payment marked as COLLECTED successfully.'
    };
  }
};
