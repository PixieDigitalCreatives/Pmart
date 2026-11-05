'use strict';

const mongoose = require('mongoose');
const crypto = require('crypto');
const { logger } = require('../../utils/logger');

const AuditAction = Object.freeze({
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  ASSIGN: 'ASSIGN',
  SECURITY_ALERT: 'SECURITY_ALERT'
});

const SENSITIVE_KEYS = new Set([
  'password', 'passwordHash', 'token', 'accessToken', 'refreshToken',
  'setupToken', 'resetToken', 'secret', 'secretEnc', 'otp', 'deliveryCode'
]);

function redactSensitive(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactSensitive);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(k) || /password|secret|token|hash|ciphertext/i.test(k)) {
      out[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null) {
      out[k] = redactSensitive(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

const AuditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, default: '' },
    action: { type: String, enum: Object.values(AuditAction), required: true },
    resource: { type: String, required: true },
    resourceId: { type: String },
    reason: { type: String, trim: true, maxlength: 500 },
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
    details: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String, maxlength: 500 },
    requestId: { type: String },
    prevHash: { type: String, default: 'GENESIS' },
    hash: { type: String, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ resource: 1, createdAt: -1 });
AuditLogSchema.index({ user: 1, createdAt: -1 });
AuditLogSchema.index({ hash: 1 });

function computeAuditHash(entry, prevHash = 'GENESIS') {
  const content = `${prevHash}|${entry.user}|${entry.actorRole || ''}|${entry.action}|${entry.resource}|${entry.resourceId || ''}|${JSON.stringify(entry.details || {})}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}

AuditLogSchema.pre('validate', function () {
  if (!this.hash) {
    if (!this.prevHash) this.prevHash = 'GENESIS';
    this.hash = computeAuditHash(this, this.prevHash);
  }
});

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

/** Writes a tamper-evident audit entry. Supports options.session for atomic transaction writes. */
async function recordAudit(req, action, resource, resourceId, details = {}, options = {}) {
  try {
    const last = await AuditLog.findOne().sort({ createdAt: -1 }).select('hash').lean();
    const prevHash = last?.hash || 'GENESIS';

    const userId = req.user ? req.user._id : new mongoose.Types.ObjectId();
    const actorRole = req.user ? req.user.role : 'SYSTEM';

    const cleanDetails = redactSensitive(details);
    const cleanBefore = redactSensitive(options.before);
    const cleanAfter = redactSensitive(options.after);

    const hashPayload = {
      user: userId,
      actorRole,
      action,
      resource,
      resourceId: resourceId ? String(resourceId) : undefined,
      details: cleanDetails
    };

    const hash = computeAuditHash(hashPayload, prevHash);

    const doc = {
      user: userId,
      actorRole,
      action,
      resource,
      resourceId: resourceId ? String(resourceId) : undefined,
      reason: options.reason || undefined,
      before: cleanBefore,
      after: cleanAfter,
      details: cleanDetails,
      ipAddress: req.ip || '',
      userAgent: req.headers ? req.headers['user-agent'] : '',
      requestId: req.headers ? req.headers['x-request-id'] : undefined,
      prevHash,
      hash
    };

    await AuditLog.create([doc], { session: options.session });
  } catch (error) {
    logger.error(`Audit log write failed: ${error.message}`);
  }
}

module.exports = { AuditLog, AuditAction, recordAudit, redactSensitive, computeAuditHash };
