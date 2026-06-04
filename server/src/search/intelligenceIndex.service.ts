import mongoose from 'mongoose';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { TransactionLog } from '../models/TransactionLog';
import { FleetDriver } from '../models/FleetDriver';
import { SupportTicket } from '../models/SupportTicket';
import { SellerSubscription } from '../models/SellerSubscription';
import { Dispute } from '../models/Dispute';
import type { IntelligenceEntityType, IntelligenceSearchDocument } from './intelligenceSearch.types';
import { escapeRegex } from './queryClassifier';
import { ensureIntelligenceIndex, getMeilisearchClient, INTELLIGENCE_INDEX } from './meilisearchClient';

const BATCH = 200;

function docId(type: IntelligenceEntityType, id: string): string {
  return `${type}:${id}`;
}

export function maskPhone(phone?: string | null): string {
  const p = String(phone || '').replace(/\D/g, '');
  if (p.length < 6) return '••••';
  return `${p.slice(0, 4)}${'•'.repeat(Math.min(4, p.length - 6))}${p.slice(-2)}`;
}

export function maskEmail(email?: string | null): string {
  const e = String(email || '');
  const at = e.indexOf('@');
  if (at < 2) return '•••@•••';
  return `${e[0]}${'•'.repeat(Math.min(4, at - 1))}${e.slice(at)}`;
}

function statusTone(status?: string): 'ok' | 'warn' | 'critical' | 'info' {
  const s = String(status || '').toLowerCase();
  if (['paid', 'completed', 'delivered', 'active', 'resolved', 'closed', 'approved'].includes(s)) return 'ok';
  if (['pending', 'processing', 'open', 'in_progress', 'trial'].includes(s)) return 'warn';
  if (['failed', 'cancelled', 'refunded', 'disputed', 'suspended', 'urgent'].includes(s)) return 'critical';
  return 'info';
}

export { statusTone };

export async function buildUserDocs(limit = BATCH): Promise<IntelligenceSearchDocument[]> {
  const rows = await User.find({})
    .select('fullName email phone role location accountStatus createdAt')
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();

  return rows.map((u) => {
    const id = String(u._id);
    const isSeller = u.role === 'seller';
    const type: IntelligenceEntityType = isSeller ? 'seller' : 'user';
    const loc = String((u as { location?: string }).location || '');
    return {
      id: docId(type, id),
      entityType: type,
      entityId: id,
      title: u.fullName || u.email || 'User',
      subtitle: `${maskEmail(u.email)}${u.phone ? ` · ${maskPhone(u.phone)}` : ''}${loc ? ` · ${loc}` : ''}`,
      status: u.accountStatus || u.role,
      module: isSeller ? 'sellers' : 'users',
      moduleLabel: isSeller ? 'Sellers' : 'Users',
      deepLink: isSeller ? `/admin/sellers?seller=${id}` : `/admin/users?userId=${id}`,
      searchText: [u.fullName, u.email, u.phone, u.role, loc].filter(Boolean).join(' '),
      metadata: { email: maskEmail(u.email), role: String(u.role || '') },
      updatedAt: new Date(u.createdAt || Date.now()).getTime(),
    };
  });
}

export async function buildOrderDocs(limit = BATCH): Promise<IntelligenceSearchDocument[]> {
  const rows = await Order.find({})
    .select(
      'orderNumber status total currency customer customerEmail customerPhone sellerId buyerId sellerName paymentMethod trackingNumber date createdAt',
    )
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return rows.map((o) => mapOrderDoc(o));
}

export async function buildPaymentDocs(limit = BATCH): Promise<IntelligenceSearchDocument[]> {
  const rows = await TransactionLog.find({})
    .select('type amount currency status flutterwaveRef orderId sellerId createdAt metadata')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return rows.map((t) => {
    const id = String(t._id);
    const ref = t.flutterwaveRef || (t.metadata as any)?.gatewayRef || id.slice(-8);
    return {
      id: docId('payment', id),
      entityType: 'payment',
      entityId: id,
      title: `Payment ${ref}`,
      subtitle: `${t.type} · ${t.currency} ${Number(t.amount || 0).toFixed(2)}`,
      status: t.status,
      module: 'finance',
      moduleLabel: 'Finance',
      deepLink: `/admin/finance?tab=transactions&txnId=${id}`,
      searchText: [ref, t.type, t.status, String(t.orderId || '')].join(' '),
      metadata: { reference: String(ref) },
      updatedAt: new Date(t.createdAt || Date.now()).getTime(),
    };
  });
}

export async function buildProductDocs(limit = BATCH): Promise<IntelligenceSearchDocument[]> {
  const rows = await Product.find({})
    .select('name sku sellerId status publicationStatus price createdAt')
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();

  return rows.map((p) => {
    const id = String(p._id);
    return {
      id: docId('product', id),
      entityType: 'product',
      entityId: id,
      title: p.name || 'Product',
      subtitle: `SKU ${p.sku || '—'} · ${p.publicationStatus || p.status || ''}`,
      status: p.publicationStatus || p.status,
      module: 'products',
      moduleLabel: 'Products',
      deepLink: `/admin/products?productId=${id}`,
      searchText: [p.name, p.sku, p.status].filter(Boolean).join(' '),
      metadata: { sku: String(p.sku || '') },
      updatedAt: new Date(p.createdAt || Date.now()).getTime(),
    };
  });
}

export async function buildVehicleDocs(limit = BATCH): Promise<IntelligenceSearchDocument[]> {
  const rows = await FleetDriver.find({})
    .select('name phone vehicle status currentLocation updatedAt')
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();

  return rows.map((v) => {
    const id = String(v._id);
    return {
      id: docId('vehicle', id),
      entityType: 'vehicle',
      entityId: id,
      title: v.vehicle || 'Vehicle',
      subtitle: `${v.name} · ${maskPhone(v.phone)}${v.currentLocation ? ` · ${v.currentLocation}` : ''}`,
      status: v.status,
      module: 'logistics',
      moduleLabel: 'Logistics',
      deepLink: `/admin/logistics?tab=fleet&driverId=${id}`,
      searchText: [v.vehicle, v.name, v.phone, v.currentLocation].filter(Boolean).join(' '),
      metadata: { driver: v.name },
      updatedAt: new Date(v.updatedAt || Date.now()).getTime(),
    };
  });
}

export async function buildSupportDocs(limit = BATCH): Promise<IntelligenceSearchDocument[]> {
  const rows = await SupportTicket.find({})
    .select('ticketNumber subject status priority category updatedAt')
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();

  return rows.map((t) => {
    const id = String(t._id);
    return {
      id: docId('support', id),
      entityType: 'support',
      entityId: id,
      title: t.ticketNumber || `Ticket ${id.slice(-6)}`,
      subtitle: t.subject || t.category || '',
      status: t.status,
      riskLevel: t.priority === 'urgent' ? 'high' : t.priority === 'high' ? 'medium' : 'low',
      module: 'support',
      moduleLabel: 'Support',
      deepLink: `/admin/support?ticketId=${id}`,
      searchText: [t.ticketNumber, t.subject, t.category, t.status].filter(Boolean).join(' '),
      metadata: { priority: t.priority || '' },
      updatedAt: new Date(t.updatedAt || Date.now()).getTime(),
    };
  });
}

export async function buildSubscriptionDocs(limit = BATCH): Promise<IntelligenceSearchDocument[]> {
  const rows = await SellerSubscription.find({})
    .select('store_name user_id current_plan status is_active metadata')
    .sort({ 'metadata.updated_at': -1 })
    .limit(limit)
    .lean();

  return rows.map((s) => {
    const id = String(s._id);
    const tier = (s.current_plan as any)?.tier_name || 'Plan';
    return {
      id: docId('subscription', id),
      entityType: 'subscription',
      entityId: String(s.user_id),
      title: s.store_name || tier,
      subtitle: `${tier} · ${s.is_active ? 'active' : 'inactive'}`,
      status: (s.current_plan as any)?.status || s.status,
      module: 'seller-subscriptions',
      moduleLabel: 'Subscriptions',
      deepLink: `/admin/seller-subscriptions?sellerId=${s.user_id}`,
      searchText: [s.store_name, tier, s.status].filter(Boolean).join(' '),
      metadata: { tier },
      updatedAt: new Date((s.metadata as any)?.updated_at || Date.now()).getTime(),
    };
  });
}

export async function syncIntelligenceIndex(opts?: { perType?: number }): Promise<{ indexed: number }> {
  const perType = opts?.perType ?? BATCH;
  const ready = await ensureIntelligenceIndex();
  const client = getMeilisearchClient();
  if (!ready || !client) return { indexed: 0 };

  const chunks = await Promise.all([
    buildUserDocs(perType),
    buildOrderDocs(perType),
    buildPaymentDocs(perType),
    buildProductDocs(perType),
    buildVehicleDocs(perType),
    buildSupportDocs(perType),
    buildSubscriptionDocs(perType),
  ]);

  const docs = chunks.flat();
  if (!docs.length) return { indexed: 0 };

  const index = client.index(INTELLIGENCE_INDEX);
  await index.addDocuments(docs, { primaryKey: 'id' });
  const { invalidateSearchCache } = await import('./searchCache');
  await invalidateSearchCache();
  return { indexed: docs.length };
}

/** Lightweight MongoDB search when Meilisearch is unavailable or for intent-specific queries. */
export async function mongoIntelligenceSearch(
  query: string,
  intent: string,
  limitPerType = 5,
): Promise<IntelligenceSearchDocument[]> {
  const q = query.trim();
  if (!q) return [];

  const regex = new RegExp(escapeRegex(q), 'i');
  const tasks: Promise<IntelligenceSearchDocument[]>[] = [];

  const want = (type: IntelligenceEntityType) =>
    intent === 'general' ||
    intent === 'object_id' ||
    (intent === 'email' && (type === 'user' || type === 'seller')) ||
    (intent === 'phone' && (type === 'user' || type === 'seller' || type === 'vehicle')) ||
    (intent === 'order_id' && type === 'order') ||
    (intent === 'payment_ref' && type === 'payment') ||
    (intent === 'plate' && type === 'vehicle');

  if (want('user') || want('seller')) {
    tasks.push(
      (async () => {
        const filter: Record<string, unknown> =
          intent === 'email'
            ? { email: regex }
            : intent === 'phone'
              ? { phone: regex }
              : { $or: [{ fullName: regex }, { email: regex }, { phone: regex }] };
        const rows = await User.find(filter)
          .select('fullName email phone role location accountStatus createdAt')
          .limit(limitPerType)
          .lean();
        return buildUserDocsFromRows(rows);
      })(),
    );
  }

  if (want('order')) {
    tasks.push(
      (async () => {
        const filter =
          intent === 'order_id'
            ? { orderNumber: regex }
            : {
                $or: [
                  { orderNumber: regex },
                  { customer: regex },
                  { customerEmail: regex },
                  { customerPhone: regex },
                  { trackingNumber: regex },
                  { sellerName: regex },
                ],
              };
        const rows = await Order.find(filter)
          .select(
            'orderNumber status total currency customer customerEmail customerPhone sellerId buyerId sellerName paymentMethod trackingNumber date createdAt',
          )
          .limit(limitPerType)
          .lean();
        return rows.map((o) => mapOrderDoc(o));
      })(),
    );
  }

  if (want('payment')) {
    tasks.push(
      (async () => {
        const rows = await TransactionLog.find({
          $or: [{ flutterwaveRef: regex }, { status: regex }],
        })
          .select('type amount currency status flutterwaveRef orderId createdAt metadata')
          .limit(limitPerType)
          .lean();
        return rows.map((t) => mapPaymentDoc(t));
      })(),
    );
  }

  if (want('product') && intent === 'general') {
    tasks.push(
      (async () => {
        const rows = await Product.find({ $or: [{ name: regex }, { sku: regex }] })
          .select('name sku status publicationStatus createdAt')
          .limit(limitPerType)
          .lean();
        return rows.map((p) => mapProductDoc(p));
      })(),
    );
  }

  if (want('vehicle')) {
    tasks.push(
      (async () => {
        const rows = await FleetDriver.find({
          $or: [{ vehicle: regex }, { name: regex }, { phone: regex }],
        })
          .limit(limitPerType)
          .lean();
        return rows.map((v) => mapVehicleDoc(v));
      })(),
    );
  }

  if (intent === 'general' || intent === 'phone' || intent === 'email') {
    tasks.push(
      (async () => {
        const rows = await SupportTicket.find({
          $or: [{ ticketNumber: regex }, { subject: regex }, { description: regex }],
        })
          .select('ticketNumber subject status priority category updatedAt')
          .limit(limitPerType)
          .lean();
        return rows.map((t) => mapSupportDoc(t));
      })(),
    );
    tasks.push(
      (async () => {
        const rows = await Dispute.find({
          $or: [{ disputeNumber: regex }, { reason: regex }, { description: regex }],
        })
          .select('disputeNumber type reason status orderId updatedAt createdAt')
          .limit(limitPerType)
          .lean();
        return rows.map((d) => mapDisputeDoc(d));
      })(),
    );
    tasks.push(
      (async () => {
        const rows = await SellerSubscription.find({ store_name: regex })
          .select('store_name user_id current_plan status is_active metadata')
          .limit(limitPerType)
          .lean();
        return rows.map((s) => mapSubscriptionDoc(s));
      })(),
    );
  }

  if (intent === 'object_id' && mongoose.Types.ObjectId.isValid(q)) {
    tasks.push(resolveObjectId(q));
  }

  const results = await Promise.all(tasks);
  const merged = results.flat();
  const seen = new Set<string>();
  return merged.filter((d) => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });
}

export function buildUserDocsFromRows(rows: any[]): IntelligenceSearchDocument[] {
  return rows.map((u) => {
    const id = String(u._id);
    const isSeller = u.role === 'seller';
    const type: IntelligenceEntityType = isSeller ? 'seller' : 'user';
    const loc = String((u as { location?: string }).location || '');
    return {
      id: docId(type, id),
      entityType: type,
      entityId: id,
      title: u.fullName || u.email || 'User',
      subtitle: `${maskEmail(u.email)}${loc ? ` · ${loc}` : ''}`,
      status: u.accountStatus || u.role,
      module: isSeller ? 'sellers' : 'users',
      moduleLabel: isSeller ? 'Sellers' : 'Users',
      deepLink: isSeller ? `/admin/sellers?seller=${id}` : `/admin/users?userId=${id}`,
      searchText: [u.fullName, u.email, u.phone, u.role, loc, u.address].filter(Boolean).join(' '),
      metadata: {},
      updatedAt: Date.now(),
    };
  });
}

export function mapOrderDoc(o: any): IntelligenceSearchDocument {
  const id = String(o._id);
  const pay = o.paymentMethod ? ` · ${o.paymentMethod}` : '';
  return {
    id: docId('order', id),
    entityType: 'order',
    entityId: id,
    title: `Order ${o.orderNumber}`,
    subtitle: `${o.customer || 'Customer'}${pay} · ${o.currency || 'USD'} ${Number(o.total || 0).toFixed(2)}`,
    status: o.status,
    module: 'orders',
    moduleLabel: 'Orders',
    deepLink: `/admin/orders?orderId=${id}`,
    searchText: [
      o.orderNumber,
      o.customer,
      o.customerEmail,
      o.customerPhone,
      o.trackingNumber,
      o.sellerName,
      o.paymentMethod,
      o.status,
      o.sellerId ? String(o.sellerId) : '',
      o.buyerId ? String(o.buyerId) : '',
    ]
      .filter(Boolean)
      .join(' '),
    metadata: {
      orderNumber: String(o.orderNumber || ''),
      sellerId: o.sellerId ? String(o.sellerId) : '',
      buyerId: o.buyerId ? String(o.buyerId) : '',
    },
    updatedAt: new Date(o.date || o.createdAt || Date.now()).getTime(),
  };
}

export function mapPaymentDoc(t: any): IntelligenceSearchDocument {
  const id = String(t._id);
  const ref = t.flutterwaveRef || id.slice(-8);
  return {
    id: docId('payment', id),
    entityType: 'payment',
    entityId: id,
    title: `Payment ${ref}`,
    subtitle: `${t.type} · ${t.currency} ${Number(t.amount || 0).toFixed(2)}`,
    status: t.status,
    module: 'finance',
    moduleLabel: 'Finance',
    deepLink: `/admin/finance?tab=transactions&txnId=${id}`,
    searchText: '',
    metadata: { reference: String(ref) },
    updatedAt: new Date(t.createdAt || Date.now()).getTime(),
  };
}

export function mapProductDoc(p: any): IntelligenceSearchDocument {
  const id = String(p._id);
  return {
    id: docId('product', id),
    entityType: 'product',
    entityId: id,
    title: p.name || 'Product',
    subtitle: `SKU ${p.sku || '—'}`,
    status: p.publicationStatus || p.status,
    module: 'products',
    moduleLabel: 'Products',
    deepLink: `/admin/products?productId=${id}`,
    searchText: '',
    metadata: {},
    updatedAt: new Date(p.createdAt || Date.now()).getTime(),
  };
}

export function mapVehicleDoc(v: any): IntelligenceSearchDocument {
  const id = String(v._id);
  return {
    id: docId('vehicle', id),
    entityType: 'vehicle',
    entityId: id,
    title: v.vehicle,
    subtitle: `${v.name} · ${maskPhone(v.phone)}`,
    status: v.status,
    module: 'logistics',
    moduleLabel: 'Logistics',
    deepLink: `/admin/logistics?tab=fleet&driverId=${id}`,
    searchText: '',
    metadata: {},
    updatedAt: new Date(v.updatedAt || Date.now()).getTime(),
  };
}

export function mapDisputeDoc(d: any): IntelligenceSearchDocument {
  const id = String(d._id);
  return {
    id: docId('dispute', id),
    entityType: 'dispute',
    entityId: id,
    title: d.disputeNumber || `Dispute ${id.slice(-6)}`,
    subtitle: `${d.type || 'dispute'} · ${d.reason || ''}`.trim(),
    status: d.status,
    module: 'support',
    moduleLabel: 'Dispute',
    deepLink: `/admin/support?tab=disputes&disputeId=${id}`,
    searchText: [d.disputeNumber, d.reason, d.description, String(d.orderId || '')].filter(Boolean).join(' '),
    metadata: { orderId: d.orderId ? String(d.orderId) : '' },
    updatedAt: new Date(d.updatedAt || d.createdAt || Date.now()).getTime(),
  };
}

export function mapSupportDoc(t: any): IntelligenceSearchDocument {
  const id = String(t._id);
  return {
    id: docId('support', id),
    entityType: 'support',
    entityId: id,
    title: t.ticketNumber,
    subtitle: t.subject,
    status: t.status,
    module: 'support',
    moduleLabel: 'Support',
    deepLink: `/admin/support?ticketId=${id}`,
    searchText: '',
    metadata: {},
    updatedAt: new Date(t.updatedAt || Date.now()).getTime(),
  };
}

export function mapSubscriptionDoc(s: any): IntelligenceSearchDocument {
  const userId = String(s.user_id);
  const tier = s.current_plan?.tier_name || 'Plan';
  return {
    id: docId('subscription', userId),
    entityType: 'subscription',
    entityId: userId,
    title: s.store_name || tier,
    subtitle: tier,
    status: s.current_plan?.status || s.status,
    module: 'seller-subscriptions',
    moduleLabel: 'Subscriptions',
    deepLink: `/admin/seller-subscriptions?sellerId=${userId}`,
    searchText: '',
    metadata: {},
    updatedAt: Date.now(),
  };
}

async function resolveObjectId(id: string): Promise<IntelligenceSearchDocument[]> {
  const oid = new mongoose.Types.ObjectId(id);
  const [user, order, product, payment] = await Promise.all([
    User.findById(oid).select('fullName email role').lean(),
    Order.findById(oid).select('orderNumber customer total currency status').lean(),
    Product.findById(oid).select('name sku').lean(),
    TransactionLog.findById(oid).select('type amount currency flutterwaveRef status').lean(),
  ]);

  const out: IntelligenceSearchDocument[] = [];
  if (user) out.push(...buildUserDocsFromRows([user]));
  if (order) out.push(mapOrderDoc(order));
  if (product) out.push(mapProductDoc(product));
  if (payment) out.push(mapPaymentDoc(payment));
  return out;
}

export async function buildIntelligenceDocumentForEntity(
  entityType: IntelligenceEntityType,
  entityId: string,
): Promise<IntelligenceSearchDocument | null> {
  if (!entityId?.trim()) return null;

  switch (entityType) {
    case 'user':
    case 'seller': {
      const u = await User.findById(entityId)
        .select('fullName email phone role location accountStatus createdAt')
        .lean();
      if (!u) return null;
      const docs = buildUserDocsFromRows([u]);
      return docs[0] || null;
    }
    case 'order': {
      const o = await Order.findById(entityId)
        .select('orderNumber status total currency customer date createdAt')
        .lean();
      return o ? mapOrderDoc(o) : null;
    }
    case 'payment': {
      const t = await TransactionLog.findById(entityId).lean();
      return t ? mapPaymentDoc(t) : null;
    }
    case 'product': {
      const p = await Product.findById(entityId).select('name sku status publicationStatus createdAt').lean();
      return p ? mapProductDoc(p) : null;
    }
    case 'vehicle': {
      const v = await FleetDriver.findById(entityId).lean();
      return v ? mapVehicleDoc(v) : null;
    }
    case 'support': {
      const t = await SupportTicket.findById(entityId)
        .select('ticketNumber subject status priority category updatedAt')
        .lean();
      return t ? mapSupportDoc(t) : null;
    }
    case 'subscription': {
      const s = await SellerSubscription.findOne({ user_id: entityId }).lean();
      return s ? mapSubscriptionDoc(s) : null;
    }
    case 'dispute': {
      const d = await Dispute.findById(entityId).select('disputeNumber type reason status orderId updatedAt createdAt').lean();
      return d ? mapDisputeDoc(d) : null;
    }
    default:
      return null;
  }
}

export async function upsertIntelligenceDocuments(docs: IntelligenceSearchDocument[]): Promise<void> {
  if (!docs.length) return;

  const client = getMeilisearchClient();
  if (!client) return;

  await ensureIntelligenceIndex();
  const index = client.index(INTELLIGENCE_INDEX);
  await index.addDocuments(docs, { primaryKey: 'id' });
  const { invalidateSearchCache } = await import('./searchCache');
  await invalidateSearchCache();
}

