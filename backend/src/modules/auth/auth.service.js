'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { env } = require('../../config/env');
const { User, UserRole, AuthProvider } = require('./auth.model');
const { hashPassword, verifyPassword, hashToken } = require('../../utils/auth');
const { getFirebaseAuth } = require('../../config/firebase-admin');
const { HttpError, unauthorized, conflict, badRequest, notFound } = require('../../utils/http-error');

const INVALID_CREDENTIALS = 'Invalid mobile number or password';

class AuthService {
  static signAccessToken(userId) {
    return jwt.sign({ id: String(userId) }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
  }

  /** Issues a new access/refresh pair and stores only the refresh token's hash. */
  static async issueSession(user) {
    const accessToken = this.signAccessToken(user._id);
    const refreshToken = crypto.randomBytes(40).toString('hex');
    await User.updateOne({ _id: user._id }, { $set: { refreshTokenHash: hashToken(refreshToken), lastLoginAt: new Date() } });
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

  static async registerCustomer({ name, phone, password }) {
    if (await User.exists({ phone })) {
      throw conflict('This mobile number is already registered. Please sign in.', 'PHONE_TAKEN');
    }
    const user = await User.create({
      name,
      phone,
      passwordHash: await hashPassword(password),
      role: UserRole.CUSTOMER,
      authProvider: AuthProvider.PHONE,
      profileComplete: true
    });
    return { user, ...(await this.issueSession(user)) };
  }

  static async login({ phone, password }) {
    const user = await User.findOne({ phone }).select('+passwordHash');
    if (!user || !user.passwordHash) throw unauthorized(INVALID_CREDENTIALS, 'INVALID_CREDENTIALS');
    if (!(await verifyPassword(password, user.passwordHash))) throw unauthorized(INVALID_CREDENTIALS, 'INVALID_CREDENTIALS');
    if (!user.isActive) throw unauthorized('This account has been deactivated', 'ACCOUNT_DEACTIVATED');
    return { user, ...(await this.issueSession(user)) };
  }

  static async googleLogin(idToken) {
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
      // Link Google to an existing account only when Google has verified the email.
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
        profileComplete: false
      });
    }

    if (!user.isActive) throw unauthorized('This account has been deactivated', 'ACCOUNT_DEACTIVATED');
    return { user, ...(await this.issueSession(user)) };
  }

  /** Google sign-ups finish registration by adding their mobile number and a password. */
  static async completeProfile(userId, { name, phone, password }) {
    if (await User.exists({ phone, _id: { $ne: userId } })) {
      throw conflict('This mobile number is already associated with another account', 'PHONE_TAKEN');
    }
    const user = await User.findById(userId);
    if (!user) throw notFound('User not found');
    user.name = name;
    user.phone = phone;
    user.passwordHash = await hashPassword(password);
    user.profileComplete = true;
    await user.save();
    return user;
  }

  /** Account activation for staff/riders/shop owners invited with a one-time setup link. */
  static async activateAccount(token, password) {
    const user = await User.findOne({ setupTokenHash: hashToken(token) }).select('+setupTokenExpires');
    if (!user || !user.setupTokenExpires || user.setupTokenExpires < new Date()) {
      throw badRequest('This setup link is invalid or has expired', 'SETUP_TOKEN_INVALID');
    }
    user.passwordHash = await hashPassword(password);
    user.setupTokenHash = undefined;
    user.setupTokenExpires = undefined;
    user.mustChangePassword = false;
    user.profileComplete = true;
    await user.save();
    return user;
  }

  static async refresh(refreshToken) {
    const user = await User.findOne({ refreshTokenHash: hashToken(refreshToken) });
    if (!user || !user.isActive) throw unauthorized('Invalid refresh token', 'REFRESH_INVALID');
    return { user, ...(await this.issueSession(user)) };
  }

  static async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) throw notFound('User not found');
    if (!user.passwordHash || !(await verifyPassword(currentPassword, user.passwordHash))) {
      throw badRequest('Current password is incorrect', 'WRONG_PASSWORD');
    }
    if (currentPassword === newPassword) {
      throw badRequest('New password must be different from the current password', 'PASSWORD_REUSED');
    }
    user.passwordHash = await hashPassword(newPassword);
    user.mustChangePassword = false;
    await user.save();
    // Rotating the session invalidates every other device's refresh token.
    return { user, ...(await this.issueSession(user)) };
  }

  static async logout(userId) {
    await User.updateOne({ _id: userId }, { $unset: { refreshTokenHash: 1 } });
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
