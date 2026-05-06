import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { env } from '../config/env';
import { verifyAccessToken } from './auth.service';
import { logger } from '../lib/logger';

let io: SocketServer;

export function initializeSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // JWT authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth['token'] as string | undefined;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = verifyAccessToken(token);
      socket.data['userId'] = payload.sub;
      socket.data['role'] = payload.role;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data['userId'] as string;
    logger.info({ event: 'SOCKET_CONNECTED', userId, socketId: socket.id });

    // Join personal room
    void socket.join(`user:${userId}`);

    // Group room management
    socket.on('join:group', (groupId: string) => {
      void socket.join(`group:${groupId}`);
    });
    socket.on('leave:group', (groupId: string) => {
      void socket.leave(`group:${groupId}`);
    });

    // WebRTC signaling relay
    socket.on('webrtc:offer', (data: unknown) => {
      if (!isWebRTCSignal(data, 'offer')) return;
      const { targetUserId, offer } = data as { targetUserId: string; offer: unknown };
      emitToUser(targetUserId, 'webrtc:offer', { fromUserId: userId, offer });
    });

    socket.on('webrtc:answer', (data: unknown) => {
      if (!isWebRTCSignal(data, 'answer')) return;
      const { targetUserId, answer } = data as { targetUserId: string; answer: unknown };
      emitToUser(targetUserId, 'webrtc:answer', { fromUserId: userId, answer });
    });

    socket.on('webrtc:ice-candidate', (data: unknown) => {
      if (!isWebRTCSignal(data, 'candidate')) return;
      const { targetUserId, candidate } = data as { targetUserId: string; candidate: unknown };
      emitToUser(targetUserId, 'webrtc:ice-candidate', { fromUserId: userId, candidate });
    });

    socket.on('webrtc:call-end', (data: unknown) => {
      if (typeof data !== 'object' || data === null) return;
      const { targetUserId } = data as { targetUserId?: string };
      if (typeof targetUserId !== 'string') return;
      emitToUser(targetUserId, 'webrtc:call-end', { fromUserId: userId });
    });

    socket.on('disconnect', (reason) => {
      logger.info({ event: 'SOCKET_DISCONNECTED', userId, reason });
    });
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  getIO().to(`user:${userId}`).emit(event, data);
}

export function emitToGroup(groupId: string, event: string, data: unknown): void {
  getIO().to(`group:${groupId}`).emit(event, data);
}

export function emitToAll(event: string, data: unknown): void {
  getIO().emit(event, data);
}

function isWebRTCSignal(data: unknown, signalKey: string): boolean {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return typeof obj['targetUserId'] === 'string' && obj[signalKey] !== undefined;
}
