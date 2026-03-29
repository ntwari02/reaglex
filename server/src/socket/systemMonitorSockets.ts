import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import {
  getSystemHealth,
  getApiMonitoringList,
  getMonitorLogs,
  getActivityStream,
  getAlerts,
  getGlobalStatus,
  getUptimeBuckets24h,
  getTerminalBuffers,
  seedMonitorLogsOnce,
} from '../services/systemMonitor.service';
import { getSecurityOverview } from '../services/securityAnalysis.service';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

function adminSocketAuth(socket: Socket, next: (err?: Error) => void) {
  const handshake = socket.handshake as { auth?: { token?: string }; headers?: { authorization?: string } };
  const token =
    handshake.auth?.token ||
    (typeof handshake.headers?.authorization === 'string'
      ? handshake.headers.authorization.replace(/^Bearer\s+/i, '')
      : '');
  if (!token) {
    return next(new Error('Authentication error'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { role?: string; id?: string };
    if (decoded.role !== 'admin') {
      return next(new Error('Forbidden'));
    }
    (socket as Socket & { adminId?: string }).adminId = decoded.id;
    return next();
  } catch {
    return next(new Error('Authentication error'));
  }
}

export function attachSystemMonitorNamespaces(io: Server): void {
  const systemNs = io.of('/system');
  systemNs.use(adminSocketAuth);

  systemNs.on('connection', (socket) => {
    socket.on('subscribe:system', () => {
      socket.join('system-monitors');
    });
  });

  const securityNs = io.of('/security');
  securityNs.use(adminSocketAuth);

  securityNs.on('connection', (socket) => {
    socket.on('subscribe:security', () => {
      socket.join('security-monitors');
    });
  });

  const TICK_MS = 1500;

  setInterval(() => {
    seedMonitorLogsOnce();
    const health = getSystemHealth();
    const endpoints = getApiMonitoringList();
    const activity = getActivityStream(40);
    const alerts = getAlerts();
    const status = getGlobalStatus();
    const buckets24h = getUptimeBuckets24h();
    const terminals = getTerminalBuffers();

    systemNs.to('system-monitors').emit('system:bundle', {
      health,
      endpoints,
      activity,
      alerts,
      status,
      buckets24h,
      terminals,
      ts: new Date().toISOString(),
    });

    systemNs.to('system-monitors').emit('system:health:update', health);
    systemNs.to('system-monitors').emit('system:api:update', { endpoints });
    systemNs.to('system-monitors').emit('system:activity', activity);

    const latest = getMonitorLogs().slice(0, 1)[0];
    if (latest) {
      systemNs.to('system-monitors').emit('system:log:new', latest);
    }
  }, TICK_MS);

  setInterval(() => {
    const overview = getSecurityOverview();
    securityNs.to('security-monitors').emit('security:scan:tick', { score: overview.score, grade: overview.grade });
  }, 8000);
}
