import rateLimit, { type Options } from 'express-rate-limit';
import { type RequestHandler } from 'express';

// In development, bypass all rate limiting so local testing isn't blocked
const isDev = process.env['NODE_ENV'] !== 'production';

const noopMiddleware: RequestHandler = (_req, _res, next) => next();

function makeRateLimiter(options: Partial<Options>): RequestHandler {
  if (isDev) return noopMiddleware;
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    ...options,
  });
}

export const authRateLimiter = makeRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
});

export const globalRateLimiter = makeRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
});
