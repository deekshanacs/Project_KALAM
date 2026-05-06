import { Role } from '../_shared';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
      };
      requestId?: string;
    }
  }
}

export {};
