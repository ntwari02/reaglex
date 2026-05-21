import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// POST /api/warehouse/scan
router.post('/scan', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const role = req.user.role;
    if (!['seller', 'admin'].includes(String(role))) {
      return res.status(403).json({ message: 'Warehouse scan is restricted' });
    }

    const { scanType, value, deviceId, warehouseId } = req.body as {
      scanType: 'barcode' | 'rfid' | 'iot';
      value: string;
      deviceId?: string;
      warehouseId?: string;
    };

    if (!['barcode', 'rfid', 'iot'].includes(String(scanType))) {
      return res.status(400).json({ message: 'Invalid scanType' });
    }
    if (!String(value || '').trim()) {
      return res.status(400).json({ message: 'value is required' });
    }

    const event = {
      scanType,
      value: String(value).trim(),
      deviceId: String(deviceId || 'scanner-default'),
      warehouseId: String(warehouseId || 'default'),
      scannedAt: new Date(),
      actorId: req.user.id,
      status: 'accepted',
    };

    // Future-ready endpoint: currently acknowledges scanner events.
    return res.status(201).json({ success: true, event });
  } catch (err: any) {
    return res.status(500).json({ message: 'Warehouse scan failed', error: err.message });
  }
});

export default router;
