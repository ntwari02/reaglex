import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { handleAgentChat, AgentContext } from '../services/GeminiAgentService';
import {
  normalizeCommerceProvider,
  performCheckoutSingleProduct,
  type CommerceCheckoutProvider,
  type ShippingSpeed,
} from '../services/commerceCheckout.helper';

function roleFromUser(role?: string) {
  if (role === 'admin') return 'admin';
  if (role === 'seller') return 'seller';
  if (role === 'buyer') return 'buyer';
  return 'guest';
}

/**
 * POST /api/ai/agent
 * Body: { message: string, currentPath?: string }
 *
 * Auth: optional. Tools enforce authorization regardless.
 */
export async function postAiAgent(req: AuthenticatedRequest, res: Response) {
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) {
      return res.status(400).json({ message: 'Message is required.' });
    }

    const currentPath = req.body?.currentPath ? String(req.body.currentPath) : req.path;

    const userId = req.user?.id ? String(req.user.id) : null;
    const role = req.user?.role ? (roleFromUser(req.user.role) as AgentContext['role']) : 'guest';

    const ctx: AgentContext = {
      userId,
      role,
      email: req.user?.email,
      fullName: (req.user as any)?.fullName,
      currentPath,
    };

    const result = await handleAgentChat(message, ctx);
    return res.json({
      reply: result.reply,
      products: result.products,
      productLayout: result.productLayout,
      checkout: result.checkout,
      actionResult: result.actionResult,
      model: result.modelUsed,
      fallbackOccurred: result.fallbackOccurred,
    });
  } catch (error: any) {
    const msg = error?.message || 'AI agent failed';
    if (msg.includes('GEMINI_API_KEY')) {
      return res.status(503).json({ message: 'Assistant is not configured. Set GEMINI_API_KEY on the server.' });
    }
    // eslint-disable-next-line no-console
    console.error('postAiAgent error:', error);
    return res.status(500).json({ message: msg });
  }
}

/**
 * POST /api/ai/checkout
 * Authenticated buyer: create order + payment session for one product (same logic as checkoutSingleProduct tool).
 */
export async function postAiCheckout(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'buyer') {
      return res.status(403).json({ message: 'Buyer account required.' });
    }

    const body = req.body || {};
    const productId = String(body.productId || '').trim();
    if (!productId) {
      return res.status(400).json({ message: 'productId is required.' });
    }

    const quantity = Math.max(1, Math.min(99, Number(body.quantity) || 1));
    const fullName = String(body.fullName || '').trim();
    const phone = String(body.phone || '').trim();
    const addressLine1 = String(body.addressLine1 || '').trim();
    const addressLine2 = body.addressLine2 ? String(body.addressLine2).trim() : '';
    const city = String(body.city || '').trim();
    const state = String(body.state || '').trim();
    const postalCode = String(body.postalCode || '').trim();
    const country = String(body.country || '').trim();

    if (!fullName || !phone || !addressLine1 || !city || !postalCode || !country) {
      return res.status(400).json({ message: 'Missing required shipping fields.' });
    }

    const speedRaw = String(body.shippingSpeed || 'standard').toLowerCase();
    const shippingSpeed: ShippingSpeed = ['express', 'international'].includes(speedRaw)
      ? (speedRaw as ShippingSpeed)
      : 'standard';

    const paymentProviderRaw = body.paymentProvider != null ? String(body.paymentProvider) : 'flutterwave';
    const paymentProvider: CommerceCheckoutProvider = normalizeCommerceProvider(paymentProviderRaw);
    const momoPhone = body.momoPhone != null ? String(body.momoPhone).trim() : undefined;
    const airtelPhone = body.airtelPhone != null ? String(body.airtelPhone).trim() : undefined;

    const result = await performCheckoutSingleProduct({
      buyerId: req.user.id,
      productId,
      quantity,
      shipping: {
        fullName,
        phone,
        addressLine1,
        addressLine2: addressLine2 || undefined,
        city,
        state,
        postalCode,
        country,
      },
      shippingSpeed,
      paymentProvider,
      momoPhone,
      airtelPhone,
    });

    if (!result.ok) {
      return res.status(400).json({ message: result.error || 'Checkout failed' });
    }

    return res.json({
      orderNumber: result.orderNumber,
      orderId: result.orderId,
      paymentLink: result.paymentLink,
      provider: result.provider,
      referenceId: result.referenceId,
      amount: result.amount,
      currency: result.currency,
      message: result.message,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Checkout failed' });
  }
}

