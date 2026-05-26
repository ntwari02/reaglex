import mongoose from 'mongoose';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { TransactionLog } from '../models/TransactionLog';
import { SupportTicket } from '../models/SupportTicket';
import { Dispute } from '../models/Dispute';
import { FleetDriver } from '../models/FleetDriver';
import { SellerSubscription } from '../models/SellerSubscription';
import type { IntelligenceEntityType, IntelligenceSearchDocument, QueryIntent } from './intelligenceSearch.types';
import { escapeRegex } from './queryClassifier';
import {
  buildUserDocsFromRows,
  mapOrderDoc,
  mapPaymentDoc,
  mapProductDoc,
  mapSupportDoc,
  mapVehicleDoc,
  mapSubscriptionDoc,
  mapDisputeDoc,
} from './intelligenceIndex.service';

const MAX_GRAPH = 16;

function dedupeDocs(docs: IntelligenceSearchDocument[]): IntelligenceSearchDocument[] {
  const seen = new Set<string>();
  return docs.filter((d) => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });
}

/** Registry lookup: one identifier → all directly linked records (population-style). */
export async function registryLookup(
  query: string,
  intent: QueryIntent,
  limitPerType = 8,
): Promise<IntelligenceSearchDocument[]> {
  const q = query.trim();
  if (!q) return [];

  const docs: IntelligenceSearchDocument[] = [];
  const regex = new RegExp(escapeRegex(q), 'i');
  const digits = q.replace(/\D/g, '');
  const phoneTail = digits.length >= 7 ? digits.slice(-9) : '';

  if (intent === 'email' || intent === 'general') {
    const emailMatch = intent === 'email' ? { email: regex } : { $or: [{ email: regex }, { fullName: regex }] };
    const users = await User.find(emailMatch).select('fullName email phone role city country accountStatus createdAt').limit(limitPerType).lean();
    docs.push(...buildUserDocsFromRows(users));

    const ordersByEmail = await Order.find({
      $or: [{ customerEmail: regex }, { customer: regex }],
    })
      .select('orderNumber status total currency customer customerEmail customerPhone sellerId buyerId date createdAt paymentMethod trackingNumber sellerName')
      .limit(limitPerType)
      .lean();
    docs.push(...ordersByEmail.map(mapOrderDoc));
  }

  if (intent === 'phone' || (intent === 'general' && phoneTail)) {
    const phoneOr: Record<string, unknown>[] = [{ phone: regex }];
    if (phoneTail) {
      const tailRe = new RegExp(escapeRegex(phoneTail) + '$');
      phoneOr.push({ phone: tailRe }, { customerPhone: tailRe });
    }
    const users = await User.find({ $or: phoneOr })
      .select('fullName email phone role city country accountStatus createdAt')
      .limit(limitPerType)
      .lean();
    docs.push(...buildUserDocsFromRows(users));

    const orderPhoneFilter = phoneTail
      ? { customerPhone: { $regex: escapeRegex(phoneTail) + '$' } }
      : { customerPhone: regex };
    const ordersByPhone = await Order.find(orderPhoneFilter)
      .select('orderNumber status total currency customer customerEmail customerPhone sellerId buyerId date createdAt paymentMethod trackingNumber sellerName')
      .limit(limitPerType)
      .lean();
    docs.push(...ordersByPhone.map(mapOrderDoc));
  }

  if (intent === 'order_id' || intent === 'general') {
    const orderFilter =
      intent === 'order_id'
        ? { orderNumber: regex }
        : {
            $or: [
              { orderNumber: regex },
              { customer: regex },
              { customerEmail: regex },
              { trackingNumber: regex },
              { sellerName: regex },
            ],
          };
    const orders = await Order.find(orderFilter)
      .select('orderNumber status total currency customer customerEmail customerPhone sellerId buyerId date createdAt paymentMethod trackingNumber sellerName')
      .limit(limitPerType)
      .lean();
    docs.push(...orders.map(mapOrderDoc));
  }

  if (intent === 'payment_ref' || intent === 'general') {
    const payments = await TransactionLog.find({
      $or: [
        { flutterwaveRef: regex },
        { status: regex },
        ...(mongoose.Types.ObjectId.isValid(q) ? [{ orderId: new mongoose.Types.ObjectId(q) }] : []),
      ],
    })
      .select('type amount currency status flutterwaveRef orderId sellerId buyerId createdAt metadata')
      .limit(limitPerType)
      .lean();
    docs.push(...payments.map(mapPaymentDoc));
  }

  if (intent === 'plate' || intent === 'general') {
    const vehicles = await FleetDriver.find({
      $or: [{ vehicle: regex }, { name: regex }],
    })
      .limit(limitPerType)
      .lean();
    docs.push(...vehicles.map(mapVehicleDoc));
  }

  if (intent === 'object_id' && mongoose.Types.ObjectId.isValid(q)) {
    docs.push(...(await expandFromEntityId(q)));
  }

  return dedupeDocs(docs).slice(0, MAX_GRAPH);
}

/** Expand one MongoDB id across collections. */
async function expandFromEntityId(id: string): Promise<IntelligenceSearchDocument[]> {
  const oid = new mongoose.Types.ObjectId(id);
  const [user, order, product, payment, ticket, dispute] = await Promise.all([
    User.findById(oid).lean(),
    Order.findById(oid).lean(),
    Product.findById(oid).lean(),
    TransactionLog.findById(oid).lean(),
    SupportTicket.findById(oid).lean(),
    Dispute.findById(oid).lean(),
  ]);

  const docs: IntelligenceSearchDocument[] = [];
  if (user) docs.push(...buildUserDocsFromRows([user]));
  if (order) docs.push(mapOrderDoc(order));
  if (product) docs.push(mapProductDoc(product));
  if (payment) docs.push(mapPaymentDoc(payment));
  if (ticket) docs.push(mapSupportDoc(ticket));
  if (dispute) docs.push(mapDisputeDoc(dispute));
  if (order) docs.push(...(await expandFromOrder(order)));
  if (user) docs.push(...(await expandFromUser(user)));
  if (payment) docs.push(...(await expandFromPayment(payment)));
  return dedupeDocs(docs);
}

async function expandFromUser(u: any): Promise<IntelligenceSearchDocument[]> {
  const userId = u._id;
  const [ordersAsBuyer, ordersAsSeller, products, payments, tickets, disputes, sub] = await Promise.all([
    Order.find({ buyerId: userId })
      .select('orderNumber status total currency customer date createdAt paymentMethod sellerName')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    u.role === 'seller'
      ? Order.find({ sellerId: userId })
          .select('orderNumber status total currency customer date createdAt paymentMethod')
          .sort({ createdAt: -1 })
          .limit(6)
          .lean()
      : Promise.resolve([]),
    u.role === 'seller' ? Product.find({ sellerId: userId }).select('name sku status publicationStatus createdAt').limit(4).lean() : Promise.resolve([]),
    TransactionLog.find({ $or: [{ buyerId: userId }, { sellerId: userId }] })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    SupportTicket.find({ sellerId: userId }).select('ticketNumber subject status priority category updatedAt').limit(4).lean(),
    Dispute.find({ $or: [{ sellerId: userId }, { buyerId: userId }] })
      .select('disputeNumber type reason status orderId updatedAt')
      .limit(4)
      .lean(),
    u.role === 'seller' ? SellerSubscription.findOne({ user_id: userId }).lean() : Promise.resolve(null),
  ]);

  const docs: IntelligenceSearchDocument[] = [];
  docs.push(...ordersAsBuyer.map(mapOrderDoc), ...ordersAsSeller.map(mapOrderDoc));
  docs.push(...products.map(mapProductDoc));
  docs.push(...payments.map(mapPaymentDoc));
  docs.push(...tickets.map(mapSupportDoc));
  docs.push(...disputes.map(mapDisputeDoc));
  if (sub) docs.push(mapSubscriptionDoc(sub));
  return docs;
}

async function expandFromOrder(o: any): Promise<IntelligenceSearchDocument[]> {
  const orderId = o._id;
  const sellerId = o.sellerId;
  const buyerId = o.buyerId;

  const [seller, buyer, payments, tickets, disputes] = await Promise.all([
    sellerId ? User.findById(sellerId).select('fullName email phone role accountStatus createdAt').lean() : null,
    buyerId ? User.findById(buyerId).select('fullName email phone role accountStatus createdAt').lean() : null,
    TransactionLog.find({ orderId }).sort({ createdAt: -1 }).limit(8).lean(),
    SupportTicket.find({ relatedOrderId: orderId }).select('ticketNumber subject status priority category updatedAt').limit(4).lean(),
    Dispute.find({ orderId }).select('disputeNumber type reason status updatedAt').limit(4).lean(),
  ]);

  const docs: IntelligenceSearchDocument[] = [];
  if (seller) docs.push(...buildUserDocsFromRows([seller]));
  if (buyer) docs.push(...buildUserDocsFromRows([buyer]));
  docs.push(...payments.map(mapPaymentDoc));
  docs.push(...tickets.map(mapSupportDoc));
  docs.push(...disputes.map(mapDisputeDoc));
  return docs;
}

async function expandFromPayment(t: any): Promise<IntelligenceSearchDocument[]> {
  if (!t?.orderId) return [];
  const order = await Order.findById(t.orderId).lean();
  if (!order) return [];
  return expandFromOrder(order);
}

/** Follow graph edges from seed search hits (1 hop). */
export async function expandGraphFromSeeds(
  seeds: Array<{ entityType: IntelligenceEntityType; entityId: string }>,
): Promise<IntelligenceSearchDocument[]> {
  const docs: IntelligenceSearchDocument[] = [];

  for (const seed of seeds.slice(0, 6)) {
    if (!mongoose.Types.ObjectId.isValid(seed.entityId) && seed.entityType !== 'subscription') continue;

    switch (seed.entityType) {
      case 'user':
      case 'seller': {
        const u = await User.findById(seed.entityId).lean();
        if (u) docs.push(...(await expandFromUser(u)));
        break;
      }
      case 'order': {
        const o = await Order.findById(seed.entityId).lean();
        if (o) {
          docs.push(mapOrderDoc(o));
          docs.push(...(await expandFromOrder(o)));
        }
        break;
      }
      case 'payment': {
        const t = await TransactionLog.findById(seed.entityId).lean();
        if (t) {
          docs.push(mapPaymentDoc(t));
          docs.push(...(await expandFromPayment(t)));
        }
        break;
      }
      case 'support': {
        const ticket = await SupportTicket.findById(seed.entityId).lean();
        if (ticket) {
          docs.push(mapSupportDoc(ticket));
          if (ticket.sellerId) {
            const u = await User.findById(ticket.sellerId).lean();
            if (u) docs.push(...buildUserDocsFromRows([u]));
          }
          if (ticket.relatedOrderId) {
            const o = await Order.findById(ticket.relatedOrderId).lean();
            if (o) docs.push(...(await expandFromOrder(o)));
          }
        }
        break;
      }
      case 'dispute': {
        const d = await Dispute.findById(seed.entityId).lean();
        if (d) {
          docs.push(mapDisputeDoc(d));
          if (d.orderId) {
            const o = await Order.findById(d.orderId).lean();
            if (o) docs.push(...(await expandFromOrder(o)));
          }
        }
        break;
      }
      case 'product': {
        const p = await Product.findById(seed.entityId).lean();
        if (p) {
          docs.push(mapProductDoc(p));
          if (p.sellerId) {
            const u = await User.findById(p.sellerId).lean();
            if (u) docs.push(...buildUserDocsFromRows([u]));
          }
        }
        break;
      }
      default:
        break;
    }
  }

  return dedupeDocs(docs).slice(0, MAX_GRAPH);
}
