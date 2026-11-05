'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const PaymentIntentStatus = Object.freeze({
  CREATED: 'CREATED',
  PROCESSING: 'PROCESSING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
});

const PaymentIntentSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    provider: { type: String, enum: ['COD', 'RAZORPAY', 'CASHFREE'], default: 'COD' },
    providerOrderId: { type: String },
    status: { type: String, enum: Object.values(PaymentIntentStatus), default: PaymentIntentStatus.CREATED, index: true },
    idempotencyKey: { type: String, required: true, unique: true }
  },
  { timestamps: true }
);

const PaymentEventSchema = new Schema(
  {
    provider: { type: String, required: true },
    eventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    signature: { type: String },
    processed: { type: Boolean, default: false },
    processedAt: { type: Date }
  },
  { timestamps: true }
);

const PaymentIntent = mongoose.model('PaymentIntent', PaymentIntentSchema);
const PaymentEvent = mongoose.model('PaymentEvent', PaymentEventSchema);

module.exports = {
  PaymentIntent,
  PaymentEvent,
  PaymentIntentStatus
};

