'use strict';

const mongoose = require('mongoose');
const { E164_REGEX } = require('../../utils/auth');

const { Schema } = mongoose;

const UserRole = Object.freeze({
  CUSTOMER: 'CUSTOMER',
  RIDER: 'RIDER',
  SHOP_OWNER: 'SHOP_OWNER',
  EMPLOYEE: 'EMPLOYEE',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN'
});

const AuthProvider = Object.freeze({
  PHONE: 'PHONE',
  GOOGLE: 'GOOGLE'
});

/** Permission strings an EMPLOYEE can be granted. ADMIN implicitly has all of them. */
const PERMISSIONS = Object.freeze([
  'dashboard.read',
  'orders.read',
  'orders.manage',
  'reports.read',
  'customers.read',
  'customers.pii',
  'riders.read',
  'riders.manage',
  'shops.manage',
  'employees.manage',
  'settings.read',
  'settings.manage',
  'catalog.manage',
  'catalog.delete',
  'catalog.import',
  'images.verify',
  'inventory.read',
  'inventory.restock',
  'inventory.adjust',
  'inventory.negative_stock',
  'invoices.create',
  'invoices.read',
  'invoices.cancel',
  'billing.price_override',
  'payments.record',
  'payments.read',
  'audit.read',
  'security.manage',
  'approvals.review',
  'cod.reconcile',
  'settlements.manage',
  'grievances.manage',
  'policies.manage',
  'privacy.requests'
]);

/** One-click permission sets for employee presets (§5 of Security & Compliance Audit). */
const STORE_MANAGER_PERMISSIONS = Object.freeze([
  'dashboard.read',
  'inventory.read',
  'inventory.restock',
  'invoices.create',
  'invoices.read',
  'payments.record',
  'payments.read'
]);

const OPERATIONS_ADMIN_PERMISSIONS = Object.freeze([
  'dashboard.read',
  'orders.read',
  'orders.manage',
  'riders.read',
  'riders.manage',
  'shops.manage',
  'customers.read'
]);

const WAREHOUSE_STAFF_PERMISSIONS = Object.freeze([
  'dashboard.read',
  'inventory.read',
  'inventory.restock',
  'inventory.adjust'
]);

const FINANCE_MANAGER_PERMISSIONS = Object.freeze([
  'dashboard.read',
  'payments.record',
  'payments.read',
  'invoices.read',
  'reports.read',
  'cod.reconcile',
  'settlements.manage'
]);

const CUSTOMER_SUPPORT_PERMISSIONS = Object.freeze([
  'orders.read',
  'customers.read',
  'grievances.manage'
]);

const AUDITOR_PERMISSIONS = Object.freeze([
  'reports.read',
  'audit.read',
  'invoices.read',
  'inventory.read',
  'policies.manage'
]);

const stringOnly = (field) => ({ [field]: { $type: 'string' } });

const UserSchema = new Schema(
  {
    phone: { type: String, trim: true, match: [E164_REGEX, 'Phone must be in E.164 format'] },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    googleId: { type: String },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    name: { type: String, trim: true, maxlength: 100 },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.CUSTOMER, required: true },
    staffRole: { type: String, default: null },
    permissions: { type: [{ type: String, enum: PERMISSIONS }], default: [] },
    authProvider: { type: String, enum: Object.values(AuthProvider), default: AuthProvider.PHONE },
    profileComplete: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 1 },
    failedLogins: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    passwordChangedAt: { type: Date },
    mfa: {
      enabled: { type: Boolean, default: false },
      secretEnc: { type: String, select: false },
      pendingSecretEnc: { type: String, select: false },
      enabledAt: { type: Date },
      recoveryCodeHashes: { type: [String], select: false, default: [] }
    },
    passwordHash: { type: String, select: false },
    refreshTokenHash: { type: String, select: false },
    setupTokenHash: { type: String, select: false },
    setupTokenExpires: { type: Date, select: false },
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
    lastLoginAt: { type: Date }
  },
  { timestamps: true }
);

// Partial (not sparse) unique indexes: documents without the field — or with null — never collide.
UserSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: stringOnly('phone') });
UserSchema.index({ email: 1 }, { unique: true, partialFilterExpression: stringOnly('email') });
UserSchema.index({ googleId: 1 }, { unique: true, partialFilterExpression: stringOnly('googleId') });
UserSchema.index({ refreshTokenHash: 1 }, { partialFilterExpression: stringOnly('refreshTokenHash') });
UserSchema.index({ setupTokenHash: 1 }, { partialFilterExpression: stringOnly('setupTokenHash') });
UserSchema.index({ resetTokenHash: 1 }, { partialFilterExpression: stringOnly('resetTokenHash') });
UserSchema.index({ role: 1, isActive: 1, createdAt: -1 });

const User = mongoose.model('User', UserSchema);

module.exports = {
  User,
  UserRole,
  AuthProvider,
  PERMISSIONS,
  STORE_MANAGER_PERMISSIONS,
  OPERATIONS_ADMIN_PERMISSIONS,
  WAREHOUSE_STAFF_PERMISSIONS,
  FINANCE_MANAGER_PERMISSIONS,
  CUSTOMER_SUPPORT_PERMISSIONS,
  AUDITOR_PERMISSIONS
};
