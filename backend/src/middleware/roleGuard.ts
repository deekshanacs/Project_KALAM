import { RequestHandler } from 'express';
import { Role } from '@tms/shared';
import { ForbiddenError, UnauthorizedError } from '../lib/errors';

export function roleGuard(allowedRoles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(new ForbiddenError(`Requires one of: ${allowedRoles.join(', ')}`));
      return;
    }
    next();
  };
}
