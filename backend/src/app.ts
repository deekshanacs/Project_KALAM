import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { env } from './config/env';
import { globalRateLimiter, authRateLimiter } from './middleware/rateLimiter';
import { requestIdMiddleware } from './middleware/requestId';
import { loggerMiddleware } from './middleware/logger';
import { globalErrorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth.routes';
import { userRouter } from './routes/user.routes';
import { taskRouter } from './routes/task.routes';
import { messageRouter } from './routes/message.routes';
import { groupRouter } from './routes/group.routes';
import { documentRouter } from './routes/document.routes';
import { aiRouter } from './routes/ai.routes';
import { uploadRouter } from './routes/upload.routes';
import { authMiddleware } from './middleware/auth';

export function createApp(): express.Application {
  const app = express();

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // CSP handled by frontend meta tag; backend serves API only
      hsts: { maxAge: 31536000, includeSubDomains: true },
    })
  );

  // CORS — supports comma-separated origins in CORS_ORIGIN env var
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );

  // Global rate limiter
  app.use(globalRateLimiter);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request ID + logging
  app.use(requestIdMiddleware);
  app.use(loggerMiddleware);

  // Static file serving for uploads
  app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

  // Health check (no auth)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/auth', authRateLimiter, authRouter);
  app.use('/api/users', authMiddleware, userRouter);
  app.use('/api/tasks', authMiddleware, taskRouter);
  app.use('/api/messages', authMiddleware, messageRouter);
  app.use('/api/groups', authMiddleware, groupRouter);
  app.use('/api/documents', authMiddleware, documentRouter);
  app.use('/api/ai', authMiddleware, aiRouter);
  app.use('/api/upload', authMiddleware, uploadRouter);

  // Global error handler (must be last)
  app.use(globalErrorHandler);

  return app;
}
