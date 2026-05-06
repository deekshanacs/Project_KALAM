import 'dotenv/config';
import { createServer } from 'http';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { logger } from './lib/logger';

async function main(): Promise<void> {
  // Ensure uploads directory exists
  const uploadDir = path.resolve(env.UPLOAD_DIR);
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
    logger.info(`[Startup] Created uploads directory: ${uploadDir}`);
  }

  // Verify database connection
  await prisma.$connect();
  logger.info('[Startup] Database connected');

  const app = createApp();
  const httpServer = createServer(app);

  // Initialize Socket.io (imported lazily to avoid circular deps)
  const { initializeSocket } = await import('./services/socket.service');
  initializeSocket(httpServer);
  logger.info('[Startup] Socket.io initialized');

  httpServer.listen(env.PORT, () => {
    logger.info(`[Startup] Server listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    logger.info('[Shutdown] Graceful shutdown initiated');
    httpServer.close(async () => {
      await prisma.$disconnect();
      logger.info('[Shutdown] Complete');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => { void shutdown(); });
  process.on('SIGINT', () => { void shutdown(); });
}

main().catch((error: unknown) => {
  logger.error('[Startup] Fatal error:', { error });
  process.exit(1);
});
