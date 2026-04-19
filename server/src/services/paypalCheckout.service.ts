import axios from 'axios';
import { getClientUrl } from '../config/publicEnv';
import { Order, IOrder } from '../models/Order';
import { getPaypalCredentialsResolved } from './paymentGatewayCredentials.service';

function paypalApiBase(environment: 'sandbox' | 'live'): string {
  return environment === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

export async function getPayPalAccessToken(): Promise<{ token: string; base: string }> {
  const { clientId, clientSecret, environment } = await getPaypalCredentialsResolved();
  const base = paypalApiBase(environment);
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const { data } = await axios.post(
    `${base}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 25_000,
    }
  );
  if (!data?.access_token) {
    throw new Error('PayPal OAuth did not return access_token');
  }
  return { token: data.access_token, base };
}

function formatPayPalAmount(currency: string, amount: number): string {
  const c = currency.toUpperCase();
  if (['JPY', 'HUF', 'RWF'].includes(c)) {
    return String(Math.round(amount));
  }
  return amount.toFixed(2);
}

export async function createPayPalCheckoutOrder(order: IOrder): Promise<{ approvalUrl: string; orderId: string }> {
  const siteBase = getClientUrl();
  if (!siteBase) {
    throw new Error('CLIENT_URL is not set');
  }
  const currency = order.paymentMethod === 'RWF' ? 'RWF' : 'USD';
  const { token, base } = await getPayPalAccessToken();
  const value = formatPayPalAmount(currency, order.total);

  const { data } = await axios.post(
    `${base}/v2/checkout/orders`,
    {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: { currency_code: currency, value },
          custom_id: order._id.toString(),
          description: `Reaglex ${order.orderNumber}`,
        },
      ],
      application_context: {
        brand_name: 'Reaglex',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${siteBase.replace(/\/$/, '')}/payment/paypal-return?orderId=${encodeURIComponent(order._id.toString())}`,
        cancel_url: `${siteBase.replace(/\/$/, '')}/checkout?paypal=cancel`,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      timeout: 35_000,
    }
  );

  const paypalOrderId = data?.id as string;
  const approve = (data?.links as Array<{ href: string; rel: string }>)?.find((l) => l.rel === 'approve');
  if (!paypalOrderId || !approve?.href) {
    throw new Error('PayPal did not return an approval URL');
  }
  return { approvalUrl: approve.href, orderId: paypalOrderId };
}

export async function capturePayPalOrder(paypalOrderId: string): Promise<{
  ok: boolean;
  orderId?: string;
  message?: string;
}> {
  const { token, base } = await getPayPalAccessToken();
  const { data } = await axios.post(
    `${base}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 35_000,
      validateStatus: () => true,
    }
  );

  if (data?.name === 'RESOURCE_NOT_FOUND') {
    return { ok: false, message: 'PayPal order not found' };
  }

  const status = data?.status as string | undefined;
  const purchaseUnits = data?.purchase_units?.[0];
  const capture = purchaseUnits?.payments?.captures?.[0];
  const customId = purchaseUnits?.custom_id as string | undefined;
  const orderId = customId || capture?.custom_id;

  if (status !== 'COMPLETED' || !orderId) {
    return { ok: false, message: `PayPal capture not completed (${status || 'unknown'})` };
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return { ok: false, message: 'Order not found' };
  }
  if (order.escrow?.status === 'ESCROW_HOLD' && order.payment?.paidAt) {
    return { ok: true, orderId };
  }

  const cur = (capture?.amount?.currency_code || 'USD') as string;
  const val = parseFloat(capture?.amount?.value || '0') || order.total;

  const { finalizeSuccessfulEscrowPayment } = await import('./paymentService');
  await finalizeSuccessfulEscrowPayment(orderId, {
    provider: 'paypal',
    paidAmount: val,
    currency: cur,
    paymentMethodLabel: 'paypal',
    paypalOrderId,
    paypalCaptureId: capture?.id ? String(capture.id) : undefined,
  });
  return { ok: true, orderId };
}

export async function testPayPalConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    await getPayPalAccessToken();
    return { ok: true, message: 'Connected — PayPal OAuth token obtained' };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'PayPal test failed' };
  }
}
