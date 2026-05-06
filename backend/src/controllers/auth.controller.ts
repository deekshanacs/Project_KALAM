import { RequestHandler } from 'express';
import bcrypt from 'bcrypt';
import { Role } from '@tms/shared';
import { prisma } from '../lib/prisma';
import {
  generateTokenPair,
  hashToken,
  revokeToken,
  verifyRefreshToken,
} from '../services/auth.service';
import { loginAttemptTracker } from '../services/loginAttempt.service';
import { ConflictError, UnauthorizedError, TooManyRequestsError } from '../lib/errors';
import type { RegisterDto, LoginDto } from '../schemas/auth.schemas';

const BCRYPT_COST = 12;

const safeUserSelect = {
  id: true, email: true, name: true, role: true,
  availabilityStatus: true, avatarUrl: true, supervisorId: true,
  createdAt: true, updatedAt: true,
} as const;

export const register: RequestHandler = async (req, res, next) => {
  try {
    const { name, email, password } = req.body as RegisterDto;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictError('Email already registered');

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const user = await prisma.user.create({
      data: { name, email, password: passwordHash },
      select: safeUserSelect,
    });

    const tokens = await generateTokenPair({ ...user, role: user.role as Role });
    res.status(201).json({ data: { user, ...tokens } });
  } catch (err) {
    next(err);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const { email, password } = req.body as LoginDto;

    if (loginAttemptTracker.isLocked(email)) {
      throw new TooManyRequestsError(
        'Account temporarily locked due to too many failed attempts',
        loginAttemptTracker.getRemainingLockSeconds(email)
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      loginAttemptTracker.recordFailure(email);
      throw new UnauthorizedError('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      loginAttemptTracker.recordFailure(email);
      throw new UnauthorizedError('Invalid credentials');
    }

    loginAttemptTracker.reset(email);

    const safeUser = {
      id: user.id, email: user.email, name: user.name, role: user.role,
      availabilityStatus: user.availabilityStatus, avatarUrl: user.avatarUrl,
      supervisorId: user.supervisorId, createdAt: user.createdAt, updatedAt: user.updatedAt,
    };

    const tokens = await generateTokenPair({ ...safeUser, role: safeUser.role as Role });
    res.json({ data: { user: safeUser, ...tokens } });
  } catch (err) {
    next(err);
  }
};

export const refresh: RequestHandler = async (req, res, next) => {
  try {
    const { refreshToken } = req.body as { refreshToken: string };

    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Rotate: revoke old, issue new
    await revokeToken(tokenHash);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });
    if (!user) throw new UnauthorizedError('User not found');

    const tokens = await generateTokenPair({ ...user, role: user.role as Role });
    res.json({ data: tokens });
  } catch (err) {
    next(err);
  }
};

export const logout: RequestHandler = async (req, res, next) => {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    const tokenHash = hashToken(refreshToken);
    await revokeToken(tokenHash);

    // Set user offline
    if (req.user) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { availabilityStatus: 'OFFLINE' },
      });
    }

    res.json({ data: { message: 'Logged out successfully' } });
  } catch (err) {
    next(err);
  }
};

export const getMe: RequestHandler = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, email: true, name: true, role: true,
        availabilityStatus: true, avatarUrl: true, supervisorId: true,
        createdAt: true, updatedAt: true,
      },
    });
    res.json({ data: { user } });
  } catch (err) {
    next(err);
  }
};
