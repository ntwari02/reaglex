import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
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
import { partialReleaseEscrow, releaseEscrow } from '../services/escrowService';
import { raiseDispute, resolveDispute } from '../services/disputeService';
import { selectOptimalGateway, markGatewayDown } from '../services/paymentOptimizer';
import {
  optimizeGatewayForOrder,
  initializeSmartPayment,
  payInstallment,
  setupSplitSchedule,
  setupCryptoPayment,
  confirmCryptoPayment,
} from '../services/paymentIntelligence.service';
import { buildBnplPlan, attachBnplToOrder } from '../services/creditService';
import { getWalletSummary, creditWallet, transferWallets } from '../services/walletEngine';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { SellerWallet } from '../models/SellerWallet';
import { TransactionLog } from '../models/TransactionLog';
import { SellerSettings } from '../models/SellerSettings';
import mongoose from 'mongoose';
import crypto from 'crypto';

const router = Router();

const MOMO_REFERENCE_UUID =
  /^[\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;

function isInventoryOutOfStockError(err: unknown): boolean {
  const name = (err as any)?.name;
  const msg = String((err as any)?.message || '').toLowerCase();
  return name === 'InventoryOutOfStockError' || msg.includes('insufficient stock') || msg.includes('out of stock');
}

function mapCheckoutPaymentMethod(raw?: string): 'flutterwave' | 'momo' | 'stripe' | 'paypal' | 'airtel' {
  const m = String(raw || 'flutterwave').toLowerCase();
  if (m === 'momo' || m === 'mtn' || m === 'mtn_momo') return 'momo';
  if (m === 'stripe') return 'stripe';
  if (m === 'paypal') return 'paypal';
  if (m === 'airtel' || m === 'airtel_money') return 'airtel';
  return 'flutterwave';
}

// Payment intelligence: smart gateway recommendation
router.post('/optimize-gateway', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { country, amount, preferredMethod } = req.body as {
      country?: string;
      amount?: number;
      preferredMethod?: string;
    };
    const selection = await selectOptimalGateway({
      country,
      amount,
      preferredMethod: mapCheckoutPaymentMethod(preferredMethod),
    });
    return res.json({ paymentOptimizer: selection });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Gateway optimization failed' });
  }
});

// Initialize payment with automatic gateway selection
router.post('/initialize-smart', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId, country, preferredMethod } = req.body as {
      orderId?: string;
      country?: string;
      preferredMethod?: string;
    };
    if (!orderId || !req.user) {
      return res.status(400).json({ message: 'orderId is required' });
    }
    const order = await Order.findById(orderId);
    if (!order || order.buyerId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const out = await initializeSmartPayment({
      orderId,
      buyer: {
        _id: req.user.id,
        email: req.user.email,
        phone: req.user.phone,
        fullName: req.user.fullName ?? req.user.email,
      },
      country,
      preferredMethod,
    });
    return res.json(out);
  } catch (err: any) {
    if (err instanceof PaymentGatewayDisabledError) {
      return res.status(403).json({ message: err.message, code: err.code, gatewayKey: err.gatewayKey });
    }
    return res.status(500).json({ message: err?.message || 'Smart payment init failed' });
  }
});

// Initialize payment (Flutterwave, MTN, Stripe Checkout, PayPal, Airtel)
router.post('/initialize', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId, paymentMethod: rawMethod, momoPhone, airtelPhone, autoSelectGateway } = req.body as {
      orderId?: string;
      paymentMethod?: string;
      momoPhone?: string;
      airtelPhone?: string;
      autoSelectGateway?: boolean;
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
      { paymentMethod, momoPhone, airtelPhone, autoSelectGateway: Boolean(autoSelectGateway) }
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
    if (isInventoryOutOfStockError(err)) {
      return res.status(409).json({ message: 'Out of stock. Another buyer may have just purchased the last item.' });
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

const paymentCompleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many payment completion requests.' },
});

// Stripe Checkout: complete after redirect (SPA calls this with session_id)
router.get('/stripe/complete', paymentCompleteLimiter, async (req, res) => {
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
    if (isInventoryOutOfStockError(err)) {
      return res.status(409).json({ message: 'Out of stock. Another buyer may have just purchased the last item.' });
    }
    return res.status(500).json({ message: e?.message || 'Stripe completion failed' });
  }
});

// PayPal: return handler — query token is the PayPal order ID
router.get('/paypal/complete', paymentCompleteLimiter, async (req, res) => {
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
    if (isInventoryOutOfStockError(err)) {
      return res.status(409).json({ message: 'Out of stock. Another buyer may have just purchased the last item.' });
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
    if (isInventoryOutOfStockError(err)) {
      return res.status(409).json({ message: 'Out of stock. Another buyer may have just purchased the last item.' });
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
    if (isInventoryOutOfStockError(err)) {
      return res.status(409).json({ message: 'Out of stock. Another buyer may have just purchased the last item.' });
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

// Buyer: purchase delivery protection insurance before payment settles.
router.post('/orders/:orderId/insurance', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ message: 'Invalid order ID' });

    const order = await Order.findById(orderId);
    if (!order || order.buyerId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.payment?.paidAt || order.escrow?.status !== 'PENDING') {
      return res.status(400).json({ message: 'Insurance can only be added before payment confirmation' });
    }

    const premium = Math.max(0, Number((req.body as any)?.premium ?? 2));
    const coverageTypes = Array.isArray((req.body as any)?.coverageTypes) && (req.body as any).coverageTypes.length
      ? (req.body as any).coverageTypes
      : ['damaged', 'lost', 'late'];

    const base = Number(order.subtotal || 0) + Number(order.shipping || 0) + Number(order.tax || 0);
    order.total = Math.round((base + premium) * 100) / 100;
    order.escrow = {
      ...(order.escrow || ({} as any)),
      insurance: {
        enabled: true,
        plan: 'delivery_protection',
        premium,
        currency: order.currencySnapshot?.currency || 'USD',
        coverageTypes,
        compensationCap: base,
        status: 'active',
      },
    } as any;
    await order.save();
    return res.json({ success: true, insurance: order.escrow?.insurance, total: order.total });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to purchase insurance', error: err.message });
  }
});

// Buyer/Seller/Admin: store unboxing and dispute media hashes as evidence vault.
router.post('/orders/:orderId/evidence-vault', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ message: 'Invalid order ID' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const isBuyer = String(order.buyerId) === req.user.id;
    const isSeller = String(order.sellerId) === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isBuyer && !isSeller && !isAdmin) return res.status(403).json({ message: 'Access denied' });

    const media = Array.isArray((req.body as any)?.media) ? (req.body as any).media : [];
    if (!media.length) return res.status(400).json({ message: 'media is required' });
    const uploadedBy = isAdmin ? 'admin' : isSeller ? 'seller' : 'buyer';
    const normalized = media
      .filter((m: any) => typeof m?.url === 'string' && m.url.trim())
      .map((m: any) => ({
        type: m?.type === 'image' || m?.type === 'document' ? m.type : 'video',
        url: String(m.url),
        uploadedBy,
        uploadedAt: new Date(),
        note: m?.note ? String(m.note) : undefined,
      }));
    if (!normalized.length) return res.status(400).json({ message: 'At least one valid media url is required' });

    const providedHash = String((req.body as any)?.hash || '').trim();
    const computedHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(normalized.map((m: any) => ({ type: m.type, url: m.url }))))
      .digest('hex');
    const hash = providedHash || computedHash;
    const verificationStatus =
      providedHash && providedHash !== computedHash ? 'tampered' : 'verified';

    order.evidence = {
      media: [...(order.evidence?.media || []), ...normalized] as any,
      hash,
      verificationStatus,
      lastUpdatedAt: new Date(),
    };
    await order.save();

    return res.json({
      success: true,
      evidence: order.evidence,
      integrity: { computedHash, providedHash: providedHash || undefined, verificationStatus },
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to store evidence', error: err.message });
  }
});

// Admin: release selected escrow component partially.
router.post('/orders/:orderId/escrow/partial-release', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const { orderId } = req.params;
    const component = String((req.body as any)?.component || '');
    const amount = Number((req.body as any)?.amount);
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ message: 'Invalid order ID' });
    if (!['product', 'shipping', 'tax', 'seller_reserve'].includes(component)) {
      return res.status(400).json({ message: 'Invalid component' });
    }
    const out = await partialReleaseEscrow(
      orderId,
      component as 'product' | 'shipping' | 'tax' | 'seller_reserve',
      amount,
      req.user.id
    );
    return res.json(out);
  } catch (err: any) {
    return res.status(500).json({ message: 'Partial release failed', error: err.message });
  }
});

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
        evidence: order.evidence,
      });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Get escrow status error:', err);
      return res.status(500).json({ message: 'Failed to get escrow status' });
    }
  }
);

// Seller withdrawal request (from available balance)
router.get(
  '/seller/wallet',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const sellerObjectId = new mongoose.Types.ObjectId(req.user.id);
      const wallet = await SellerWallet.findOne({ sellerId: sellerObjectId }).lean();
      const orders = await Order.find({ sellerId: sellerObjectId } as any)
        .select('escrow.status fees')
        .lean();
      const recent = await TransactionLog.find({ sellerId: sellerObjectId, type: { $in: ['PAYMENT', 'RELEASE', 'WITHDRAWAL'] } })
        .sort({ createdAt: -1 })
        .limit(12)
        .lean();

      const heldOrderCount = orders.filter((o: any) => ['PENDING', 'ESCROW_HOLD', 'SHIPPED', 'DISPUTED'].includes(String(o?.escrow?.status || ''))).length;
      const releasedOrderCount = orders.filter((o: any) => ['RELEASED', 'AUTO_RELEASED'].includes(String(o?.escrow?.status || ''))).length;
      const feeTotals = orders.reduce(
        (acc: { platform: number; processing: number; sellerNet: number }, o: any) => {
          acc.platform += Number(o?.fees?.platformFeeAmount || 0);
          acc.processing += Number(o?.fees?.flutterwaveFee || 0);
          acc.sellerNet += Number(o?.fees?.sellerAmount || 0);
          return acc;
        },
        { platform: 0, processing: 0, sellerNet: 0 },
      );

      const summary = {
        currency: wallet?.currency || 'USD',
        held: Number(wallet?.balance?.pending || 0),
        withdrawable: Number(wallet?.balance?.available || 0),
        withdrawn: Number(wallet?.balance?.withdrawn || 0),
      };
      const sellerSettings = await SellerSettings.findOne({ sellerId: sellerObjectId }).lean();
      const payoutMethods = Array.isArray(sellerSettings?.payoutMethods) ? sellerSettings!.payoutMethods : [];
      const visiblePayoutMethods = payoutMethods.map((m: any) => ({
        id: String(m?._id || ''),
        method: m?.method,
        isDefault: Boolean(m?.isDefault),
        mobileMoneyProvider: m?.mobileMoneyProvider,
        verificationStatus: m?.verificationStatus,
      }));

      return res.json({
        wallet: summary,
        escrow: {
          heldOrders: heldOrderCount,
          releasedOrders: releasedOrderCount,
        },
        fees: feeTotals,
        payoutMethods: visiblePayoutMethods,
        recentTransactions: recent.map((r) => ({
          id: String(r._id),
          type: r.type,
          amount: r.amount,
          currency: r.currency,
          status: r.status,
          createdAt: r.createdAt,
          orderId: r.orderId ? String(r.orderId) : undefined,
        })),
      });
    } catch (err: any) {
      console.error('Seller wallet summary error:', err);
      return res.status(500).json({ message: 'Failed to load wallet summary' });
    }
  },
);

router.post(
  '/seller/withdraw',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { amount } = req.body;
      const payoutMethodId = String((req.body as any)?.payoutMethodId || '');
      const password = String((req.body as any)?.password || '');
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount' });
      }
      if (!password.trim()) {
        return res.status(400).json({ message: 'Password confirmation is required' });
      }

      const sellerUser = await User.findById(req.user.id).select('passwordHash').lean();
      if (!sellerUser?.passwordHash) {
        return res.status(401).json({ message: 'Could not verify seller account password' });
      }
      const bcrypt = (await import('bcryptjs')).default;
      const ok = await bcrypt.compare(password, sellerUser.passwordHash);
      if (!ok) {
        return res.status(401).json({ message: 'Invalid password confirmation' });
      }

      const sellerObjectId = new mongoose.Types.ObjectId(req.user.id);
      const wallet = await SellerWallet.findOne({ sellerId: sellerObjectId });
      if (!wallet || wallet.balance.available < amount) {
        return res.status(400).json({ message: 'Insufficient available balance' });
      }

      const sellerSettings = await SellerSettings.findOne({ sellerId: sellerObjectId }).lean();
      const payoutMethods = Array.isArray(sellerSettings?.payoutMethods) ? sellerSettings!.payoutMethods : [];
      const selectedMethod =
        (payoutMethodId
          ? payoutMethods.find((m: any) => String(m?._id || '') === payoutMethodId)
          : undefined) ||
        payoutMethods.find((m: any) => m?.isDefault) ||
        payoutMethods[0];
      if (!selectedMethod) {
        return res.status(400).json({ message: 'Add and verify a payout method before withdrawing funds' });
      }
      if (selectedMethod.verificationStatus && selectedMethod.verificationStatus !== 'verified') {
        return res.status(400).json({ message: 'Selected payout method must be verified before withdrawal' });
      }

      if (selectedMethod.method === 'mobile_money') {
        const provider = String(selectedMethod.mobileMoneyProvider || '').toLowerCase();
        if (provider.includes('mtn')) {
          await assertPaymentGatewayEnabled('mtn_momo');
        } else if (provider.includes('airtel')) {
          await assertPaymentGatewayEnabled('airtel_money');
        }
      } else if (selectedMethod.method === 'paypal') {
        await assertPaymentGatewayEnabled('paypal');
      } else if (selectedMethod.method === 'bank_transfer') {
        await assertPaymentGatewayEnabled('flutterwave');
      }

      // Move funds from available -> withdrawn once withdrawal is accepted.
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
        status: 'SUCCESS',
        metadata: {
          payoutMethodId: String((selectedMethod as any)._id || ''),
          payoutMethod: selectedMethod.method,
          mobileMoneyProvider: selectedMethod.mobileMoneyProvider,
          mobileMoneyNumber: selectedMethod.mobileMoneyNumber
            ? `****${String(selectedMethod.mobileMoneyNumber).slice(-4)}`
            : undefined,
        },
      });

      return res.json({ message: 'Withdrawal completed', amount });
    } catch (err: any) {
      if (err instanceof PaymentGatewayDisabledError) {
        return res.status(403).json({
          message: 'Selected withdrawal method is disabled by admin',
          code: err.code,
          gatewayKey: err.gatewayKey,
        });
      }
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
  authorize('admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { disputeId } = req.params;
      const { resolution } = req.body;

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
router.get('/admin/escrow/overview', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
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

// Admin: high-risk escrow auto-review queue
router.get('/admin/escrow/auto-review-queue', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, Number((req.query as any)?.page || 1));
    const limit = Math.min(100, Math.max(1, Number((req.query as any)?.limit || 20)));
    const skip = (page - 1) * limit;
    const riskTier = String((req.query as any)?.riskTier || '').trim().toLowerCase();

    const filter: any = { 'escrow.trustScore.autoReview': true };
    if (['low', 'medium', 'high'].includes(riskTier)) {
      filter['escrow.trustScore.riskTier'] = riskTier;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .select(
          '_id orderNumber sellerId buyerId status total createdAt escrow.trustScore escrow.status escrow.insurance'
        )
        .populate('buyerId', 'fullName email')
        .populate('sellerId', 'fullName email')
        .sort({ 'escrow.trustScore.evaluatedAt': -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    return res.json({
      queue: orders.map((o: any) => ({
        id: String(o._id),
        orderNumber: o.orderNumber,
        status: o.status,
        escrowStatus: o.escrow?.status,
        total: Number(o.total || 0),
        createdAt: o.createdAt,
        trustScore: o.escrow?.trustScore || null,
        insurance: o.escrow?.insurance || null,
        buyer: o.buyerId
          ? {
              id: String(o.buyerId?._id || o.buyerId),
              name: o.buyerId?.fullName || 'Unknown Buyer',
              email: o.buyerId?.email || '',
            }
          : null,
        seller: o.sellerId
          ? {
              id: String(o.sellerId?._id || o.sellerId),
              name: o.sellerId?.fullName || 'Unknown Seller',
              email: o.sellerId?.email || '',
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('Auto review queue error:', err);
    return res.status(500).json({ message: 'Failed to fetch auto review queue' });
  }
});

// Order-level gateway optimization snapshot
router.post('/orders/:orderId/optimize', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order || !req.user || order.buyerId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const selection = await optimizeGatewayForOrder(req.params.orderId, String(req.body?.country || ''));
    return res.json({ paymentOptimizer: selection });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Optimization failed' });
  }
});

// B2B split payment schedule (e.g. 30% now, 70% after production)
router.post('/orders/:orderId/split-schedule', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order || !req.user || order.buyerId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const schedule = Array.isArray(req.body?.paymentSchedule) ? req.body.paymentSchedule : [];
    if (!schedule.length) {
      return res.status(400).json({ message: 'paymentSchedule array is required' });
    }
    await setupSplitSchedule(
      req.params.orderId,
      schedule.map((s: { amount: number; dueDate: string }) => ({
        amount: Number(s.amount),
        dueDate: String(s.dueDate),
      }))
    );
    const updated = await Order.findById(req.params.orderId).select('paymentIntelligence').lean();
    return res.json({ paymentSchedule: updated?.paymentIntelligence?.paymentSchedule || [] });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed to set split schedule' });
  }
});

router.post('/orders/:orderId/pay-installment', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const order = await Order.findById(req.params.orderId);
    if (!order || order.buyerId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const out = await payInstallment({
      orderId: req.params.orderId,
      buyer: {
        _id: req.user.id,
        email: req.user.email,
        phone: req.user.phone,
        fullName: req.user.fullName ?? req.user.email,
      },
      installmentIndex: Number(req.body?.installmentIndex || 0),
      paymentMethod: req.body?.paymentMethod,
      country: req.body?.country,
    });
    return res.json(out);
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Installment payment failed' });
  }
});

// Buy Now Pay Later quote + attach to order
router.post('/bnpl/quote', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { totalAmount, installments, aprPercent, provider } = req.body as {
      totalAmount?: number;
      installments?: number;
      aprPercent?: number;
      provider?: string;
    };
    if (!totalAmount) return res.status(400).json({ message: 'totalAmount is required' });
    const plan = buildBnplPlan({
      totalAmount: Number(totalAmount),
      installments: Number(installments ?? 6),
      aprPercent,
      provider,
    });
    return res.json({ bnpl: plan });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'BNPL quote failed' });
  }
});

router.post('/orders/:orderId/bnpl', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order || !req.user || order.buyerId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const plan = buildBnplPlan({
      totalAmount: Number(order.total),
      installments: Number(req.body?.installments || 6),
      aprPercent: Number(req.body?.aprPercent || 12),
      provider: String(req.body?.provider || 'KCB'),
    });
    await attachBnplToOrder(req.params.orderId, plan);
    return res.json({ bnpl: plan });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'BNPL setup failed' });
  }
});

// Cryptocurrency (BTC / USDT) — escrow-compatible deposit flow
router.post('/orders/:orderId/crypto', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order || !req.user || order.buyerId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const asset = String(req.body?.asset || 'USDT').toUpperCase() === 'BTC' ? 'BTC' : 'USDT';
    const out = await setupCryptoPayment(req.params.orderId, asset, req.body?.network);
    return res.json(out);
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Crypto setup failed' });
  }
});

router.post('/orders/:orderId/crypto/confirm', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order || !req.user || order.buyerId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const out = await confirmCryptoPayment(req.params.orderId, req.body?.txRef);
    return res.json(out);
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Crypto confirmation failed' });
  }
});

// Internal wallet economy
router.get('/wallets', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const wallets = await getWalletSummary(req.user.id);
    return res.json({ wallets });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed to load wallets' });
  }
});

router.post('/wallets/credit', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const { walletType, amount, currency } = req.body as {
      walletType?: string;
      amount?: number;
      currency?: string;
    };
    const allowed = ['buyer', 'seller', 'reward', 'referral', 'cashback', 'credit'];
    if (!walletType || !allowed.includes(walletType)) {
      return res.status(400).json({ message: 'Valid walletType is required' });
    }
    const wallet = await creditWallet({
      userId: req.user.id,
      walletType: walletType as any,
      amount: Number(amount || 0),
      currency,
    });
    return res.json({ wallet });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Wallet credit failed' });
  }
});

router.post('/wallets/transfer', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const { fromType, toUserId, toType, amount } = req.body as {
      fromType?: string;
      toUserId?: string;
      toType?: string;
      amount?: number;
    };
    if (!fromType || !toUserId || !toType || !amount) {
      return res.status(400).json({ message: 'fromType, toUserId, toType, amount are required' });
    }
    const out = await transferWallets({
      fromUserId: req.user.id,
      fromType: fromType as any,
      toUserId,
      toType: toType as any,
      amount: Number(amount),
    });
    return res.json(out);
  } catch (err: any) {
    return res.status(400).json({ message: err?.message || 'Wallet transfer failed' });
  }
});

// Admin: mark gateway down (e.g. MTN outage → auto-failover on next smart init)
router.patch('/admin/gateway-status', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gatewayKey, isDown, reason } = req.body as {
      gatewayKey?: string;
      isDown?: boolean;
      reason?: string;
    };
    if (!gatewayKey) return res.status(400).json({ message: 'gatewayKey is required' });
    await markGatewayDown(gatewayKey, Boolean(isDown), reason);
    return res.json({ gatewayKey, isDown: Boolean(isDown), reason });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed to update gateway status' });
  }
});

export default router;

