import mongoose from 'mongoose';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { TransactionLog } from '../models/TransactionLog';
import { FleetDriver } from '../models/FleetDriver';
import { SupportTicket } from '../models/SupportTicket';
import { SellerSubscription } from '../models/SellerSubscription';
import { classifyQuery } from '../search/queryClassifier';
import { explainQuery } from '../search/intelligenceQueryUnderstanding';
import {
  INTEL_MAX_GRAPH_EXPAND,
  INTEL_MAX_GRAPH_SEEDS,
  INTEL_MAX_QUERY_LENGTH,
  INTEL_MAX_REGISTRY_PER_TYPE,
  INTEL_MAX_RESULTS,
  sanitizeIntelligenceQuery,
  shouldRunGraphExpansion,
  withSearchTimeout,
} from '../search/intelligenceGuard';
import { getCachedSearch, setCachedSearch, getCachedPreview, setCachedPreview } from '../search/searchCache';
import { getMeilisearchClient, INTELLIGENCE_INDEX } from '../search/meilisearchClient';
import {
  maskEmail,
  maskPhone,
  mongoIntelligenceSearch,
  statusTone,
} from '../search/intelligenceIndex.service';
import { logIntelligenceSearch } from '../models/IntelligenceSearchAudit';
import { Dispute } from '../models/Dispute';
import { ReturnCase } from '../models/ReturnCase';
import { registryLookup, expandGraphFromSeeds } from '../search/intelligenceGraph.service';
import { buildIntelligenceAiInsight, shouldRunAiAssist } from './intelligenceAiAssist.service';
import {
  buildRuleAssistantBrief,
  mergeGeminiIntoBrief,
  rankIntelligenceHits,
} from '../search/intelligenceAssistantBrief.service';
import type {
  IntelligenceConnectedRecord,
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
  dispute: { label: 'Disputes', icon: 'alert' },
};

const UNRESOLVED_STATUS = /\b(pending|processing|open|delayed|dispute|failed|unpaid|investigating|active|escalat|review|hold|refund|return|shipped|in[- ]?transit)\b/i;
const LIVE_STATUS = /\b(processing|pending|reconcil|updating|running|in[- ]?progress|active|live)\b/i;

function temporalSignals(doc: IntelligenceSearchDocument) {
  const updatedAt = doc.updatedAt || Date.now();
  const status = String(doc.status || '');
  const isUnresolved = UNRESOLVED_STATUS.test(status);
  const isLive = LIVE_STATUS.test(status);
  let activityLabel = 'Updated';
  switch (doc.entityType) {
    case 'order':
      activityLabel = isLive ? 'Shipment activity' : 'Order updated';
      break;
    case 'payment':
      activityLabel = isLive ? 'Reconciliation' : 'Payment activity';
      break;
    case 'user':
    case 'seller':
      activityLabel = 'Account activity';
      break;
    case 'support':
    case 'dispute':
      activityLabel = isUnresolved ? 'Case open' : 'Case updated';
      break;
    case 'vehicle':
      activityLabel = 'Fleet update';
      break;
    default:
      activityLabel = 'Record updated';
  }
  return { updatedAt, lastActivityAt: updatedAt, activityLabel, isLive, isUnresolved };
}

function docToHit(doc: IntelligenceSearchDocument, score?: number): IntelligenceSearchHit {
  const temporal = temporalSignals(doc);
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
    ...temporal,
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
    'dispute',
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
  const safeLimit = Math.min(INTEL_MAX_RESULTS, Math.max(1, limit));
  const sanitized = sanitizeIntelligenceQuery(query);

  if (!sanitized.ok) {
    return {
      query: String(query || '').trim().slice(0, INTEL_MAX_QUERY_LENGTH),
      intent: 'general',
      intentLabel: 'Search anything',
      groups: [],
      total: 0,
      tookMs: 0,
      engine: 'mongodb',
      cached: false,
      understanding: explainQuery(''),
    };
  }

  const q = sanitized.query;
  const understanding = explainQuery(q);
  const useAiAssist = adminId ? await shouldRunAiAssist(adminId) : false;

  if (!useAiAssist) {
    const cached = await getCachedSearch<IntelligenceSearchResponse>(q, safeLimit);
    if (cached) {
      return { ...cached, cached: true, understanding };
    }
  }

  const { intent, label: intentLabel } = classifyQuery(q);

  let hits: IntelligenceSearchHit[] = [];
  let engine: 'meilisearch' | 'mongodb' = 'mongodb';

  const meiliHits = await searchMeilisearch(q, safeLimit);
  if (meiliHits.length > 0) {
    hits = meiliHits;
    engine = 'meilisearch';
  } else {
    const docs = await mongoIntelligenceSearch(q, intent, Math.ceil(safeLimit / 4));
    hits = docs.slice(0, safeLimit).map((d) => docToHit(d));
  }

  const registryDocs = await registryLookup(q, intent, INTEL_MAX_REGISTRY_PER_TYPE);
  const registryHits = registryDocs.map((d) => docToHit(d));
  const seenIds = new Set(hits.map((h) => h.id));
  for (const h of registryHits) {
    if (!seenIds.has(h.id)) {
      hits.push(h);
      seenIds.add(h.id);
    }
  }

  const primaryCount = hits.length;
  let graphExpanded = 0;

  if (shouldRunGraphExpansion(understanding.allowGraphExpansion, primaryCount)) {
    const graphDocs = await expandGraphFromSeeds(
      hits.slice(0, INTEL_MAX_GRAPH_SEEDS).map((h) => ({ entityType: h.entityType, entityId: h.entityId })),
    );
    for (const d of graphDocs) {
      const h = docToHit(d);
      if (!seenIds.has(h.id) && graphExpanded < INTEL_MAX_GRAPH_EXPAND) {
        hits.push(h);
        seenIds.add(h.id);
        graphExpanded += 1;
      }
    }
  }

  let aiEnabled = false;
  let aiInsight: IntelligenceSearchResponse['aiInsight'];

  if (useAiAssist) {
    aiEnabled = true;
    const insight = await buildIntelligenceAiInsight({
      query: q,
      understanding: {
        intent: understanding.intent,
        intentLabel: understanding.intentLabel,
        summary: understanding.summary,
        searchScope: understanding.searchScope,
        tips: understanding.tips,
        keywords: understanding.keywords,
      },
      resultCount: hits.length,
      hitSummaries: hits.slice(0, 12).map((h) => ({
        type: h.entityType,
        title: h.title,
        subtitle: h.subtitle,
        status: h.status,
      })),
    });

    if (insight) {
      aiInsight = insight;
      if (insight.extractedTerms.length > 0 && hits.length < 6) {
        for (const term of insight.extractedTerms.slice(0, 3)) {
          const extraDocs = await registryLookup(term, 'general', 3);
          for (const d of extraDocs) {
            const h = docToHit(d);
            if (!seenIds.has(h.id) && hits.length < safeLimit + INTEL_MAX_GRAPH_EXPAND) {
              hits.push(h);
              seenIds.add(h.id);
            }
          }
        }
      }
    }
  }

  const truncated = hits.length > safeLimit;
  const cappedHits = rankIntelligenceHits(
    hits.slice(0, safeLimit + graphExpanded),
    intent,
    q,
  );
  let assistant = buildRuleAssistantBrief({
    query: q,
    understanding,
    hits: cappedHits,
  });
  if (aiInsight) {
    assistant = mergeGeminiIntoBrief(assistant, aiInsight);
  }

  const groups = groupHits(cappedHits);
  const response: IntelligenceSearchResponse = {
    query: q,
    intent,
    intentLabel,
    groups,
    total: Math.min(hits.length, safeLimit + graphExpanded),
    tookMs: Date.now() - started,
    engine,
    cached: false,
    graphExpanded,
    truncated,
    aiEnabled,
    aiInsight,
    assistant,
    understanding: {
      intent: understanding.intent,
      intentLabel: understanding.intentLabel,
      summary: understanding.summary,
      searchScope: understanding.searchScope,
      tips: understanding.tips,
      keywords: understanding.keywords,
    },
  };

  if (!aiEnabled) {
    await setCachedSearch(q, safeLimit, response);
  }

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

export function stripLiteEntityPreview(preview: IntelligenceEntityPreview): IntelligenceEntityPreview {
  return {
    ...preview,
    fields: preview.fields.slice(0, 6),
    relationships: preview.relationships.slice(0, 4),
    connectedRecords: undefined,
    timeline: undefined,
  };
}

export async function getEntityPreview(
  entityType: IntelligenceEntityType,
  entityId: string,
  depth: 'lite' | 'full' = 'full',
): Promise<IntelligenceEntityPreview | null> {
  const cached = await getCachedPreview<IntelligenceEntityPreview>(entityType, entityId);
  if (cached) return depth === 'lite' ? stripLiteEntityPreview(cached) : cached;

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
    case 'dispute':
      preview = await previewDispute(entityId);
      break;
    default:
      preview = null;
  }

  if (preview) await setCachedPreview(entityType, entityId, preview);
  return preview ? (depth === 'lite' ? stripLiteEntityPreview(preview) : preview) : null;
}

async function previewUser(userId: string, type: IntelligenceEntityType): Promise<IntelligenceEntityPreview | null> {
  const u = await User.findById(userId)
    .select('fullName email phone role accountStatus location createdAt warningCount')
    .lean();
  if (!u) return null;

  const oid = new mongoose.Types.ObjectId(userId);
  const isSeller = u.role === 'seller' || type === 'seller';

  const [orderCount, productCount, paymentCount, ticketCount, disputeCount, recentOrders, recentPayments] =
    await Promise.all([
      Order.countDocuments({ $or: [{ buyerId: oid }, { sellerId: oid }] } as Record<string, unknown>),
      isSeller ? Product.countDocuments({ sellerId: oid }) : Promise.resolve(0),
      TransactionLog.countDocuments({ $or: [{ buyerId: oid }, { sellerId: oid }] }),
      SupportTicket.countDocuments({ sellerId: oid }),
      Dispute.countDocuments({ $or: [{ sellerId: oid }, { buyerId: oid }] }),
      Order.find((isSeller ? { sellerId: oid } : { buyerId: oid }) as Record<string, unknown>)
        .select('orderNumber status total paymentMethod createdAt')
        .sort({ createdAt: -1 })
        .limit(4)
        .lean(),
      TransactionLog.find({ $or: [{ buyerId: oid }, { sellerId: oid }] } as Record<string, unknown>)
        .sort({ createdAt: -1 })
        .limit(4)
        .lean(),
    ]);

  const connected: IntelligenceConnectedRecord[] = [
    ...recentOrders.map((o) => ({
      entityType: 'order' as const,
      entityId: String(o._id),
      title: `Order ${o.orderNumber}`,
      subtitle: `${o.status} · ${o.paymentMethod || '—'} · $${Number(o.total || 0).toFixed(2)}`,
      status: o.status,
      href: `/admin/orders?orderId=${o._id}`,
    })),
    ...recentPayments.map((t) => ({
      entityType: 'payment' as const,
      entityId: String(t._id),
      title: `Payment ${t.flutterwaveRef || String(t._id).slice(-6)}`,
      subtitle: `${t.type} · ${t.status}`,
      status: t.status,
      href: `/admin/finance?tab=transactions&txnId=${t._id}`,
    })),
  ];

  return {
    entityType: isSeller ? 'seller' : 'user',
    entityId: userId,
    title: u.fullName || 'User',
    subtitle: `${u.email || ''} · ${u.phone || ''}`,
    status: u.accountStatus || u.role,
    statusTone: statusTone(u.accountStatus || u.role),
    fields: [
      { label: 'Email', value: u.email || '—' },
      { label: 'Phone', value: u.phone || '—' },
      { label: 'Role', value: String(u.role || '') },
      { label: 'Location', value: u.location || '—' },
      { label: 'Warnings', value: String(u.warningCount ?? 0) },
    ],
    actions: [
      {
        label: isSeller ? 'Open Seller profile' : 'Open User',
        href: isSeller ? `/admin/sellers?seller=${userId}` : `/admin/users?userId=${userId}`,
        primary: true,
      },
      { label: 'All orders', href: `/admin/orders?${isSeller ? `sellerId=${userId}` : `userId=${userId}`}` },
      { label: 'Finance', href: `/admin/finance?${isSeller ? `sellerId=${userId}` : `userId=${userId}`}` },
    ],
    relationships: [
      { label: 'Orders', count: orderCount, href: `/admin/orders?userId=${userId}` },
      ...(isSeller ? [{ label: 'Products', count: productCount, href: `/admin/products?sellerId=${userId}` }] : []),
      { label: 'Payments', count: paymentCount, href: `/admin/finance?sellerId=${userId}` },
      { label: 'Support tickets', count: ticketCount, href: `/admin/support?sellerId=${userId}` },
      { label: 'Disputes', count: disputeCount, href: `/admin/support?tab=disputes&sellerId=${userId}` },
    ],
    connectedRecords: connected,
  };
}

async function previewOrder(orderId: string): Promise<IntelligenceEntityPreview | null> {
  const o = (await Order.findById(orderId).lean()) as Record<string, unknown> | null;
  if (!o) return null;

  const oid = o._id as mongoose.Types.ObjectId;
  const [seller, buyer, payments, tickets, disputes, returnCount] = await Promise.all([
    o.sellerId ? User.findById(o.sellerId as mongoose.Types.ObjectId).select('fullName email phone role').lean() : null,
    o.buyerId ? User.findById(o.buyerId as mongoose.Types.ObjectId).select('fullName email phone').lean() : null,
    TransactionLog.find({ orderId: oid }).sort({ createdAt: -1 }).limit(8).lean(),
    SupportTicket.find({ relatedOrderId: oid }).select('ticketNumber subject status').limit(4).lean(),
    Dispute.find({ orderId: oid }).select('disputeNumber type status reason').limit(4).lean(),
    ReturnCase.countDocuments({ orderId: oid }),
  ]);

  const pay = o.payment as { method?: string; paidAt?: Date; flutterwaveReference?: string; momoReferenceId?: string } | undefined;
  const escrow = o.escrow as { status?: string } | undefined;
  const addr = o.shippingAddress as { street?: string; city?: string; state?: string; zip?: string } | undefined;
  const addressLine = addr
    ? [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ')
    : '—';

  const connected: IntelligenceConnectedRecord[] = [];
  if (seller) {
    connected.push({
      entityType: 'seller',
      entityId: String(seller._id),
      title: seller.fullName || 'Seller',
      subtitle: `${seller.email || ''} · ${seller.phone || ''}`,
      href: `/admin/sellers?seller=${seller._id}`,
    });
  }
  if (buyer) {
    connected.push({
      entityType: 'user',
      entityId: String(buyer._id),
      title: buyer.fullName || 'Buyer',
      subtitle: `${buyer.email || ''} · ${buyer.phone || ''}`,
      href: `/admin/users?userId=${buyer._id}`,
    });
  }
  for (const t of payments) {
    connected.push({
      entityType: 'payment',
      entityId: String(t._id),
      title: `Payment ${t.flutterwaveRef || String(t._id).slice(-6)}`,
      subtitle: `${t.type} · ${t.currency} ${Number(t.amount || 0).toFixed(2)} · ${t.status}`,
      status: t.status,
      href: `/admin/finance?tab=transactions&txnId=${t._id}`,
    });
  }
  for (const d of disputes) {
    connected.push({
      entityType: 'dispute',
      entityId: String(d._id),
      title: d.disputeNumber || 'Dispute',
      subtitle: `${d.type} · ${d.reason || ''}`,
      status: d.status,
      href: `/admin/support?tab=disputes&disputeId=${d._id}`,
    });
  }
  for (const t of tickets) {
    connected.push({
      entityType: 'support',
      entityId: String(t._id),
      title: t.ticketNumber || 'Ticket',
      subtitle: t.subject || '',
      status: t.status,
      href: `/admin/support?ticketId=${t._id}`,
    });
  }

  const timeline: Array<{ label: string; at: string }> = [];
  if (pay?.paidAt) timeline.push({ label: 'Payment received', at: new Date(pay.paidAt).toLocaleString() });
  if (Array.isArray(o.timeline)) {
    for (const entry of o.timeline.slice(-6)) {
      timeline.push({
        label: String((entry as { status?: string }).status || 'Update'),
        at: new Date((entry as { date?: Date }).date || Date.now()).toLocaleString(),
      });
    }
  }

  return {
    entityType: 'order',
    entityId: orderId,
    title: `Order ${String(o.orderNumber || '')}`,
    subtitle: `${String(o.customer || 'Customer')} · ${String(o.paymentMethod || pay?.method || '—')}`,
    status: String(o.status || ''),
    statusTone: statusTone(String(o.status || '')),
    fields: [
      { label: 'Amount', value: `${String(o.currency || 'USD')} ${Number(o.total || 0).toFixed(2)}` },
      { label: 'Payment method', value: String(o.paymentMethod || pay?.method || '—') },
      { label: 'Escrow', value: escrow?.status || '—' },
      { label: 'Customer', value: String(o.customer || '—') },
      { label: 'Customer email', value: String(o.customerEmail || '—') },
      { label: 'Customer phone', value: String(o.customerPhone || '—') },
      { label: 'Seller', value: seller?.fullName || String(o.sellerName || '—') },
      { label: 'Tracking', value: String(o.trackingNumber || '—') },
      { label: 'Ship to', value: addressLine },
      {
        label: 'Payment ref',
        value: pay?.flutterwaveReference || pay?.momoReferenceId || payments[0]?.flutterwaveRef || '—',
      },
      {
        label: 'Created',
        value: new Date((o.date || o.createdAt || Date.now()) as Date).toLocaleString(),
      },
    ],
    actions: [
      { label: 'View Order', href: `/admin/orders?orderId=${orderId}`, primary: true },
      { label: 'Open Finance', href: `/admin/finance?orderId=${orderId}` },
      { label: 'Support', href: `/admin/support?orderId=${orderId}` },
    ],
    relationships: [
      { label: 'Payments', count: payments.length, href: `/admin/finance?orderId=${orderId}` },
      { label: 'Disputes', count: disputes.length, href: `/admin/support?tab=disputes&orderId=${orderId}` },
      { label: 'Returns', count: returnCount, href: `/admin/returns?orderId=${orderId}` },
      { label: 'Tickets', count: tickets.length, href: `/admin/support?orderId=${orderId}` },
    ],
    connectedRecords: connected,
    timeline: timeline.length ? timeline : undefined,
  };
}

async function previewPayment(paymentId: string): Promise<IntelligenceEntityPreview | null> {
  const t = await TransactionLog.findById(paymentId).lean();
  if (!t) return null;

  const ref = t.flutterwaveRef || (t.metadata as { gatewayRef?: string })?.gatewayRef || paymentId.slice(-8);
  const order = t.orderId
    ? await Order.findById(t.orderId)
        .select('orderNumber status total paymentMethod customer customerEmail sellerId sellerName createdAt')
        .lean()
    : null;

  const connected: IntelligenceConnectedRecord[] = [];
  if (order) {
    connected.push({
      entityType: 'order',
      entityId: String(order._id),
      title: `Order ${order.orderNumber}`,
      subtitle: `${order.status} · ${order.paymentMethod || '—'}`,
      status: order.status,
      href: `/admin/orders?orderId=${order._id}`,
    });
  }
  if (t.sellerId) {
    const s = await User.findById(t.sellerId).select('fullName email phone').lean();
    if (s) {
      connected.push({
        entityType: 'seller',
        entityId: String(s._id),
        title: s.fullName || 'Seller',
        subtitle: s.email || '',
        href: `/admin/sellers?seller=${s._id}`,
      });
    }
  }

  return {
    entityType: 'payment',
    entityId: paymentId,
    title: `Payment ${ref}`,
    subtitle: `${t.type} · ${t.status}`,
    status: t.status,
    statusTone: statusTone(t.status),
    fields: [
      { label: 'Amount', value: `${t.currency} ${Number(t.amount || 0).toFixed(2)}` },
      { label: 'Type', value: t.type },
      { label: 'Reference', value: ref },
      { label: 'Order', value: order ? order.orderNumber : '—' },
      { label: 'Paid at', value: t.createdAt ? new Date(t.createdAt).toLocaleString() : '—' },
    ],
    actions: [
      { label: 'Open Payment', href: `/admin/finance?tab=transactions&txnId=${paymentId}`, primary: true },
      ...(order
        ? [{ label: 'Full order dossier', href: `/admin/orders?orderId=${order._id}`, primary: false }]
        : []),
    ],
    relationships: [
      ...(t.orderId ? [{ label: 'Order', count: 1, href: `/admin/orders?orderId=${t.orderId}` }] : []),
    ],
    connectedRecords: connected,
  };
}

async function previewDispute(disputeId: string): Promise<IntelligenceEntityPreview | null> {
  const d = await Dispute.findById(disputeId).lean();
  if (!d) return null;

  const order = d.orderId
    ? await Order.findById(d.orderId).select('orderNumber status total paymentMethod customer').lean()
    : null;

  const connected: IntelligenceConnectedRecord[] = [];
  if (order) {
    connected.push({
      entityType: 'order',
      entityId: String(order._id),
      title: `Order ${order.orderNumber}`,
      subtitle: `${order.paymentMethod || '—'} · $${Number(order.total || 0).toFixed(2)}`,
      status: order.status,
      href: `/admin/orders?orderId=${order._id}`,
    });
  }

  return {
    entityType: 'dispute',
    entityId: disputeId,
    title: d.disputeNumber || 'Dispute',
    subtitle: d.reason || d.type,
    status: d.status,
    statusTone: statusTone(d.status),
    fields: [
      { label: 'Type', value: d.type },
      { label: 'Reason', value: d.reason || '—' },
      { label: 'Order', value: order?.orderNumber || '—' },
      { label: 'Created', value: d.createdAt ? new Date(d.createdAt).toLocaleString() : '—' },
    ],
    actions: [
      { label: 'Open Dispute', href: `/admin/support?tab=disputes&disputeId=${disputeId}`, primary: true },
      ...(order ? [{ label: 'View Order', href: `/admin/orders?orderId=${order._id}` }] : []),
    ],
    relationships: order ? [{ label: 'Order', count: 1, href: `/admin/orders?orderId=${order._id}` }] : [],
    connectedRecords: connected,
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
