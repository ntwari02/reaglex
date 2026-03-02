import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { initializePayment, verifyPayment } from '../services/paymentService';
import { releaseEscrow } from '../services/escrowService';
import { raiseDispute, resolveDispute } from '../services/disputeService';
import { Order } from '../models/Order';
import { SellerWallet } from '../models/SellerWallet';
import { TransactionLog } from '../models/TransactionLog';
import mongoose from 'mongoose';

const router = Router();

// Initialize payment
router.post('/initialize', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const order = await Order.findById(orderId);
    if (!order || order.buyerId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const paymentInit = await initializePayment(orderId, {
      _id: req.user.id,
      email: req.user.email,
      phone: req.user.phone,
      fullName: req.user.fullName ?? req.user.email,
    } as any);

    return res.json(paymentInit);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('Initialize payment error:', err);
    return res.status(500).json({ message: 'Failed to initialize payment' });
  }
});

// Verify payment (redirect callback)
router.get('/verify', async (req, res) => {
  try {
    const { transaction_id, order_id } = req.query as any;
    if (!transaction_id || !order_id) {
      return res.status(400).json({ message: 'Missing transaction_id or order_id' });
    }

    const result = await verifyPayment(transaction_id, order_id);
    return res.json(result);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('Verify payment error:', err);
    return res.status(500).json({ message: 'Payment verification failed' });
  }
});

// Confirm delivery (buyer → triggers escrow release)
router.post(
  '/orders/:orderId/confirm-delivery',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const order = await Order.findById(orderId);
      if (!order || order.buyerId.toString() !== req.user.id) {
        return res.status(404).json({ message: 'Order not found' });
      }

      const result = await releaseEscrow(orderId, req.user.id);
      return res.json(result);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Confirm delivery error:', err);
      return res.status(500).json({ message: 'Failed to confirm delivery' });
    }
  }
);

// Raise dispute (buyer)
router.post(
  '/orders/:orderId/dispute',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      const { reason, evidence } = req.body;

      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      if (!reason) {
        return res.status(400).json({ message: 'Reason is required' });
      }

      await raiseDispute(orderId, req.user.id, reason, evidence);
      return res.json({ message: 'Dispute raised successfully' });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Raise dispute error:', err);
      return res.status(500).json({ message: 'Failed to raise dispute' });
    }
  }
);

// Get escrow status
router.get(
  '/orders/:orderId/escrow-status',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ message: 'Invalid order ID' });
      }

      const order = await Order.findById(orderId).lean();
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      if (order.buyerId.toString() !== req.user?.id && order.sellerId.toString() !== req.user?.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      return res.json({
        escrow: order.escrow,
        fees: order.fees,
        payout: order.payout,
        payment: order.payment,
      });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Get escrow status error:', err);
      return res.status(500).json({ message: 'Failed to get escrow status' });
    }
  }
);

// Seller withdrawal request (from available balance)
router.post(
  '/seller/withdraw',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount' });
      }

      const sellerObjectId = new mongoose.Types.ObjectId(req.user.id);
      const wallet = await SellerWallet.findOne({ sellerId: sellerObjectId });
      if (!wallet || wallet.balance.available < amount) {
        return res.status(400).json({ message: 'Insufficient available balance' });
      }

      // Here you would typically initiate a transfer to seller bank using Flutterwave.
      // For now we simply move funds from available → withdrawn.
      await SellerWallet.updateOne(
        { sellerId: sellerObjectId },
        {
          $inc: {
            'balance.available': -amount,
            'balance.withdrawn': amount,
          },
        }
      );

      await TransactionLog.create({
        type: 'WITHDRAWAL',
        sellerId: new mongoose.Types.ObjectId(req.user.id),
        amount,
        currency: wallet.currency,
        status: 'PENDING',
      });

      return res.json({ message: 'Withdrawal requested', pendingAmount: amount });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Seller withdraw error:', err);
      return res.status(500).json({ message: 'Failed to request withdrawal' });
    }
  }
);

// Admin: resolve dispute
router.post(
  '/admin/disputes/:disputeId/resolve',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { disputeId } = req.params;
      const { resolution } = req.body;

      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin only' });
      }

      if (!['BUYER_WINS', 'SELLER_WINS'].includes(resolution)) {
        return res.status(400).json({ message: 'Invalid resolution' });
      }

      await resolveDispute(disputeId, resolution, req.user.id);
      return res.json({ message: 'Dispute resolved' });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Resolve dispute error:', err);
      return res.status(500).json({ message: 'Failed to resolve dispute' });
    }
  }
);

// Admin: escrow dashboard overview
router.get('/admin/escrow/overview', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const held = await TransactionLog.aggregate([
      { $match: { type: 'PAYMENT' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const released = await TransactionLog.aggregate([
      { $match: { type: 'RELEASE' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const refunded = await TransactionLog.aggregate([
      { $match: { type: 'REFUND' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return res.json({
      totalHeld: held[0]?.total || 0,
      totalReleased: released[0]?.total || 0,
      totalRefunded: refunded[0]?.total || 0,
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('Escrow overview error:', err);
    return res.status(500).json({ message: 'Failed to fetch escrow overview' });
  }
});

export default router;

