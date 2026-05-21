import mongoose from 'mongoose';
import { BuyerCloudCart, ICloudCartLine, ICartDeviceSession, CartDevicePlatform } from '../models/BuyerCloudCart';
import { Product } from '../models/Product';

export type ClientCartLine = {
  id?: string;
  productId?: string;
  variantId?: string;
  quantity?: number;
  title?: string;
  price?: number;
  image?: string;
  seller?: string;
};

function lineKey(productId: string, variantId?: string) {
  return `${productId}::${variantId || ''}`;
}

export function normalizeClientLines(raw: ClientCartLine[]): ICloudCartLine[] {
  const map = new Map<string, ICloudCartLine>();
  for (const row of raw || []) {
    const productId = String(row.productId || row.id || '').trim();
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) continue;
    const variantId = String(row.variantId || '').trim();
    const key = lineKey(productId, variantId);
    const qty = Math.max(1, Math.min(999, Number(row.quantity) || 1));
    const existing = map.get(key);
    if (existing) {
      existing.quantity = Math.max(existing.quantity, qty);
      existing.updatedAt = new Date();
    } else {
      map.set(key, {
        productId,
        variantId: variantId || undefined,
        quantity: qty,
        title: String(row.title || 'Product').slice(0, 200),
        price: Math.max(0, Number(row.price) || 0),
        image: String(row.image || '').slice(0, 500),
        seller: String(row.seller || 'Seller').slice(0, 120),
        updatedAt: new Date(),
      });
    }
  }
  return [...map.values()];
}

export function mergeCartLines(a: ICloudCartLine[], b: ICloudCartLine[]): ICloudCartLine[] {
  const map = new Map<string, ICloudCartLine>();
  for (const line of [...a, ...b]) {
    const key = lineKey(line.productId, line.variantId);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...line, updatedAt: new Date() });
      continue;
    }
    existing.quantity = Math.max(existing.quantity, line.quantity);
    existing.updatedAt = new Date();
    if (line.updatedAt && existing.updatedAt && line.updatedAt > existing.updatedAt) {
      existing.title = line.title || existing.title;
      existing.price = line.price ?? existing.price;
      existing.image = line.image || existing.image;
      existing.seller = line.seller || existing.seller;
    }
  }
  return [...map.values()];
}

export function toClientCartLines(lines: ICloudCartLine[]) {
  return lines.map((l) => ({
    id: l.productId,
    productId: l.productId,
    variantId: l.variantId || '',
    quantity: l.quantity,
    title: l.title,
    price: l.price,
    image: l.image || '',
    seller: l.seller || 'Seller',
  }));
}

async function refreshLinesFromCatalog(lines: ICloudCartLine[]): Promise<ICloudCartLine[]> {
  if (!lines.length) return [];
  const ids = lines.map((l) => l.productId).filter((id) => mongoose.Types.ObjectId.isValid(id));
  const products = await Product.find({ _id: { $in: ids }, publicationStatus: { $ne: 'draft' } })
    .select('name title price images image sellerId sellerName')
    .lean();
  const byId = new Map(products.map((p: any) => [String(p._id), p]));
  const out: ICloudCartLine[] = [];
  for (const line of lines) {
    const p = byId.get(line.productId);
    if (!p) continue;
    out.push({
      ...line,
      title: String(p.title || p.name || line.title),
      price: Number(p.price ?? line.price) || 0,
      image: String(p.images?.[0] || p.image || line.image || ''),
      seller: line.seller || 'Seller',
    });
  }
  return out;
}

function upsertDeviceSession(
  sessions: ICartDeviceSession[],
  input: { deviceId: string; platform: CartDevicePlatform; userAgent?: string; itemCount: number }
): ICartDeviceSession[] {
  const now = new Date();
  const next = sessions.filter((s) => s.deviceId !== input.deviceId);
  next.unshift({
    deviceId: input.deviceId,
    platform: input.platform,
    userAgent: (input.userAgent || '').slice(0, 300),
    lastSyncAt: now,
    itemCount: input.itemCount,
  });
  return next.slice(0, 20);
}

export async function getCloudCartForUser(userId: string) {
  const uid = new mongoose.Types.ObjectId(userId);
  let doc = await BuyerCloudCart.findOne({ userId: uid });
  if (!doc) {
    doc = await BuyerCloudCart.create({ userId: uid, items: [], deviceSessions: [] });
  }
  return doc;
}

export async function syncCloudCart(params: {
  userId: string;
  clientLines: ClientCartLine[];
  mergeMode: 'merge' | 'replace';
  deviceId: string;
  platform: CartDevicePlatform;
  userAgent?: string;
  shippingPreviewLocation?: {
    country?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}) {
  const uid = new mongoose.Types.ObjectId(params.userId);
  const incoming = normalizeClientLines(params.clientLines);
  let doc = await BuyerCloudCart.findOne({ userId: uid });
  if (!doc) {
    doc = new BuyerCloudCart({ userId: uid, items: [], deviceSessions: [] });
  }

  const merged =
    params.mergeMode === 'merge' ? mergeCartLines(doc.items || [], incoming) : incoming;
  doc.items = await refreshLinesFromCatalog(merged);
  doc.version = (doc.version || 0) + 1;
  doc.deviceSessions = upsertDeviceSession(doc.deviceSessions || [], {
    deviceId: params.deviceId,
    platform: params.platform,
    userAgent: params.userAgent,
    itemCount: doc.items.length,
  });

  if (params.shippingPreviewLocation) {
    doc.shippingPreviewLocation = {
      country: String(params.shippingPreviewLocation.country || 'RW').trim() || 'RW',
      city: String(params.shippingPreviewLocation.city || 'Kigali').trim() || 'Kigali',
      state: String(params.shippingPreviewLocation.state || '').trim(),
      zip: String(params.shippingPreviewLocation.zip || '').trim(),
    };
  }

  await doc.save();

  return {
    items: toClientCartLines(doc.items),
    shippingPreviewLocation: doc.shippingPreviewLocation,
    deviceSessions: doc.deviceSessions,
    version: doc.version,
    updatedAt: doc.updatedAt,
  };
}
