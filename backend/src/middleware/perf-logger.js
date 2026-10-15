'use strict';

const { logger } = require('../utils/logger');

/**
 * Lightweight performance timing middleware.
 * Attaches X-Response-Time header and logs request duration without sensitive data.
 */
function perfLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number((end - start) / 1000000n);

    // Only log API routes to keep logs readable
    if (req.originalUrl && req.originalUrl.startsWith('/api') && req.originalUrl !== '/api/health') {
      const status = res.statusCode;
      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      logger[level](`[PERF] ${req.method} ${req.originalUrl.split('?')[0]} ${status} ${durationMs}ms`);
    }
  });

  next();
}

module.exports = { perfLogger };
