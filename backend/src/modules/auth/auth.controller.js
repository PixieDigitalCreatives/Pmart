'use strict';

const { AuthService } = require('./auth.service');
const { env } = require('../../config/env');
const { z, phone, password } = require('../../utils/validation');
const { unauthorized } = require('../../utils/http-error');
const { logger } = require('../../utils/logger');

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  phone,
  password
});

const loginSchema = z.object({
  phone,
  password: z.string().min(1, 'Password is required')
});

const googleSchema = z.object({ idToken: z.string().min(1, 'ID token is required') });

const completeProfileSchema = z
  .object({ name: z.string().trim().min(1, 'Name is required').max(100), phone, password, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] });

const activateSchema = z
  .object({ token: z.string().min(1, 'Setup token is required'), password, confirmPassword: z.string().optional() })
  .refine((d) => d.confirmPassword === undefined || d.password === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] });

const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, 'Current password is required'), newPassword: password, confirmPassword: z.string() })
  .refine((d) => d.newPassword === d.confirmPassword, { message: 'New passwords do not match', path: ['confirmPassword'] });

const REFRESH_COOKIE = 'refreshToken';

function getCookieOptions() {
  const sameSite = env.COOKIE_SAME_SITE || (env.NODE_ENV === 'production' ? 'none' : 'strict');
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production' || sameSite === 'none',
    sameSite,
    path: '/api/auth'
  };
}

function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...getCookieOptions(),
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  });
}

function sessionResponse(res, status, { user, accessToken, refreshToken }) {
  setRefreshCookie(res, refreshToken);
  const publicUser = AuthService.toPublicUser(user);
  res.status(status).json({ success: true, user: publicUser, profileComplete: publicUser.profileComplete, accessToken });
}

class AuthController {
  static async register(req, res) {
    const data = registerSchema.parse(req.body);
    const result = await AuthService.registerCustomer(data);
    logger.info(`Customer registered: ${result.user._id}`);
    sessionResponse(res, 201, result);
  }

  static async login(req, res) {
    const data = loginSchema.parse(req.body);
    try {
      sessionResponse(res, 200, await AuthService.login(data));
    } catch (err) {
      logger.warn(`Failed login from ${req.ip}`);
      throw err;
    }
  }

  static async googleLogin(req, res) {
    const { idToken } = googleSchema.parse(req.body);
    sessionResponse(res, 200, await AuthService.googleLogin(idToken));
  }

  static async completeProfile(req, res) {
    const data = completeProfileSchema.parse(req.body);
    const user = await AuthService.completeProfile(req.user._id, data);
    res.json({ success: true, message: 'Profile completed', user: AuthService.toPublicUser(user) });
  }

  static async activateAccount(req, res) {
    const { token, password: newPassword } = activateSchema.parse(req.body);
    await AuthService.activateAccount(token, newPassword);
    res.json({ success: true, message: 'Account activated. You can now sign in.' });
  }

  static async refresh(req, res) {
    const refreshToken = req.cookies && req.cookies[REFRESH_COOKIE];
    if (!refreshToken) throw unauthorized('No refresh token provided', 'REFRESH_MISSING');
    const result = await AuthService.refresh(refreshToken);
    setRefreshCookie(res, result.refreshToken);
    res.json({ success: true, accessToken: result.accessToken, user: AuthService.toPublicUser(result.user) });
  }

  static async logout(req, res) {
    await AuthService.logout(req.user._id);
    res.clearCookie(REFRESH_COOKIE, getCookieOptions());
    res.json({ success: true, message: 'Logged out' });
  }

  static async me(req, res) {
    res.json({ success: true, user: AuthService.toPublicUser(req.user) });
  }

  static async changePassword(req, res) {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const result = await AuthService.changePassword(req.user._id, currentPassword, newPassword);
    setRefreshCookie(res, result.refreshToken);
    res.json({ success: true, message: 'Password changed', accessToken: result.accessToken, user: AuthService.toPublicUser(result.user) });
  }
}

module.exports = { AuthController };
