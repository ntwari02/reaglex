import { Order } from '../models/Order';
import { ShippingZone } from '../models/ShippingZone';
import { getPlatformShippingPolicy } from './platformShippingPolicy.service';
import { decrementInventoryForPaidOrder } from './inventory.service';
import { deliverSellerNotification } from './sellerNotificationService';

export function isCodPaymentMethod(method: unknown): boolean {
  const m = String(method || '').toLowerCase().replace(/[\s-]+/g, '_');
  return m === 'cash_on_delivery' || m === 'cod' || m === 'cash_on_delivery_rwf';
}

export async function isCodAllowedForDestination(countryCode: string): Promise<boolean> {
  const { isSystemFeatureEnabled } = await import('./systemFeatureSettings.service');
  if (!(await isSystemFeatureEnabled('cod_checkout'))) return false;
  const policy = await getPlatformShippingPolicy();
  if (policy.codEnabled === false) return false;
  const cc = String(countryCode || '').toUpperCase().trim();
  if (!cc) return false;
  if (cc === 'RW') return true;
  const zone = await ShippingZone.findOne({
    codAvailable: true,
    countries: cc,
  })
    .select('_id')
    .lean();
  return Boolean(zone);
}

/** After COD orders are created: reserve stock + notify sellers (no online payment). */
export async function finalizeCodOrders(orderIds: string[], buyerUserId: string): Promise<void> {
  for (const orderId of orderIds) {
    await Order.findByIdAndUpdate(orderId, {
      $set: {
        status: 'processing',
        paymentMethod: 'cash_on_delivery',
        'payment.method': 'cash_on_delivery',
        'escrow.status': 'PENDING',
        'escrow.autoReleaseScheduled': false,
      },
      $push: {
        timeline: {
          status: 'cod_confirmed',
          date: new Date(),
          time: new Date().toLocaleTimeString(),
        },
      },
    });

    try {
      await decrementInventoryForPaidOrder(orderId);
    } catch (e) {
      console.error('COD inventory decrement failed', orderId, e);
    }

    const order = await Order.findById(orderId).select('sellerId orderNumber').lean();
    const sellerId = String((order as any)?.sellerId || '');
    if (sellerId) {
      void deliverSellerNotification(
        'new_order',
        {
          sellerId,
          orderId,
          orderNumber: String((order as any)?.orderNumber || orderId),
        },
        buyerUserId,
      );
    }
  }
}

export function orderIsCashOnDelivery(order: { paymentMethod?: string; payment?: { method?: string } }): boolean {
  return (
    isCodPaymentMethod(order.paymentMethod) || isCodPaymentMethod(order.payment?.method)
  );
}
