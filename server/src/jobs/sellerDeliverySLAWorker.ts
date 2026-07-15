import { Order } from '../models/Order';
import { evaluateOrderDeliverySLA } from '../services/sellerDeliverySLA.service';

const TICK_MS = Number(process.env.ORDER_SLA_TICK_MS || 60 * 60 * 1000);

let started = false;

async function tick(): Promise<{ evaluated: number }> {
  const candidates = await Order.find({
    status: {
      $in: [
        'pending',
        'processing',
        'packed',
        'paid',
        'booked',
        'in_progress',
        'shipped',
        'ready_for_pickup',
        'delivered',
      ],
    },
  })
    .select(
      '_id orderNumber sellerId status createdAt updatedAt timeline spacillyShipping deliveryPrediction fulfillment autoCompletion deliverySLA',
    )
    .limit(80)
    .lean();

  for (const order of candidates as any[]) {
    await evaluateOrderDeliverySLA(order);
  }

  return { evaluated: candidates.length };
}

export function startSellerDeliverySLAWorker(): void {
  if (started) return;
  started = true;
  const run = () => {
    void tick().catch((e) => console.error('[sellerDeliverySLAWorker]', e));
  };
  run();
  setInterval(run, TICK_MS);
}

export async function runSellerDeliverySLAOnce(): Promise<{ evaluated: number }> {
  return tick();
}
