'use strict';

const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { normalizeMobileNumber } = require('../utils/auth');

const skipOutsideProduction = () =>
  process.env.RATE_LIMIT_IN_DEV !== 'true' && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test');

/**
 * Rate-limit keys. Client IPs come from X-Forwarded-For and can be forged by a client that reaches the API
 * without going through every trusted proxy (e.g. calling the Render URL directly), so limits that guard
 * credentials or money are keyed on something the client cannot rotate: the signed-in user or the target phone.
 */
const keys = {
  ip: (req) => `ip:${ipKeyGenerator(req.ip || '')}`,
  /** The signed-in user; falls back to the IP on routes that also serve signed-out requests. */
  user: (req) => (req.user ? `user:${req.user._id}` : keys.ip(req)),
  /** The account being signed in to (normalised mobile number from the request body). */
  phone: (req) => {
    const phone = normalizeMobileNumber(req.body && typeof req.body.phone === 'string' ? req.body.phone : '');
    return `phone:${phone || 'none'}`;
  }
};

/**
 * Builds a rate limiter. Limits are skipped in development and test so local work and
 * automated suites are not throttled; set RATE_LIMIT_IN_DEV=true to exercise them locally.
 * `key`: 'ip' (default), 'user' or 'phone'. `failuresOnly`: count only responses with status >= 400.
 */
function limiter({ windowMs, max, message, key = 'ip', failuresOnly = false }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: keys[key],
    skipSuccessfulRequests: failuresOnly,
    message: { success: false, code: 'RATE_LIMITED', message },
    skip: skipOutsideProduction
  });
}

module.exports = { limiter };
