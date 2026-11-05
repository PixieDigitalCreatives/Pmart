'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { env } = require('../../config/env');
const { User, UserRole, AuthProvider } = require('./auth.model');
const { Session } = require('./session.model');
const { signAccessToken } = require('../../utils/jwt');
const { hashPassword, verifyPassword, hashToken, DUMMY_PASSWORD_HASH, validatePasswordStrength } = require('../../utils/auth');
const { generateTotpSecret, generateTotp, verifyTotp, generateRecoveryCodes, encryptSecret, decryptSecret, base32Decode } = require('../../utils/totp');
const { getFirebaseAuth } = require('../../config/firebase-admin');
const { HttpError, unauthorized, conflict, badRequest, notFound } = require('../../utils/http-error');

const INVALID_CREDENTIALS = 'Invalid mobile number or password';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_TTL_MS = 7 * 24 * 3600 * 1000; // 7 days

const socketTickets = new Map();

class AuthService {
  static signAccessToken(userId, tokenVersion = 1) {
    return signAccessToken(userId, tokenVersion);
  }

  /** Issues a new access/refresh pair and stores the session with family tracking. */
  static async issueSession(user, req = null, existingFamily = null) {
    const tokenVersion = user.tokenVersion || 1;
    const accessToken = this.signAccessToken(user._id, tokenVersion);
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const hashedRefresh = hashToken(refreshToken);
    const family = existingFamily || crypto.randomUUID();

    try {
      await Session.create({
        user: user._id,
        refreshTokenHash: hashedRefresh,
        family,
        userAgent: req?.headers ? req.headers['user-agent'] || '' : '',
        ip: req?.ip || '',
        expiresAt: new Date(Date.now() + SESSION_TTL_MS)
      });
    } catch {
      // Non-fatal if session creation encounters transient issue, user record is authoritative backup
    }

    await User.updateOne(
      { _id: user._id },
      { $set: { refreshTokenHash: hashedRefresh, lastLoginAt: new Date() } }
    );

    return { accessToken, refreshToken };
  }

  static toPublicUser(user) {
    return {
      id: String(user._id),
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
      role: user.role,
      permissions: user.role === UserRole.EMPLOYEE ? user.permissions || [] : [],
      authProvider: user.authProvider,
      isActive: user.isActive,
      profileComplete: user.profileComplete,
      mustChangePassword: user.mustChangePassword
    };
  }

  static async registerCustomer({ name, phone, password }, req = null) {
    if (await User.exists({ phone })) {
      throw conflict('This mobile number is already registered. Please sign in.', 'PHONE_TAKEN');
    }
    const check = validatePasswordStrength(password, phone);
    if (!check.valid) {
      throw badRequest(check.message, 'WEAK_PASSWORD');
    }

    const user = await User.create({
      name,
      phone,
      passwordHash: await hashPassword(password),
      role: UserRole.CUSTOMER,
      authProvider: AuthProvider.PHONE,
      profileComplete: true,
      tokenVersion: 1
    });
    return { user, ...(await this.issueSession(user, req)) };
  }

  static async login({ phone, password }, req = null) {
    const user = await User.findOne({ phone }).select('+passwordHash');

    // Constant-time compare if user does not exist
    if (!user || !user.passwordHash) {
      await verifyPassword(password, DUMMY_PASSWORD_HASH);
      throw unauthorized(INVALID_CREDENTIALS, 'INVALID_CREDENTIALS');
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMins = Math.max(1, Math.ceil((user.lockedUntil - Date.now()) / 60000));
      throw unauthorized(
        `Account temporarily locked due to too many failed attempts. Try again in ${remainingMins} minute(s).`,
        'ACCOUNT_LOCKED'
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      user.failedLogins = (user.failedLogins || 0) + 1;
      if (user.failedLogins >= MAX_FAILED_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        await user.save();
        throw unauthorized(
          'Account temporarily locked due to too many failed attempts. Try again in 15 minutes.',
          'ACCOUNT_LOCKED'
        );
      }
      await user.save();
      throw unauthorized(INVALID_CREDENTIALS, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) throw unauthorized('This account has been deactivated', 'ACCOUNT_DEACTIVATED');

    // Reset lockout counters on success
    if (user.failedLogins > 0 || user.lockedUntil) {
      user.failedLogins = 0;
      user.lockedUntil = null;
      await user.save();
    }

    if (user.mfa && user.mfa.enabled) {
      const mfaTicket = jwt.sign({ id: String(user._id), mfa: true }, env.JWT_SECRET, { expiresIn: '5m' });
      return { mfaRequired: true, mfaTicket, user };
    }

    return { user, ...(await this.issueSession(user, req)) };
  }

  static async googleLogin(idToken, req = null) {
    const firebaseAuth = getFirebaseAuth();
    if (!firebaseAuth) {
      throw new HttpError(503, 'Google sign-in is not configured on this server', 'GOOGLE_NOT_CONFIGURED');
    }

    let decoded;
    try {
      decoded = await firebaseAuth.verifyIdToken(idToken);
    } catch {
      throw unauthorized('Google sign-in could not be verified', 'GOOGLE_TOKEN_INVALID');
    }

    const { uid, name } = decoded;
    const email = decoded.email ? decoded.email.toLowerCase() : undefined;

    let user = await User.findOne({ googleId: uid });
    if (!user && email && decoded.email_verified) {
      user = await User.findOne({ email });
      if (user) {
        user.googleId = uid;
        user.emailVerified = true;
        await user.save();
      }
    }

    if (!user) {
      user = await User.create({
        googleId: uid,
        email: decoded.email_verified ? email : undefined,
        emailVerified: Boolean(decoded.email_verified),
        name: name || '',
        role: UserRole.CUSTOMER,
        authProvider: AuthProvider.GOOGLE,
        profileComplete: false,
        tokenVersion: 1
      });
    }

    if (!user.isActive) throw unauthorized('This account has been deactivated', 'ACCOUNT_DEACTIVATED');
    return { user, ...(await this.issueSession(user, req)) };
  }

  static async completeProfile(userId, { name, phone, password }) {
    if (await User.exists({ phone, _id: { $ne: userId } })) {
      throw conflict('This mobile number is already associated with another account', 'PHONE_TAKEN');
    }
    const check = validatePasswordStrength(password, phone);
    if (!check.valid) throw badRequest(check.message, 'WEAK_PASSWORD');

    const user = await User.findById(userId);
    if (!user) throw notFound('User not found');
    user.name = name;
    user.phone = phone;
    user.passwordHash = await hashPassword(password);
    user.profileComplete = true;
    await user.save();
    return user;
  }

  static async activateAccount(token, password) {
    const user = await User.findOne({ setupTokenHash: hashToken(token) }).select('+setupTokenExpires');
    if (!user || !user.setupTokenExpires || user.setupTokenExpires < new Date()) {
      throw badRequest('This setup link is invalid or has expired', 'SETUP_TOKEN_INVALID');
    }
    const check = validatePasswordStrength(password, user.phone);
    if (!check.valid) throw badRequest(check.message, 'WEAK_PASSWORD');

    user.passwordHash = await hashPassword(password);
    user.setupTokenHash = undefined;
    user.setupTokenExpires = undefined;
    user.mustChangePassword = false;
    user.profileComplete = true;
    user.tokenVersion = (user.tokenVersion || 1) + 1;
    await user.save();
    return user;
  }

  static async refresh(refreshToken, req = null) {
    const hashed = hashToken(refreshToken);
    const session = await Session.findOne({ refreshTokenHash: hashed });

    if (session) {
      if (session.isRevoked) {
        // Token reuse / theft detected: revoke all sessions in this family immediately!
        await Session.updateMany({ family: session.family }, { isRevoked: true });
        throw unauthorized('Session revoked due to token reuse detection', 'REFRESH_REVOKED');
      }

      session.isRevoked = true;
      await session.save();

      const user = await User.findById(session.user);
      if (!user || !user.isActive) throw unauthorized('Invalid refresh token', 'REFRESH_INVALID');

      return { user, ...(await this.issueSession(user, req, session.family)) };
    }

    // Fallback to User.refreshTokenHash for backwards compatibility
    const user = await User.findOne({ refreshTokenHash: hashed });
    if (!user || !user.isActive) throw unauthorized('Invalid refresh token', 'REFRESH_INVALID');
    return { user, ...(await this.issueSession(user, req)) };
  }

  static async changePassword(userId, currentPassword, newPassword, req = null) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) throw notFound('User not found');
    if (!user.passwordHash || !(await verifyPassword(currentPassword, user.passwordHash))) {
      throw badRequest('Current password is incorrect', 'WRONG_PASSWORD');
    }
    if (currentPassword === newPassword) {
      throw badRequest('New password must be different from the current password', 'PASSWORD_REUSED');
    }
    const check = validatePasswordStrength(newPassword, user.phone);
    if (!check.valid) throw badRequest(check.message, 'WEAK_PASSWORD');

    user.passwordHash = await hashPassword(newPassword);
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();
    user.tokenVersion = (user.tokenVersion || 1) + 1;
    await user.save();

    // Revoke all existing sessions
    await Session.updateMany({ user: userId }, { isRevoked: true });

    return { user, ...(await this.issueSession(user, req)) };
  }

  static async logout(userId, refreshToken = null) {
    if (refreshToken) {
      await Session.updateOne({ refreshTokenHash: hashToken(refreshToken) }, { isRevoked: true });
    } else {
      await Session.updateMany({ user: userId }, { isRevoked: true });
    }
    await User.updateOne({ _id: userId }, { $unset: { refreshTokenHash: 1 } });
  }

  static async listSessions(userId, currentRefreshToken = null) {
    const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;
    const sessions = await Session.find({
      user: userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    })
      .sort({ lastActiveAt: -1 })
      .lean();

    return sessions.map((s) => ({
      id: String(s._id),
      userAgent: s.userAgent,
      ip: s.ip,
      lastActiveAt: s.lastActiveAt,
      createdAt: s.createdAt,
      isCurrent: Boolean(currentHash && s.refreshTokenHash === currentHash)
    }));
  }

  static async revokeOtherSessions(userId, currentRefreshToken = null) {
    const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;
    const filter = { user: userId, isRevoked: false };
    if (currentHash) {
      filter.refreshTokenHash = { $ne: currentHash };
    }
    await Session.updateMany(filter, { isRevoked: true });
  }

  static async revokeAllSessions(userId) {
    await Session.updateMany({ user: userId }, { isRevoked: true });
    await User.updateOne(
      { _id: userId },
      { $inc: { tokenVersion: 1 }, $unset: { refreshTokenHash: 1 } }
    );
  }

  /** Creates a single-use password reset token for any role (admin-issued or self-service). */
  static async createPasswordResetToken(userId, ttlMinutes = 60) {
    const user = await User.findById(userId);
    if (!user) throw notFound('User not found');
    const token = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = hashToken(token);
    user.resetTokenExpires = new Date(Date.now() + ttlMinutes * 60 * 1000);
    await user.save();
    return { token, expiresAt: user.resetTokenExpires };
  }

  static async resetPasswordWithToken(token, newPassword) {
    const user = await User.findOne({ resetTokenHash: hashToken(token) }).select('+passwordHash +resetTokenExpires');
    if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      throw badRequest('This password reset link is invalid or has expired', 'RESET_TOKEN_INVALID');
    }
    const check = validatePasswordStrength(newPassword, user.phone);
    if (!check.valid) throw badRequest(check.message, 'WEAK_PASSWORD');

    user.passwordHash = await hashPassword(newPassword);
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    user.failedLogins = 0;
    user.lockedUntil = null;
    user.tokenVersion = (user.tokenVersion || 1) + 1;
    user.passwordChangedAt = new Date();
    await user.save();

    await Session.updateMany({ user: user._id }, { isRevoked: true });
    return user;
  }

  static createSocketTicket(userId) {
    const ticket = crypto.randomBytes(32).toString('hex');
    socketTickets.set(ticket, { userId: String(userId), expiresAt: Date.now() + 60000 });
    return ticket;
  }

  static verifySocketTicket(ticket) {
    if (!ticket || typeof ticket !== 'string') return null;
    const entry = socketTickets.get(ticket);
    if (!entry) return null;
    socketTickets.delete(ticket);
    if (entry.expiresAt < Date.now()) return null;
    return entry.userId;
  }

  static async setupMfa(userId) {
    const user = await User.findById(userId);
    if (!user) throw notFound('User not found');
    const { raw, base32 } = generateTotpSecret();
    const recoveryCodes = generateRecoveryCodes(8);
    const recoveryHashes = recoveryCodes.map(hashToken);

    user.mfa = user.mfa || {};
    user.mfa.pendingSecretEnc = encryptSecret(base32);
    user.mfa.recoveryCodeHashes = recoveryHashes;
    await user.save();

    const label = encodeURIComponent(user.phone || user.name || 'Account');
    const uri = `otpauth://totp/PMart:${label}?secret=${base32}&issuer=PMart`;
    return {
      secret: base32,
      uri,
      recoveryCodes
    };
  }

  static async confirmMfa(userId, code) {
    const user = await User.findById(userId).select('+mfa.pendingSecretEnc');
    if (!user || !user.mfa?.pendingSecretEnc) {
      throw badRequest('MFA setup has not been initiated', 'MFA_NOT_INITIALIZED');
    }
    const secretBase32 = decryptSecret(user.mfa.pendingSecretEnc);
    const secretBytes = base32Decode(secretBase32);
    if (!verifyTotp(code, secretBytes)) {
      throw badRequest('Invalid 6-digit verification code. Please check your authenticator app and try again.', 'INVALID_TOTP');
    }

    user.mfa.secretEnc = user.mfa.pendingSecretEnc;
    user.mfa.pendingSecretEnc = undefined;
    user.mfa.enabled = true;
    user.mfa.enabledAt = new Date();
    await user.save();

    return { success: true, message: 'Two-factor authentication enabled successfully' };
  }

  static async verifyMfaLogin({ mfaTicket, code, recoveryCode }, req = null) {
    let decoded;
    try {
      decoded = jwt.verify(mfaTicket, env.JWT_SECRET);
      if (!decoded.mfa) throw new Error();
    } catch {
      throw unauthorized('Invalid or expired MFA session', 'MFA_SESSION_INVALID');
    }

    const user = await User.findById(decoded.id).select('+mfa.secretEnc +mfa.recoveryCodeHashes');
    if (!user || !user.isActive || !user.mfa?.enabled) {
      throw unauthorized('MFA not configured or user invalid', 'MFA_INVALID');
    }

    let verified = false;
    if (code) {
      const secretBase32 = decryptSecret(user.mfa.secretEnc);
      const secretBytes = base32Decode(secretBase32);
      verified = verifyTotp(code, secretBytes);
    } else if (recoveryCode) {
      const hashedRecovery = hashToken(recoveryCode.trim().toUpperCase());
      const idx = (user.mfa.recoveryCodeHashes || []).indexOf(hashedRecovery);
      if (idx !== -1) {
        verified = true;
        user.mfa.recoveryCodeHashes.splice(idx, 1);
        await user.save();
      }
    }

    if (!verified) {
      throw unauthorized('Invalid verification code or recovery code', 'MFA_CODE_INVALID');
    }

    return { user, ...(await this.issueSession(user, req)) };
  }

  static async disableMfa(userId, currentPassword) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) throw notFound('User not found');
    if (!user.passwordHash || !(await verifyPassword(currentPassword, user.passwordHash))) {
      throw badRequest('Current password is incorrect', 'WRONG_PASSWORD');
    }
    user.mfa = {
      enabled: false,
      secretEnc: undefined,
      pendingSecretEnc: undefined,
      enabledAt: undefined,
      recoveryCodeHashes: []
    };
    await user.save();
    return { success: true, message: 'Two-factor authentication disabled successfully' };
  }

  /** Creates a one-time setup token; returns the plain token (only its hash is stored). */
  static async createSetupToken(userId, ttlHours = 72) {
    const token = crypto.randomBytes(32).toString('hex');
    await User.updateOne(
      { _id: userId },
      { $set: { setupTokenHash: hashToken(token), setupTokenExpires: new Date(Date.now() + ttlHours * 3600 * 1000) } }
    );
    return token;
  }
}

module.exports = { AuthService };
