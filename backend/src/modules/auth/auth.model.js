'use strict';

const mongoose = require('mongoose');
const { E164_REGEX } = require('../../utils/auth');

const { Schema } = mongoose;

const UserRole = Object.freeze({
  CUSTOMER: 'CUSTOMER',
  RIDER: 'RIDER',
  SHOP_OWNER: 'SHOP_OWNER',
  EMPLOYEE: 'EMPLOYEE',
  ADMIN: 'ADMIN'
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
  'riders.read',
  'riders.manage',
  'shops.manage',
  'employees.manage',
  'settings.read',
  'settings.manage',
  'catalog.manage'
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
    permissions: { type: [{ type: String, enum: PERMISSIONS }], default: [] },
    authProvider: { type: String, enum: Object.values(AuthProvider), default: AuthProvider.PHONE },
    profileComplete: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    passwordHash: { type: String, select: false },
    refreshTokenHash: { type: String, select: false },
    setupTokenHash: { type: String, select: false },
    setupTokenExpires: { type: Date, select: false },
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
UserSchema.index({ role: 1, isActive: 1, createdAt: -1 });

const User = mongoose.model('User', UserSchema);

module.exports = { User, UserRole, AuthProvider, PERMISSIONS };
