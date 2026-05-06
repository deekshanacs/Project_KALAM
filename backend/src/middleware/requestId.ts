import { RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const requestIdMiddleware: RequestHandler = (_req, _res, next) => {
  _req.requestId = uuidv4();
  _res.setHeader('X-Request-Id', _req.requestId);
  next();
};
