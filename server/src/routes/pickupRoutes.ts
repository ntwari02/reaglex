import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { Order } from '../models/Order';

const router = Router();

// POST /api/pickup/arrived
router.post('/arrived', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const buyerId = new mongoose.Types.ObjectId(req.user.id);
    const { orderId, vehicleColor, vehicleModel, plate, parkingSlot } = req.body as {
      orderId: string;
      vehicleColor?: string;
      vehicleModel?: string;
      plate?: string;
      parkingSlot?: string;
    };
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ message: 'Invalid order ID' });
    const order = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId), buyerId } as any);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if ((order as any)?.fulfillment?.type !== 'pickup') {
      return res.status(400).json({ message: 'Order is not pickup fulfillment' });
    }

    (order as any).pickup = {
      ...((order as any).pickup || {}),
      arrivedAt: new Date(),
      arrivalMeta: {
        vehicleColor: String(vehicleColor || ''),
        vehicleModel: String(vehicleModel || ''),
        plate: String(plate || ''),
        parkingSlot: String(parkingSlot || ''),
      },
    };
    await order.save();
    return res.json({
      success: true,
      message: 'Arrival confirmed. Seller has been notified in dashboard flow.',
      arrival: (order as any).pickup?.arrivalMeta,
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to register arrival', error: err.message });
  }
});

export default router;
