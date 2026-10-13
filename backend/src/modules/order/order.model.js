'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const OrderStatus = Object.freeze({
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
});

const PaymentMethod = Object.freeze({ COD: 'COD' });

const PaymentStatus = Object.freeze({
  PENDING: 'PENDING',
  COLLECTED: 'COLLECTED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
});

const DeliveryVerification = Object.freeze({
  PENDING: 'PENDING',
  OTP_VERIFIED: 'OTP_VERIFIED'
});

const ActorRole = Object.freeze(['CUSTOMER', 'SHOP_OWNER', 'RIDER', 'EMPLOYEE', 'ADMIN', 'SYSTEM']);

const OrderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    unit: { type: String },
    imageUrl: { type: String },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, min: 0 },
    quantity: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const StatusHistorySchema = new Schema(
  {
    status: { type: String, enum: Object.values(OrderStatus), required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String, enum: ActorRole },
    note: { type: String, maxlength: 300 }
  },
  { _id: false }
);

// Immutable snapshot of the customer's address at checkout time.
const DeliveryAddressSchema = new Schema(
  {
    recipientName: { type: String, required: true },
    recipientPhone: { type: String, required: true },
    label: { type: String },
    houseNumber: { type: String },
    buildingName: { type: String },
    floor: { type: String },
    street: { type: String },
    area: { type: String },
    landmark: { type: String },
    city: { type: String, required: true },
    district: { type: String },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String },
    formattedAddress: { type: String },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true } // [lng, lat]
    }
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    rider: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    items: {
      type: [OrderItemSchema],
      validate: { validator: (items) => items.length > 0, message: 'Order must have at least one item' }
    },
    subTotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    platformFee: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: Object.values(OrderStatus), default: OrderStatus.PENDING },
    deliveryAddress: { type: DeliveryAddressSchema, required: true },
    deliveryInstructions: { type: String, trim: true, maxlength: 300 },
    paymentMethod: { type: String, enum: Object.values(PaymentMethod), default: PaymentMethod.COD },
    paymentStatus: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.PENDING },
    paymentCollectedAt: { type: Date },
    paymentCollectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deliveryVerificationStatus: { type: String, enum: Object.values(DeliveryVerification), default: DeliveryVerification.PENDING },
    encryptedOtp: { type: String, select: false },
    deliveryOtpHash: { type: String, select: false },
    deliveryOtpExpiry: { type: Date },
    deliveryOtpAttempts: { type: Number, default: 0 },
    idempotencyKey: { type: String, maxlength: 100 },
    // Guards against restocking the same order twice.
    inventoryRestored: { type: Boolean, default: false },
    tracking: {
      lat: { type: Number },
      lng: { type: Number },
      updatedAt: { type: Date }
    },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    acceptedAt: { type: Date },
    readyAt: { type: Date },
    assignedAt: { type: Date },
    pickedUpAt: { type: Date },
    outForDeliveryAt: { type: Date },
    arrivedAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, maxlength: 300 }
  },
  { timestamps: true }
);

OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ customer: 1, createdAt: -1 });
OrderSchema.index({ shop: 1, createdAt: -1 });
OrderSchema.index({ rider: 1, status: 1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index(
  { customer: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

const Order = mongoose.model('Order', OrderSchema);

const TERMINAL_STATUSES = Object.freeze([OrderStatus.DELIVERED, OrderStatus.REJECTED, OrderStatus.CANCELLED]);

const ACTIVE_DELIVERY_STATUSES = Object.freeze([
  OrderStatus.ASSIGNED,
  OrderStatus.PICKED_UP,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.ARRIVED,
  OrderStatus.DELIVERY_FAILED
]);

module.exports = {
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  DeliveryVerification,
  TERMINAL_STATUSES,
  ACTIVE_DELIVERY_STATUSES
};
