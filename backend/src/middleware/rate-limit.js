'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Builds a rate limiter. Limits are skipped in development and test so local work and
 * automated suites are not throttled; set RATE_LIMIT_IN_DEV=true to exercise them locally.
 */
function limiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, code: 'RATE_LIMITED', message },
    skip: () => process.env.RATE_LIMIT_IN_DEV !== 'true' && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')
  });
}

module.exports = { limiter };
