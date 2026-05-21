import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  getCloudCartForUser,
  syncCloudCart,
  toClientCartLines,
  type ClientCartLine,
} from '../services/cartSync.service';
import type { CartDevicePlatform } from '../models/BuyerCloudCart';

function parsePlatform(raw?: string): CartDevicePlatform {
  const p = String(raw || 'web').toLowerCase();
  if (p === 'mobile') return 'mobile';
  if (p === 'desktop') return 'desktop';
  return 'web';
}

export async function getBuyerCloudCart(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Authentication required' });
    const doc = await getCloudCartForUser(req.user.id);
    return res.json({
      items: toClientCartLines(doc.items || []),
      shippingPreviewLocation: doc.shippingPreviewLocation,
      deviceSessions: doc.deviceSessions || [],
      version: doc.version,
      updatedAt: doc.updatedAt,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed to load cloud cart' });
  }
}

export async function syncBuyerCloudCart(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Authentication required' });
    const body = req.body as {
      items?: ClientCartLine[];
      mergeMode?: 'merge' | 'replace';
      deviceId?: string;
      platform?: string;
      shippingPreviewLocation?: {
        country?: string;
        city?: string;
        state?: string;
        zip?: string;
      };
    };

    const deviceId =
      String(body.deviceId || req.get('x-device-id') || 'unknown').trim() || 'unknown';
    const platform = parsePlatform(body.platform);
    const mergeMode = body.mergeMode === 'replace' ? 'replace' : 'merge';

    const out = await syncCloudCart({
      userId: req.user.id,
      clientLines: Array.isArray(body.items) ? body.items : [],
      mergeMode,
      deviceId,
      platform,
      userAgent: req.get('user-agent') || '',
      shippingPreviewLocation: body.shippingPreviewLocation,
    });

    return res.json({ success: true, ...out });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed to sync cart' });
  }
}
