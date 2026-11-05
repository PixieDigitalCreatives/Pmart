'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const PolicyType = Object.freeze({
  PRIVACY_POLICY: 'PRIVACY_POLICY',
  TERMS_OF_SERVICE: 'TERMS_OF_SERVICE',
  RETURN_REFUND_POLICY: 'RETURN_REFUND_POLICY',
  CANCELLATION_POLICY: 'CANCELLATION_POLICY',
  SHIPPING_DELIVERY_POLICY: 'SHIPPING_DELIVERY_POLICY'
});

const PolicySchema = new Schema(
  {
    type: { type: String, enum: Object.values(PolicyType), required: true, index: true },
    version: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    effectiveDate: { type: Date, default: Date.now },
    isPublished: { type: Boolean, default: false },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

PolicySchema.index({ type: 1, version: 1 }, { unique: true });

const PolicyAcceptanceSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    policy: { type: Schema.Types.ObjectId, ref: 'Policy', required: true },
    policyType: { type: String, required: true },
    version: { type: String, required: true },
    acceptedAt: { type: Date, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String }
  },
  { timestamps: true }
);

const ConsentRecordSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    purpose: { type: String, required: true },
    status: { type: String, enum: ['GRANTED', 'WITHDRAWN'], default: 'GRANTED' },
    grantedAt: { type: Date, default: Date.now },
    withdrawnAt: { type: Date },
    version: { type: String, default: '1.0' }
  },
  { timestamps: true }
);

const GrievanceStatus = Object.freeze({
  OPEN: 'OPEN',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED'
});

const GrievanceTicketSchema = new Schema(
  {
    ticketNumber: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    subject: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 2000 },
    category: { type: String, enum: ['DELIVERY', 'QUALITY', 'PAYMENT', 'RETURN', 'OTHER'], default: 'OTHER' },
    status: { type: String, enum: Object.values(GrievanceStatus), default: GrievanceStatus.OPEN, index: true },
    acknowledgedAt: { type: Date },
    resolvedAt: { type: Date },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    resolutionNotes: { type: String }
  },
  { timestamps: true }
);

const DataRequestSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['ACCESS', 'CORRECTION', 'ERASURE'], required: true },
    status: { type: String, enum: ['SUBMITTED', 'IN_REVIEW', 'COMPLETED', 'REJECTED'], default: 'SUBMITTED' },
    requestDetails: { type: String, maxlength: 1000 },
    completedAt: { type: Date },
    notes: { type: String }
  },
  { timestamps: true }
);

const Policy = mongoose.model('Policy', PolicySchema);
const PolicyAcceptance = mongoose.model('PolicyAcceptance', PolicyAcceptanceSchema);
const ConsentRecord = mongoose.model('ConsentRecord', ConsentRecordSchema);
const GrievanceTicket = mongoose.model('GrievanceTicket', GrievanceTicketSchema);
const DataRequest = mongoose.model('DataRequest', DataRequestSchema);

module.exports = {
  Policy,
  PolicyAcceptance,
  ConsentRecord,
  GrievanceTicket,
  DataRequest,
  PolicyType,
  GrievanceStatus
};

