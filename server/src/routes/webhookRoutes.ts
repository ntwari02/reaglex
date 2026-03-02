import { Router, Request, Response } from 'express';
import { verifyPayment } from '../services/paymentService';
import { Order } from '../models/Order';
import { sendNotification } from '../services/notificationService';

const router = Router();

router.post('/flutterwave/webhook', async (req: Request, res: Response) => {
  const secretHash = process.env.WEBHOOK_SECRET;
  const signature = req.headers['verif-hash'] as string | undefined;

  if (!secretHash || !signature || signature !== secretHash) {
    return res.status(401).send('Unauthorized');
  }

  const payload = req.body;

  try {
    switch (payload.event) {
      case 'charge.completed':
        if (payload.data.status === 'successful') {
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

