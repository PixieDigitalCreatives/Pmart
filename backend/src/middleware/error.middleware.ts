import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack, requestId: req.headers['x-request-id'] });

  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: err.issues?.[0]?.message || err.errors?.[0]?.message || 'Validation failed',
      requestId: req.headers['x-request-id'],
      errors: err.issues || err.errors
    });
  }

  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    success: false,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Server Error',
    requestId: req.headers['x-request-id'],
    errors: err.errors || []
  });
};
