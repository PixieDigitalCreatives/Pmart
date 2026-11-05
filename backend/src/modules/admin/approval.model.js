'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const ApprovalAction = Object.freeze({
  INVOICE_DELETE: 'INVOICE_DELETE',
  STAFF_PERMISSION_CHANGE: 'STAFF_PERMISSION_CHANGE',
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',
  BULK_PRODUCT_DELETE: 'BULK_PRODUCT_DELETE',
  COD_WRITEOFF: 'COD_WRITEOFF'
});

const ApprovalStatus = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
});

const ApprovalSchema = new Schema(
  {
    action: { type: String, enum: Object.values(ApprovalAction), required: true, index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requestedByRole: { type: String, required: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    targetId: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: Object.values(ApprovalStatus), default: ApprovalStatus.PENDING, index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNote: { type: String, trim: true, maxlength: 500 }
  },
  { timestamps: true }
);

ApprovalSchema.index({ status: 1, createdAt: -1 });

const Approval = mongoose.model('Approval', ApprovalSchema);

module.exports = { Approval, ApprovalAction, ApprovalStatus };

