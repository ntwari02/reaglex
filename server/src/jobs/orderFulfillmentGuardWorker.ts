import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { deliverSellerNotification } from '../services/sellerNotificationService';

const TICK_MS = 30 * 60 * 1000;
const PENDING_HOURS = Number(process.env.ORDER_FULFILLMENT_WARN_HOURS || 24);
const LOW_STOCK_THRESHOLD = Number(process.env.ORDER_FULFILLMENT_LOW_STOCK || 2);

let started = false;

/**
 * Alerts sellers when paid orders risk missing buyer delivery (stuck status, low stock on line items).
 */
async function tick(): Promise<{ notified: number }> {
  let notified = 0;
  const cutoff = new Date(Date.now() - PENDING_HOURS * 60 * 60 * 1000);

  const stuck = await Order.find({
    status: { $in: ['pending', 'processing', 'packed', 'paid'] },
    createdAt: { $lte: cutoff },
    'timeline.status': { $ne: 'fulfillment_risk_notified' },
  })
    .select('_id orderNumber sellerId status createdAt items')
    .limit(40)
    .lean();

  for (const order of stuck as any[]) {
    const sellerId = String(order.sellerId || '');
    if (!mongoose.Types.ObjectId.isValid(sellerId)) continue;

    const productIds = (order.items || [])
      .map((i: { productId?: unknown }) => String(i.productId || ''))
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id));
    const lowStock: string[] = [];
    if (productIds.length) {
      const products = await Product.find({ _id: { $in: productIds } })
        .select('name stock')
        .lean();
      for (const p of products as any[]) {
        if (Number(p.stock ?? 0) <= LOW_STOCK_THRESHOLD) {
          lowStock.push(String(p.name || 'Item'));
        }
      }
    }

    const hours = Math.round((Date.now() - new Date(order.createdAt).getTime()) / 3600000);
    void deliverSellerNotification(
      'shipping_delay',
      {
        sellerId,
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        hoursSinceUpdate: hours,
        affectedCount: order.items?.length || 1,
        productNames: lowStock.length ? lowStock : undefined,
      },
      sellerId,
    );

    await Order.updateOne(
      { _id: order._id },
      {
        $push: {
          timeline: {
            status: 'fulfillment_risk_notified',
            date: new Date(),
            time: new Date().toISOString(),
          },
        },
      },
    );
    notified += 1;
  }

  return { notified };
}

export function startOrderFulfillmentGuardWorker(): void {
  if (started) return;
  started = true;
  const run = () => {
    void tick().catch((e) => console.error('[orderFulfillmentGuard]', e));
  };
  run();
  setInterval(run, TICK_MS);
}

export async function runOrderFulfillmentGuardOnce(): Promise<{ notified: number }> {
  return tick();
}
