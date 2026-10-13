import apiClient, { apiErrorMessage } from './apiClient';
import { mapOrder } from './orderService';

const call = async (request) => {
  try {
    const res = await request();
    return { order: mapOrder(res.data.data), message: res.data.message };
  } catch (error) {
    throw new Error(apiErrorMessage(error));
  }
};

/** Rider-side handover steps. Each returns { order, message } or throws an Error with a readable message. */
export const deliveryService = {
  startDeliveryRun: (orderId) => call(() => apiClient.put(`/orders/${orderId}/status`, { status: 'OUT_FOR_DELIVERY' })),
  markArrived: (orderId) => call(() => apiClient.put(`/orders/${orderId}/status`, { status: 'ARRIVED' })),
  markFailed: (orderId, reason) => call(() => apiClient.put(`/orders/${orderId}/status`, { status: 'DELIVERY_FAILED', reason })),
  collectCash: (orderId) => call(() => apiClient.put(`/orders/${orderId}/payment-status`, { paymentStatus: 'COLLECTED' })),
  verifyOtp: (orderId, otp) => call(() => apiClient.post(`/orders/${orderId}/verify-otp`, { otp: String(otp).trim() })),
  regenerateOtp: (orderId) => call(() => apiClient.post(`/orders/${orderId}/resend-otp`)),
  complete: (orderId) => call(() => apiClient.post(`/orders/${orderId}/deliver`))
};
