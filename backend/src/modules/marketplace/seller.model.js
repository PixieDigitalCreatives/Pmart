'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const SellerStatus = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  SUSPENDED: 'SUSPENDED'
});

const SettlementStatus = Object.freeze({
  CALCULATED: 'CALCULATED',
  APPROVED: 'APPROVED',
  PAID: 'PAID'
});

const SellerSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, required: true, trim: true, maxlength: 150 },
    gstin: { type: String, trim: true, uppercase: true },
    pan: { type: String, trim: true, uppercase: true },
    commissionRate: { type: Number, default: 5.0, min: 0, max: 100 },
    tcsRate: { type: Number, default: 1.0, min: 0, max: 10 },
    status: { type: String, enum: Object.values(SellerStatus), default: SellerStatus.PENDING, index: true },
    bankDetailsEnc: { type: String, select: false }
  },
  { timestamps: true }
);

const SellerSettlementSchema = new Schema(
  {
    seller: { type: Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    grossSales: { type: Number, required: true, min: 0 },
    commissionAmount: { type: Number, required: true, min: 0 },
    tcsAmount: { type: Number, required: true, min: 0 },
    netPayout: { type: Number, required: true },
    status: { type: String, enum: Object.values(SettlementStatus), default: SettlementStatus.CALCULATED, index: true },
    payoutReference: { type: String },
    paidAt: { type: Date }
  },
  { timestamps: true }
);

const Seller = mongoose.model('Seller', SellerSchema);
const SellerSettlement = mongoose.model('SellerSettlement', SellerSettlementSchema);

module.exports = {
  Seller,
  SellerSettlement,
  SellerStatus,
  SettlementStatus
};

