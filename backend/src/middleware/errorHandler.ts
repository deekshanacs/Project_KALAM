import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AppError, TooManyRequestsError } from '../lib/errors';
import { logger } from '../lib/logger';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const globalErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Log full error server-side
  logger.error({
    event: 'UNHANDLED_ERROR',
    requestId: req.requestId,
    errorType: err instanceof Error ? err.constructor.name : 'Unknown',
    message: err instanceof Error ? err.message : String(err),
    stack: process.env['NODE_ENV'] === 'development' && err instanceof Error ? err.stack : undefined,
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
    return;
  }

  // Prisma errors
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A record with this value already exists.' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Record not found.' });
      return;
    }
  }

  // App errors
  if (err instanceof TooManyRequestsError) {
    res.status(429).json({
      error: err.message,
      ...(err.retryAfter !== undefined && { retryAfter: err.retryAfter }),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details !== undefined && { details: err.details }),
    });
    return;
  }

  // Generic fallback — never expose internals
  res.status(500).json({ error: 'An unexpected error occurred.' });
};
