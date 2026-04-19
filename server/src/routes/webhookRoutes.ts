import { Router, Request, Response } from 'express';
import { verifyPayment } from '../services/paymentService';
import { assertPaymentGatewayEnabled } from '../services/paymentGateway.service';
import { Order } from '../models/Order';
import { sendNotification } from '../services/notificationService';
import axios from 'axios';
import { getFlutterwaveResolvedConfig, getPaypalCredentialsResolved } from '../services/paymentGatewayCredentials.service';
import { getPayPalAccessToken } from '../services/paypalCheckout.service';

const router = Router();

router.post('/flutterwave/webhook', async (req: Request, res: Response) => {
  let secretHash = '';
  try {
    const cfg = await getFlutterwaveResolvedConfig();
    secretHash = String(cfg.webhookSecretHash || '').trim();
  } catch {
    secretHash = '';
  }
  const signature = req.headers['verif-hash'] as string | undefined;

  if (!secretHash || !signature || signature !== secretHash) {
    return res.status(401).send('Unauthorized');
  }

  const payload = req.body;

  try {
    switch (payload.event) {
      case 'charge.completed':
        if (payload.data.status === 'successful') {
          const oid = payload.data?.meta?.order_id;
          if (oid) {
            const ord = await Order.findById(oid).lean();
            const awaiting =
              ord && (ord as any).escrow?.status === 'PENDING' && !(ord as any).payment?.paidAt;
            if (awaiting) {
              await assertPaymentGatewayEnabled('flutterwave');
            }
          }
          await verifyPayment(payload.data.id, payload.data.meta.order_id);
        }
        break;

      case 'transfer.completed':
        await handleTransferComplete(payload.data);
        break;

      case 'transfer.failed':
        await handleTransferFailed(payload.data);
        break;

      case 'refund.completed':
        await handleRefundComplete(payload.data);
        break;

      default:
        break;
    }

    return res.sendStatus(200);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Flutterwave webhook error', err);
    return res.sendStatus(500);
  }
});

/**
 * PayPal webhooks (optional but recommended): verifies signature using webhook_id from admin configuration.
 * Configure listener URL in PayPal dashboard: /api/webhooks/paypal/webhook
 */
router.post('/paypal/webhook', async (req: Request, res: Response) => {
  try {
    const creds = await getPaypalCredentialsResolved();
    const webhookId = String((creds as any).webhookId || '').trim();
    if (!webhookId) {
      return res.status(503).json({ ok: false, message: 'PayPal webhook is not configured (missing webhookId)' });
    }

    const transmissionId = String(req.header('paypal-transmission-id') || '');
    const transmissionTime = String(req.header('paypal-transmission-time') || '');
    const certUrl = String(req.header('paypal-cert-url') || '');
    const authAlgo = String(req.header('paypal-auth-algo') || '');
    const transmissionSig = String(req.header('paypal-transmission-sig') || '');

    if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
      return res.status(400).json({ ok: false, message: 'Missing PayPal signature headers' });
    }

    const { token, base } = await getPayPalAccessToken();
    const verifyRes = await axios.post(
      `${base}/v1/notifications/verify-webhook-signature`,
      {
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: authAlgo,
        transmission_sig: transmissionSig,
        webhook_id: webhookId,
        webhook_event: req.body,
      },
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 25_000,
        validateStatus: () => true,
      }
    );

    if (verifyRes.status !== 200 || verifyRes.data?.verification_status !== 'SUCCESS') {
      return res.status(401).json({ ok: false, message: 'Invalid PayPal webhook signature' });
    }

    // Best-effort finalize: for CAPTURE completed, use custom_id to find local order
    const evt = req.body as any;
    const eventType = String(evt?.event_type || '');
    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const customId = evt?.resource?.custom_id || evt?.resource?.supplementary_data?.related_ids?.order_id;
      // If we don't have our local order id, just ack.
      if (customId) {
        const ord = await Order.findById(String(customId)).lean();
        const awaiting =
          ord && (ord as any).escrow?.status === 'PENDING' && !(ord as any).payment?.paidAt;
        if (awaiting) {
          await assertPaymentGatewayEnabled('paypal');
          // capture flow already finalizes; webhook is backup. We do not double-capture here.
        }
      }
    }

    return res.sendStatus(200);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('PayPal webhook error', err);
    return res.sendStatus(500);
  }
});

async function handleTransferComplete(data: any) {
  const order = await Order.findOne({
    'payout.transferId': String(data.id),
  });

  if (order) {
    await Order.findByIdAndUpdate(order._id, {
      'payout.transferStatus': 'SUCCESS',
    });
    await sendNotification(order.sellerId.toString(), 'PAYOUT_CONFIRMED', {
      amount: data.amount,
    });
  }
}

async function handleTransferFailed(data: any) {
  const order = await Order.findOne({
    'payout.transferId': String(data.id),
  });

  if (order) {
    await Order.findByIdAndUpdate(order._id, {
      'payout.transferStatus': 'FAILED',
    });
    await sendNotification(order.sellerId.toString(), 'PAYOUT_CONFIRMED', {
      amount: data.amount,
      failed: true,
    });
  }
}

async function handleRefundComplete(_data: any) {
  // At this point refundBuyer has already updated local state,
  // so we can treat this as confirmation. Hook for future extensions.
  return;
}

export default router;

