import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import {
  initializePayment,
  verifyPayment,
  syncMomoOrderPayment,
  syncAirtelOrderPayment,
  handleMomoCallbackPayload,
} from '../services/paymentService';
import { processStripeCheckoutSession } from '../services/stripeCheckout.service';
import { capturePayPalOrder } from '../services/paypalCheckout.service';
import {
  assertPaymentGatewayEnabled,
  PaymentGatewayDisabledError,
} from '../services/paymentGateway.service';
import { releaseEscrow } from '../services/escrowService';
import { raiseDispute, resolveDispute } from '../services/disputeService';
import { Order } from '../models/Order';
import { SellerWallet } from '../models/SellerWallet';
import { TransactionLog } from '../models/TransactionLog';
import mongoose from 'mongoose';

const router = Router();

const MOMO_REFERENCE_UUID =
  /^[\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;

function mapCheckoutPaymentMethod(raw?: string): 'flutterwave' | 'momo' | 'stripe' | 'paypal' | 'airtel' {
  const m = String(raw || 'flutterwave').toLowerCase();
  if (m === 'momo' || m === 'mtn' || m === 'mtn_momo') return 'momo';
  if (m === 'stripe') return 'stripe';
  if (m === 'paypal') return 'paypal';
  if (m === 'airtel' || m === 'airtel_money') return 'airtel';
  return 'flutterwave';
}

// Initialize payment (Flutterwave, MTN, Stripe Checkout, PayPal, Airtel)
router.post('/initialize', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId, paymentMethod: rawMethod, momoPhone, airtelPhone } = req.body as {
      orderId?: string;
      paymentMethod?: string;
      momoPhone?: string;
      airtelPhone?: string;
    };
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

    const paymentMethod = mapCheckoutPaymentMethod(rawMethod);

    const paymentInit = await initializePayment(
      orderId,
      {
        _id: req.user.id,
        email: req.user.email,
        phone: req.user.phone,
        fullName: req.user.fullName ?? req.user.email,
      } as any,
      { paymentMethod, momoPhone, airtelPhone }
    );

    return res.json(paymentInit);
  } catch (err: any) {
    if (err instanceof PaymentGatewayDisabledError) {
      return res.status(403).json({
        message: 'This payment method is currently disabled',
        code: err.code,
        gatewayKey: err.gatewayKey,
      });
    }
    // eslint-disable-next-line no-console
    console.error('Initialize payment error:', err);
    const msg = typeof err?.message === 'string' ? err.message : 'Failed to initialize payment';
    const clientError =
      msg.includes('not configured') ||
      msg.includes('phone number') ||
      msg.includes('RWF') ||
      msg.includes('CLIENT_URL') ||
      msg.includes('public callback URL') ||
      msg.includes('MOMO_CALLBACK_URL') ||
      msg.includes('SERVER_URL') ||
      msg.includes('INVALID_CURRENCY') ||
      msg.includes('Currency not supported') ||
      msg.includes('currency mismatch') ||
      msg.includes('MTN MoMo sandbox collection');
    return res.status(clientError ? 400 : 500).json({ message: msg });
  }
});

// MTN MoMo: poll status and finalize escrow when successful (authenticated buyer)
router.get('/momo/status/:referenceId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const { referenceId } = req.params;
    if (!referenceId || !MOMO_REFERENCE_UUID.test(referenceId)) {
      return res.status(400).json({ message: 'Invalid reference id' });
    }

    await assertPaymentGatewayEnabled('mtn_momo');

    const result = await syncMomoOrderPayment(referenceId, { buyerUserId: req.user.id });
    return res.json(result);
  } catch (err: any) {
    if (err instanceof PaymentGatewayDisabledError) {
      return res.status(403).json({
        message: 'This payment method is currently disabled',
        code: err.code,
        gatewayKey: err.gatewayKey,
      });
    }
    // eslint-disable-next-line no-console
    console.error('MoMo status error:', err);
    return res.status(500).json({ message: err?.message || 'Failed to sync payment status' });
  }
});

// MTN MoMo callback / webhook (verified server-side against MTN status API)
router.post('/momo/callback', async (req, res) => {
  try {
    const headerRef = req.get('X-Reference-Id') || req.get('x-reference-id') || undefined;
    let raw = req.body;
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw) as unknown;
      } catch {
        raw = {};
      }
    }
    const body =
      raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const out = await handleMomoCallbackPayload(body, headerRef);
    return res.status(out.ok ? 200 : 400).json(out);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('MoMo callback error:', err);
    return res.status(500).json({ ok: false, message: err?.message || 'Callback failed' });
  }
});

// Stripe Checkout: complete after redirect (SPA calls this with session_id)
router.get('/stripe/complete', async (req, res) => {
  try {
    const sessionId = String((req.query as { session_id?: string }).session_id || '').trim();
    if (!sessionId) {
      return res.status(400).json({ message: 'session_id is required' });
    }
    await assertPaymentGatewayEnabled('stripe');
    const out = await processStripeCheckoutSession(sessionId);
    return res.json(out);
  } catch (err: unknown) {
    const e = err as { message?: string };
    if (err instanceof PaymentGatewayDisabledError) {
      return res.status(403).json({ message: 'Stripe is disabled', code: err.code });
    }
    return res.status(500).json({ message: e?.message || 'Stripe completion failed' });
  }
});

// PayPal: return handler — query token is the PayPal order ID
router.get('/paypal/complete', async (req, res) => {
  try {
    const token = String((req.query as { token?: string }).token || '').trim();
    if (!token) {
      return res.status(400).json({ message: 'token (PayPal order id) is required' });
    }
    await assertPaymentGatewayEnabled('paypal');
    const out = await capturePayPalOrder(token);
    return res.json(out);
  } catch (err: unknown) {
    const e = err as { message?: string };
    if (err instanceof PaymentGatewayDisabledError) {
      return res.status(403).json({ message: 'PayPal is disabled', code: err.code });
    }
    return res.status(500).json({ message: e?.message || 'PayPal capture failed' });
  }
});

// Airtel Money: poll collection status
router.get('/airtel/status/:transactionId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const { transactionId } = req.params;
    if (!transactionId?.trim()) {
      return res.status(400).json({ message: 'Invalid transaction id' });
    }
    await assertPaymentGatewayEnabled('airtel_money');
    const result = await syncAirtelOrderPayment(transactionId.trim(), { buyerUserId: req.user.id });
    return res.json(result);
  } catch (err: any) {
    if (err instanceof PaymentGatewayDisabledError) {
      return res.status(403).json({
        message: 'This payment method is currently disabled',
        code: err.code,
        gatewayKey: err.gatewayKey,
      });
    }
    return res.status(500).json({ message: err?.message || 'Failed to sync Airtel payment' });
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
    if (err instanceof PaymentGatewayDisabledError) {
      return res.status(403).json({
        message: 'This payment method is currently disabled',
        code: err.code,
        gatewayKey: err.gatewayKey,
      });
    }
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

