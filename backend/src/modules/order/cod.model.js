'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const CodCollectionStatus = Object.freeze({
  PENDING: 'PENDING',
  COLLECTED: 'COLLECTED',
  REMITTED: 'REMITTED',
  SETTLED: 'SETTLED'
});

const RemittanceStatus = Object.freeze({
  SUBMITTED: 'SUBMITTED',
  VERIFIED: 'VERIFIED',
  DISPUTED: 'DISPUTED'
});

const CodCollectionSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    rider: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    collectedAt: { type: Date, default: Date.now },
    status: { type: String, enum: Object.values(CodCollectionStatus), default: CodCollectionStatus.COLLECTED }
  },
  { timestamps: true }
);

const RiderRemittanceSchema = new Schema(
  {
    rider: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    orders: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
    expectedAmount: { type: Number, required: true, min: 0 },
    remittedAmount: { type: Number, required: true, min: 0 },
    variance: { type: Number, default: 0 },
    varianceReason: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: Object.values(RemittanceStatus), default: RemittanceStatus.SUBMITTED },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date }
  },
  { timestamps: true }
);

CodCollectionSchema.index({ rider: 1, status: 1 });
RiderRemittanceSchema.index({ shop: 1, status: 1, createdAt: -1 });

const CodCollection = mongoose.model('CodCollection', CodCollectionSchema);
const RiderRemittance = mongoose.model('RiderRemittance', RiderRemittanceSchema);

module.exports = {
  CodCollection,
  RiderRemittance,
  CodCollectionStatus,
  RemittanceStatus
};

