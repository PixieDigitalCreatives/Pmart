'use strict';

const crypto = require('crypto');
const { env } = require('../config/env');
const { forbidden } = require('../utils/http-error');

const CSRF_COOKIE = 'XSRF-TOKEN';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getCsrfCookieOptions() {
  return {
    httpOnly: false,
    secure: env.NODE_ENV === 'production' || env.cookieSameSite === 'none',
    sameSite: env.cookieSameSite,
    path: '/'
  };
}

/**
 * Middleware that sets the CSRF token cookie if absent, and validates double-submit tokens
 * on cookie-based state-changing requests. Requests with Authorization: Bearer bypass CSRF checks
 * for safe backward compatibility with API clients and tests.
 */
function csrfProtection(req, res, next) {
  let token = req.cookies && req.cookies[CSRF_COOKIE];
  if (!token) {
    token = generateCsrfToken();
    res.cookie(CSRF_COOKIE, token, getCsrfCookieOptions());
  }

  // Safe read-only methods do not modify state
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // Bearer token authentication in Authorization header is not subject to browser CSRF
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return next();
  }

  // Exempt public auth endpoints that establish or reset credentials initially
  const path = req.originalUrl.split('?')[0].replace(/\/$/, '');
  if ([
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/google',
    '/api/auth/refresh',
    '/api/auth/activate',
    '/api/auth/reset-password',
    '/api/auth/mfa/verify'
  ].includes(path)) {
    return next();
  }

  // Check Origin if present
  const origin = req.headers.origin;
  if (origin && !env.isAllowedOrigin(origin)) {
    return next(forbidden('Cross-origin request forbidden', 'CORS_FORBIDDEN'));
  }

  const headerToken = req.headers['x-xsrf-token'] || req.headers['x-csrf-token'];
  if (!headerToken || headerToken !== token) {
    return next(forbidden('Invalid or missing CSRF token', 'CSRF_INVALID'));
  }

  next();
}

module.exports = { csrfProtection, generateCsrfToken, CSRF_COOKIE, getCsrfCookieOptions };
