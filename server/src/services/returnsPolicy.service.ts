import { Order } from '../models/Order';
import { Product } from '../models/Product';

type PolicyEvaluation = {
  blockReasons: string[];
  notes: string[];
  partialRefundOnly: boolean;
  daysSincePurchase: number;
  evaluatedAt: Date;
  nonReturnableItems: string[];
  saleItems: string[];
};

const NON_RETURNABLE_KEYWORDS = [
  'gift card',
  'giftcard',
  'download',
  'software',
  'health',
  'personal care',
  'perishable',
  'food',
  'flower',
  'newspaper',
  'magazine',
  'intimate',
  'sanitary',
  'hazardous',
  'flammable',
  'gas',
];

const normalize = (value: unknown): string => String(value || '').toLowerCase();

function getPolicyDate(order: any): Date {
  const deliveredTimeline = Array.isArray(order?.timeline)
    ? order.timeline.find((entry: any) => normalize(entry?.status) === 'delivered')
    : null;
  if (deliveredTimeline?.date) return new Date(deliveredTimeline.date);
  if (order?.date) return new Date(order.date);
  return new Date(order?.createdAt || Date.now());
}

export async function evaluateReturnPolicy(orderId: string): Promise<PolicyEvaluation> {
  const order = await Order.findById(orderId).lean();
  if (!order) {
    return {
      blockReasons: ['Order not found.'],
      notes: [],
      partialRefundOnly: false,
      daysSincePurchase: 0,
      evaluatedAt: new Date(),
      nonReturnableItems: [],
      saleItems: [],
    };
  }

  const purchaseDate = getPolicyDate(order);
  const now = new Date();
  const daysSincePurchase = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));

  const productIds = (order.items || []).map((it: any) => it.productId).filter(Boolean);
  const products = await Product.find({ _id: { $in: productIds } })
    .select('name category tags price discount compareAtPrice')
    .lean();
  const byId = new Map(products.map((p: any) => [String(p._id), p]));

  const nonReturnableItems: string[] = [];
  const saleItems: string[] = [];

  for (const item of order.items || []) {
    const product = byId.get(String(item.productId));
    const name = product?.name || item.name || 'Unknown item';
    const searchable = [
      normalize(name),
      normalize(product?.category),
      ...(Array.isArray(product?.tags) ? product.tags.map((t: string) => normalize(t)) : []),
    ].join(' ');

    if (NON_RETURNABLE_KEYWORDS.some((k) => searchable.includes(k))) {
      nonReturnableItems.push(name);
    }

    const hasSaleSignals =
      Number(product?.discount || 0) > 0 ||
      (Number(product?.compareAtPrice || 0) > 0 && Number(product?.price || 0) < Number(product?.compareAtPrice || 0));
    if (hasSaleSignals) {
      saleItems.push(name);
    }
  }

  const blockReasons: string[] = [];
  const notes: string[] = [];
  let partialRefundOnly = false;

  if (nonReturnableItems.length > 0) {
    blockReasons.push('Order includes non-returnable items under policy.');
  }

  if (saleItems.length > 0) {
    blockReasons.push('Sale items are not refundable under policy.');
  }

  if (daysSincePurchase > 30) {
    partialRefundOnly = true;
    notes.push('Request is older than 30 days; only partial refund review is allowed.');
  }

  return {
    blockReasons,
    notes,
    partialRefundOnly,
    daysSincePurchase,
    evaluatedAt: now,
    nonReturnableItems,
    saleItems,
  };
}
