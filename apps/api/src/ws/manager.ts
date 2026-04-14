import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import type { Server } from 'http';
import type {
  WsEvent,
  WsAuthPayload,
  WsSubscribePayload,
  JwtPayload,
} from '@taskflow/types';
import logger from '../utils/logger';

// ── Extended WebSocket with app state ─────────────────────────────────────────
interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  email?: string;
  subscribedProjects: Set<string>;
  isAlive: boolean;
}

// ── Room map: projectId → Set of sockets ─────────────────────────────────────
const rooms = new Map<string, Set<AuthenticatedSocket>>();

function joinRoom(projectId: string, socket: AuthenticatedSocket) {
  if (!rooms.has(projectId)) rooms.set(projectId, new Set());
  rooms.get(projectId)!.add(socket);
  socket.subscribedProjects.add(projectId);
}

function leaveAllRooms(socket: AuthenticatedSocket) {
  socket.subscribedProjects.forEach((projectId) => {
    rooms.get(projectId)?.delete(socket);
    if (rooms.get(projectId)?.size === 0) rooms.delete(projectId);
  });
  socket.subscribedProjects.clear();
}

// ── Broadcast to all sockets in a project room ────────────────────────────────
export function broadcastToProject<T>(
  projectId: string,
  event: Omit<WsEvent<T>, 'timestamp'>,
  excludeUserId?: string
) {
  const room = rooms.get(projectId);
  if (!room) return;

  const message = JSON.stringify({ ...event, projectId, timestamp: new Date().toISOString() });
  let sent = 0;

  room.forEach((socket) => {
    if (
      socket.readyState === WebSocket.OPEN &&
      (!excludeUserId || socket.userId !== excludeUserId)
    ) {
      socket.send(message);
      sent++;
    }
  });

  logger.debug('WS broadcast', { projectId, type: event.type, recipients: sent });
}

// ── Send to a specific user across all their connections ──────────────────────
export function sendToUser<T>(userId: string, event: Omit<WsEvent<T>, 'timestamp'>) {
  const message = JSON.stringify({ ...event, timestamp: new Date().toISOString() });
  rooms.forEach((sockets) => {
    sockets.forEach((socket) => {
      if (socket.userId === userId && socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    });
  });
}

// ── Send error back to a single socket ───────────────────────────────────────
function sendError(socket: AuthenticatedSocket, message: string) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'error', payload: { message }, timestamp: new Date().toISOString() }));
  }
}

// ── Parse and validate incoming message ──────────────────────────────────────
function parseMessage(raw: string): WsEvent | null {
  try {
    return JSON.parse(raw) as WsEvent;
  } catch {
    return null;
  }
}

// ── Main WebSocket server setup ───────────────────────────────────────────────
export function createWsServer(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Heartbeat: ping every 30s, close unresponsive sockets
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((raw) => {
      const socket = raw as AuthenticatedSocket;
      if (!socket.isAlive) {
        leaveAllRooms(socket);
        return socket.terminate();
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, 30_000);

  wss.on('close', () => clearInterval(heartbeatInterval));

  wss.on('connection', (raw: WebSocket, req: IncomingMessage) => {
    const socket = raw as AuthenticatedSocket;
    socket.subscribedProjects = new Set();
    socket.isAlive = true;

    logger.info('WS client connected', { ip: req.socket.remoteAddress });

    socket.on('pong', () => { socket.isAlive = true; });

    socket.on('message', (data) => {
      const event = parseMessage(data.toString());
      if (!event) return sendError(socket, 'Invalid message format');

      switch (event.type) {
        // ── Auth: client sends JWT token ─────────────────────────────────
        case 'auth': {
          const { token } = event.payload as WsAuthPayload;
          try {
            const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
            socket.userId = payload.user_id;
            socket.email = payload.email;
            socket.send(JSON.stringify({
              type: 'auth',
              payload: { success: true, userId: payload.user_id },
              timestamp: new Date().toISOString(),
            }));
            logger.info('WS client authenticated', { userId: payload.user_id });
          } catch {
            sendError(socket, 'Authentication failed');
            socket.close(1008, 'Unauthorized');
          }
          break;
        }

        // ── Subscribe: join a project room ────────────────────────────────
        case 'subscribe': {
          if (!socket.userId) return sendError(socket, 'Authenticate first');
          const { projectId } = event.payload as WsSubscribePayload;
          if (!projectId) return sendError(socket, 'projectId required');
          joinRoom(projectId, socket);
          socket.send(JSON.stringify({
            type: 'subscribe',
            payload: { success: true, projectId },
            timestamp: new Date().toISOString(),
          }));
          logger.debug('WS client subscribed', { userId: socket.userId, projectId });
          break;
        }

        // ── Ping/pong ─────────────────────────────────────────────────────
        case 'ping': {
          socket.send(JSON.stringify({ type: 'pong', payload: {}, timestamp: new Date().toISOString() }));
          break;
        }

        default:
          sendError(socket, `Unknown event type: ${event.type}`);
      }
    });

    socket.on('close', () => {
      leaveAllRooms(socket);
      logger.info('WS client disconnected', { userId: socket.userId });
    });

    socket.on('error', (err) => {
      logger.error('WS socket error', { error: err.message, userId: socket.userId });
    });
  });

  logger.info('WebSocket server ready', { path: '/ws' });
  return wss;
}
