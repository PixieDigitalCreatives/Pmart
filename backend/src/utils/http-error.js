'use strict';

/**
 * An error that carries an HTTP status code and a stable machine-readable code.
 * Thrown from controllers/services and rendered by the global error handler.
 */
class HttpError extends Error {
  constructor(statusCode, message, code, details) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code || HttpError.defaultCode(statusCode);
    if (details !== undefined) this.details = details;
  }

  static defaultCode(statusCode) {
    switch (statusCode) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 422: return 'VALIDATION_ERROR';
      case 503: return 'SERVICE_UNAVAILABLE';
      default: return 'ERROR';
    }
  }
}

const badRequest = (message, code, details) => new HttpError(400, message, code, details);
const unauthorized = (message = 'Not authorized', code) => new HttpError(401, message, code);
const forbidden = (message = 'Forbidden', code) => new HttpError(403, message, code);
const notFound = (message = 'Not found', code) => new HttpError(404, message, code);
const conflict = (message, code, details) => new HttpError(409, message, code, details);

module.exports = { HttpError, badRequest, unauthorized, forbidden, notFound, conflict };
