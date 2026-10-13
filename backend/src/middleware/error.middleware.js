'use strict';

const { logger } = require('../utils/logger');

/** Renders every error as { success: false, code, message }. Never exposes stack traces. */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const requestId = req.headers['x-request-id'];
  let status = err.statusCode || err.status || 500;
  let code = err.code && typeof err.code === 'string' ? err.code : 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'Server error';
  let errors;

  if (err.name === 'ZodError') {
    status = 400;
    code = 'VALIDATION_ERROR';
    errors = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    message = errors[0] ? `${errors[0].path ? `${errors[0].path}: ` : ''}${errors[0].message}` : 'Validation failed';
  } else if (err.name === 'ValidationError') {
    status = 400;
    code = 'VALIDATION_ERROR';
    errors = Object.values(err.errors || {}).map((e) => ({ path: e.path, message: e.message }));
    message = errors[0] ? errors[0].message : 'Validation failed';
  } else if (err.name === 'CastError') {
    status = 400;
    code = 'INVALID_ID';
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    code = 'DUPLICATE';
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
    message = field ? `A record with this ${field} already exists` : 'Duplicate record';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_JSON';
    message = 'Malformed JSON body';
  }

  // Deliberate HttpErrors (e.g. 503 "not configured") keep their message; unexpected failures are masked.
  if (status >= 500 && err.name !== 'HttpError') {
    logger.error(`[${requestId}] ${req.method} ${req.originalUrl} -> ${err.stack || err.message}`);
    message = 'Something went wrong. Please try again.';
    code = 'INTERNAL_SERVER_ERROR';
  }

  const body = { success: false, code, message, requestId };
  if (errors) body.errors = errors;
  if (err.details) body.details = err.details;
  res.status(status).json(body);
};

const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` });
};

module.exports = { errorHandler, notFoundHandler };
