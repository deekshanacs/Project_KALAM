import { RequestHandler } from 'express';
import { logger } from '../lib/logger';

export const loggerMiddleware: RequestHandler = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    logger.info({
      event: 'HTTP_REQUEST',
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
    });
  });

  next();
};
