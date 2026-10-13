'use strict';

const mongoose = require('mongoose');
const { logger } = require('../../utils/logger');

const AuditAction = Object.freeze({
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  ASSIGN: 'ASSIGN'
});

const AuditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: Object.values(AuditAction), required: true },
    resource: { type: String, required: true },
    resourceId: { type: String },
    details: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ resource: 1, createdAt: -1 });
AuditLogSchema.index({ user: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

/** Writes an audit entry. Failures are logged but never break the business operation. */
async function recordAudit(req, action, resource, resourceId, details) {
  try {
    await AuditLog.create({
      user: req.user._id,
      action,
      resource,
      resourceId: resourceId ? String(resourceId) : undefined,
      details,
      ipAddress: req.ip
    });
  } catch (error) {
    logger.error(`Audit log write failed: ${error.message}`);
  }
}

module.exports = { AuditLog, AuditAction, recordAudit };
