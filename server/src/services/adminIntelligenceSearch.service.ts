import mongoose from 'mongoose';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { TransactionLog } from '../models/TransactionLog';
import { FleetDriver } from '../models/FleetDriver';
import { SupportTicket } from '../models/SupportTicket';
import { SellerSubscription } from '../models/SellerSubscription';
import { classifyQuery } from '../search/queryClassifier';
import { getCachedSearch, setCachedSearch, getCachedPreview, setCachedPreview } from '../search/searchCache';
import { getMeilisearchClient, INTELLIGENCE_INDEX } from '../search/meilisearchClient';
import {
  maskEmail,
  maskPhone,
  mongoIntelligenceSearch,
  statusTone,
} from '../search/intelligenceIndex.service';
import { logIntelligenceSearch } from '../models/IntelligenceSearchAudit';
import type {
  IntelligenceEntityPreview,
  IntelligenceEntityType,
  IntelligenceSearchDocument,
  IntelligenceSearchGroup,
  IntelligenceSearchHit,
  IntelligenceSearchResponse,
} from '../search/intelligenceSearch.types';

const GROUP_META: Record<IntelligenceEntityType, { label: string; icon: string }> = {
  user: { label: 'Users', icon: 'user' },
  seller: { label: 'Sellers', icon: 'store' },
  order: { label: 'Orders', icon: 'package' },
  payment: { label: 'Payments', icon: 'credit-card' },
  product: { label: 'Products', icon: 'box' },
  vehicle: { label: 'Vehicles', icon: 'truck' },
  support: { label: 'Support', icon: 'life-buoy' },
  subscription: { label: 'Subscriptions', icon: 'crown' },
};

function docToHit(doc: IntelligenceSearchDocument, score?: number): IntelligenceSearchHit {
  return {
    id: doc.id,
    entityType: doc.entityType,
    entityId: doc.entityId,
    title: doc.title,
    subtitle: doc.subtitle,
    status: doc.status,
    statusTone: statusTone(doc.status),
    riskLevel: doc.riskLevel,
    module: doc.module,
    moduleLabel: doc.moduleLabel,
    deepLink: doc.deepLink,
    metadata: doc.metadata || {},
    score,
  };
}

function groupHits(hits: IntelligenceSearchHit[]): IntelligenceSearchGroup[] {
  const map = new Map<IntelligenceEntityType, IntelligenceSearchHit[]>();
  for (const h of hits) {
    const list = map.get(h.entityType) || [];
    list.push(h);
    map.set(h.entityType, list);
  }

  const order: IntelligenceEntityType[] = [
    'user',
    'seller',
    'order',
    'payment',
    'product',
    'vehicle',
    'support',
    'subscription',
  ];

  return order
    .filter((t) => map.has(t))
    .map((t) => ({
      entityType: t,
      label: GROUP_META[t].label,
      icon: GROUP_META[t].icon,
      hits: map.get(t)!,
    }));
}

async function searchMeilisearch(query: string, limit: number): Promise<IntelligenceSearchHit[]> {
  const client = getMeilisearchClient();
  if (!client) return [];

  try {
    const index = client.index(INTELLIGENCE_INDEX);
    const res = await index.search(query, { limit, attributesToRetrieve: ['*'] });
    return (res.hits as IntelligenceSearchDocument[]).map((d, i) =>
      docToHit(d, res.processingTimeMs ? 1 - i * 0.01 : undefined),
    );
  } catch {
    return [];
  }
}

export async function runIntelligenceSearch(
  query: string,
  limit = 24,
  adminId?: string,
  ip?: string,
): Promise<IntelligenceSearchResponse> {
  const started = Date.now();
  const q = String(query || '').trim();

  if (!q) {
    return {
      query: '',
      intent: 'general',
      intentLabel: 'Search anything',
      groups: [],
      total: 0,
      tookMs: 0,
      engine: 'mongodb',
      cached: false,
    };
  }

  const cached = await getCachedSearch<IntelligenceSearchResponse>(q, limit);
  if (cached) {
    return { ...cached, cached: true };
  }

  const { intent, label: intentLabel } = classifyQuery(q);

  let hits: IntelligenceSearchHit[] = [];
  let engine: 'meilisearch' | 'mongodb' = 'mongodb';

  const meiliHits = await searchMeilisearch(q, limit);
  if (meiliHits.length > 0) {
    hits = meiliHits;
    engine = 'meilisearch';
  } else {
    const docs = await mongoIntelligenceSearch(q, intent, Math.ceil(limit / 4));
    hits = docs.slice(0, limit).map((d) => docToHit(d));
  }

  const groups = groupHits(hits);
  const response: IntelligenceSearchResponse = {
    query: q,
    intent,
    intentLabel,
    groups,
    total: hits.length,
    tookMs: Date.now() - started,
    engine,
    cached: false,
  };

  await setCachedSearch(q, limit, response);

  if (adminId) {
    void logIntelligenceSearch({
      adminId,
      query: q,
      intent,
      resultCount: hits.length,
      engine,
      ip,
    });
  }

  return response;
}

export async function getEntityPreview(
  entityType: IntelligenceEntityType,
  entityId: string,
): Promise<IntelligenceEntityPreview | null> {
  const cached = await getCachedPreview<IntelligenceEntityPreview>(entityType, entityId);
  if (cached) return cached;

  if (!mongoose.Types.ObjectId.isValid(entityId) && entityType !== 'subscription') {
    return null;
  }

  let preview: IntelligenceEntityPreview | null = null;

  switch (entityType) {
    case 'user':
    case 'seller':
      preview = await previewUser(entityId, entityType);
      break;
    case 'order':
      preview = await previewOrder(entityId);
      break;
    case 'payment':
      preview = await previewPayment(entityId);
      break;
    case 'product':
      preview = await previewProduct(entityId);
      break;
    case 'vehicle':
      preview = await previewVehicle(entityId);
      break;
    case 'support':
      preview = await previewSupport(entityId);
      break;
    case 'subscription':
      preview = await previewSubscription(entityId);
      break;
    default:
      preview = null;
  }

  if (preview) await setCachedPreview(entityType, entityId, preview);
  return preview;
}

async function previewUser(userId: string, type: IntelligenceEntityType): Promise<IntelligenceEntityPreview | null> {
  const u = await User.findById(userId).select('fullName email phone role accountStatus city country createdAt').lean();
  if (!u) return null;

  const [orderCount, productCount] = await Promise.all([
    Order.countDocuments({ buyerId: userId }).catch(() => 0),
    type === 'seller' ? Product.countDocuments({ sellerId: userId }) : Promise.resolve(0),
  ]);

  const isSeller = u.role === 'seller' || type === 'seller';
  return {
    entityType: isSeller ? 'seller' : 'user',
    entityId: userId,
    title: u.fullName || 'User',
    subtitle: maskEmail(u.email),
    status: u.accountStatus || u.role,
    statusTone: statusTone(u.accountStatus || u.role),
    fields: [
      { label: 'Email', value: maskEmail(u.email), masked: true },
      { label: 'Phone', value: maskPhone(u.phone), masked: true },
      { label: 'Role', value: String(u.role || '') },
      { label: 'Location', value: [u.city, u.country].filter(Boolean).join(', ') || '—' },
    ],
    actions: [
      {
        label: isSeller ? 'Open Seller' : 'Open User',
        href: isSeller ? `/admin/sellers?userId=${userId}` : `/admin/users?userId=${userId}`,
        primary: true,
      },
    ],
    relationships: [
      { label: 'Orders', count: orderCount, href: `/admin/orders?userId=${userId}` },
      ...(isSeller
        ? [{ label: 'Products', count: productCount, href: `/admin/products?sellerId=${userId}` }]
        : []),
      { label: 'Support', count: 0, href: `/admin/support?userId=${userId}` },
    ],
  };
}

async function previewOrder(orderId: string): Promise<IntelligenceEntityPreview | null> {
  const o = await Order.findById(orderId)
    .select('orderNumber status total currency customer sellerId buyerId date createdAt')
    .lean();
  if (!o) return null;

  const paymentCount = await TransactionLog.countDocuments({ orderId: o._id });

  return {
    entityType: 'order',
    entityId: orderId,
    title: `Order ${o.orderNumber}`,
    subtitle: o.customer || 'Customer order',
    status: o.status,
    statusTone: statusTone(o.status),
    fields: [
      { label: 'Amount', value: `${o.currency || 'USD'} ${Number(o.total || 0).toFixed(2)}` },
      { label: 'Customer', value: o.customer || '—' },
      { label: 'Created', value: new Date(o.date || o.createdAt || Date.now()).toLocaleDateString() },
    ],
    actions: [
      { label: 'View Order', href: `/admin/orders?orderId=${orderId}`, primary: true },
      { label: 'Open Finance', href: `/admin/finance?orderId=${orderId}` },
    ],
    relationships: [
      { label: 'Payments', count: paymentCount, href: `/admin/finance?orderId=${orderId}` },
      { label: 'Returns', count: 0, href: `/admin/returns?orderId=${orderId}` },
    ],
  };
}

async function previewPayment(paymentId: string): Promise<IntelligenceEntityPreview | null> {
  const t = await TransactionLog.findById(paymentId).lean();
  if (!t) return null;

  const ref = t.flutterwaveRef || paymentId.slice(-8);
  return {
    entityType: 'payment',
    entityId: paymentId,
    title: `Payment ${ref}`,
    subtitle: `${t.type} transaction`,
    status: t.status,
    statusTone: statusTone(t.status),
    fields: [
      { label: 'Amount', value: `${t.currency} ${Number(t.amount || 0).toFixed(2)}` },
      { label: 'Type', value: t.type },
      { label: 'Reference', value: ref },
    ],
    actions: [
      { label: 'Open Payment', href: `/admin/finance?tab=transactions&txnId=${paymentId}`, primary: true },
      { label: 'See Ledger', href: `/admin/finance?tab=ledger&txnId=${paymentId}` },
    ],
    relationships: [
      ...(t.orderId
        ? [{ label: 'Order', count: 1, href: `/admin/orders?orderId=${t.orderId}` }]
        : []),
    ],
  };
}

async function previewProduct(productId: string): Promise<IntelligenceEntityPreview | null> {
  const p = await Product.findById(productId).select('name sku sellerId status publicationStatus price').lean();
  if (!p) return null;

  return {
    entityType: 'product',
    entityId: productId,
    title: p.name || 'Product',
    subtitle: `SKU ${p.sku || '—'}`,
    status: p.publicationStatus || p.status,
    statusTone: statusTone(p.publicationStatus || p.status),
    fields: [
      { label: 'SKU', value: p.sku || '—' },
      { label: 'Price', value: `$${Number(p.price || 0).toFixed(2)}` },
      { label: 'Seller ID', value: String(p.sellerId || '—') },
    ],
    actions: [{ label: 'Open Product', href: `/admin/products?productId=${productId}`, primary: true }],
    relationships: [{ label: 'Reviews', count: 0, href: `/admin/reviews?productId=${productId}` }],
  };
}

async function previewVehicle(driverId: string): Promise<IntelligenceEntityPreview | null> {
  const v = await FleetDriver.findById(driverId).lean();
  if (!v) return null;

  return {
    entityType: 'vehicle',
    entityId: driverId,
    title: v.vehicle,
    subtitle: v.name,
    status: v.status,
    statusTone: statusTone(v.status),
    fields: [
      { label: 'Driver', value: v.name },
      { label: 'Phone', value: maskPhone(v.phone), masked: true },
      { label: 'Deliveries', value: String(v.totalDeliveries || 0) },
    ],
    actions: [{ label: 'Open Fleet', href: `/admin/logistics?tab=fleet&driverId=${driverId}`, primary: true }],
    relationships: [],
  };
}

async function previewSupport(ticketId: string): Promise<IntelligenceEntityPreview | null> {
  const t = await SupportTicket.findById(ticketId).select('ticketNumber subject status priority category sellerId').lean();
  if (!t) return null;

  return {
    entityType: 'support',
    entityId: ticketId,
    title: t.ticketNumber,
    subtitle: t.subject,
    status: t.status,
    statusTone: statusTone(t.status),
    fields: [
      { label: 'Priority', value: t.priority },
      { label: 'Category', value: t.category },
    ],
    actions: [{ label: 'Open Ticket', href: `/admin/support?ticketId=${ticketId}`, primary: true }],
    relationships: [],
  };
}

async function previewSubscription(userId: string): Promise<IntelligenceEntityPreview | null> {
  const s = await SellerSubscription.findOne({ user_id: userId }).lean();
  if (!s) return null;

  const tier = (s.current_plan as any)?.tier_name || 'Plan';
  return {
    entityType: 'subscription',
    entityId: userId,
    title: s.store_name || tier,
    subtitle: tier,
    status: (s.current_plan as any)?.status || s.status,
    statusTone: statusTone(s.is_active ? 'active' : 'suspended'),
    fields: [
      { label: 'Store', value: s.store_name || '—' },
      { label: 'Tier', value: tier },
      { label: 'Auto-renew', value: (s.current_plan as any)?.auto_renew ? 'On' : 'Off' },
    ],
    actions: [
      {
        label: 'Manage Subscription',
        href: `/admin/seller-subscriptions?sellerId=${userId}`,
        primary: true,
      },
    ],
    relationships: [{ label: 'Billing events', count: (s.billing_history as any[])?.length || 0, href: `/admin/seller-subscriptions?sellerId=${userId}` }],
  };
}
