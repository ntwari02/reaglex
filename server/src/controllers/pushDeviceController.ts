import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { PushDevice } from '../models/PushDevice';
import { WebPushSubscription } from '../models/WebPushSubscription';
import {
  getWebPushPublicKey,
  isWebPushConfigured,
} from '../services/pushNotificationService';

function clean(v: unknown): string {
  return String(v ?? '').trim().slice(0, 512);
}

export async function registerPushDevice(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const body = (req.body || {}) as Record<string, unknown>;
    const token = clean(body.token);
    if (!token) {
      return res.status(400).json({ message: 'token is required' });
    }
    const platform = clean(body.platform).toLowerCase();
    const allowedPlatform = ['ios', 'android', 'web'].includes(platform) ? platform : 'unknown';
    const provider = clean(body.provider).toLowerCase();
    const allowedProvider = ['expo', 'fcm', 'apns'].includes(provider) ? provider : 'expo';
    const deviceId = clean(body.deviceId);
    const appVersion = clean(body.appVersion);

    const userId = new mongoose.Types.ObjectId(req.user.id);

    // Make sure this token isn't bound to another user; if so, reassign.
    const device = await PushDevice.findOneAndUpdate(
      { token },
      {
        $set: {
          userId,
          platform: allowedPlatform,
          provider: allowedProvider,
          deviceId,
          appVersion,
          enabled: true,
          lastSeenAt: new Date(),
          failureCount: 0,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return res.json({
      success: true,
      deviceId: String(device._id),
      message: 'Push device registered',
    });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e instanceof Error ? e.message : 'Failed to register push device' });
  }
}

export async function unregisterPushDevice(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const body = (req.body || {}) as Record<string, unknown>;
    const token = clean(body.token);
    if (!token) {
      return res.status(400).json({ message: 'token is required' });
    }
    const userId = new mongoose.Types.ObjectId(req.user.id);
    await PushDevice.updateOne({ token, userId }, { $set: { enabled: false } });
    return res.json({ success: true, message: 'Push device disabled' });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e instanceof Error ? e.message : 'Failed to unregister push device' });
  }
}

export async function listOwnPushDevices(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const devices = await PushDevice.find({ userId }).sort({ lastSeenAt: -1 }).lean();
    return res.json({
      devices: (devices as any[]).map((d) => ({
        id: String(d._id),
        platform: d.platform,
        provider: d.provider,
        deviceId: d.deviceId,
        appVersion: d.appVersion,
        enabled: Boolean(d.enabled),
        lastSeenAt: d.lastSeenAt,
        failureCount: Number(d.failureCount || 0),
      })),
    });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e instanceof Error ? e.message : 'Failed to list devices' });
  }
}

// ----- Web Push (PWA) -----

export async function getWebPushConfig(_req: AuthenticatedRequest, res: Response) {
  return res.json({
    enabled: isWebPushConfigured(),
    publicKey: getWebPushPublicKey() || null,
  });
}

export async function subscribeWebPush(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!isWebPushConfigured()) {
      return res.status(503).json({ message: 'Web push is not configured on this server' });
    }
    const body = (req.body || {}) as {
      subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      userAgent?: string;
    };
    const sub = body.subscription || {};
    const endpoint = String(sub.endpoint || '').trim();
    const p256dh = String(sub.keys?.p256dh || '').trim();
    const auth = String(sub.keys?.auth || '').trim();
    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({ message: 'Invalid subscription payload' });
    }
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const userAgent = String(body.userAgent || req.headers['user-agent'] || '').slice(0, 300);

    const record = await WebPushSubscription.findOneAndUpdate(
      { endpoint },
      {
        $set: {
          userId,
          endpoint,
          p256dh,
          auth,
          userAgent,
          enabled: true,
          lastSeenAt: new Date(),
          failureCount: 0,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return res.json({ success: true, subscriptionId: String(record._id) });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e instanceof Error ? e.message : 'Failed to register web push' });
  }
}

export async function unsubscribeWebPush(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const body = (req.body || {}) as { endpoint?: string };
    const endpoint = String(body.endpoint || '').trim();
    if (!endpoint) {
      return res.status(400).json({ message: 'endpoint is required' });
    }
    const userId = new mongoose.Types.ObjectId(req.user.id);
    await WebPushSubscription.updateOne({ endpoint, userId }, { $set: { enabled: false } });
    return res.json({ success: true, message: 'Web push disabled' });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e instanceof Error ? e.message : 'Failed to unsubscribe web push' });
  }
}
