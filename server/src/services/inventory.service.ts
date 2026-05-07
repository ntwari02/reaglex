import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { StockHistory, StockHistoryCreateInput } from '../models/StockHistory';
import { websocketService } from './websocketService';

export class InventoryOutOfStockError extends Error {
  constructor(message = 'Out of stock') {
    super(message);
    this.name = 'InventoryOutOfStockError';
  }
}

type InventoryChangeReason =
  | 'order_paid'
  | 'order_cancelled'
  | 'order_refunded'
  | 'order_returned';

function toInventoryStatus(stock: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (stock <= 0) return 'out_of_stock';
  if (stock < 20) return 'low_stock';
  return 'in_stock';
}

function isLikelyObjectId(v?: string): boolean {
  return !!v && mongoose.Types.ObjectId.isValid(v);
}

async function emitInventoryUpdated(productDoc: any) {
  websocketService.emitInventoryUpdated({
    productId: String(productDoc._id),
    stock: Number(productDoc.stock || 0),
    status: String(productDoc.status || toInventoryStatus(Number(productDoc.stock || 0))),
    variants: Array.isArray(productDoc.variants)
      ? productDoc.variants.map((v: any) => ({
          id: String(v?._id || ''),
          sku: String(v?.sku || ''),
          stock: Number(v?.stock || 0),
        }))
      : [],
  });
}

async function createStockHistoryEntry(
  payload: StockHistoryCreateInput,
  session: mongoose.ClientSession,
) {
  const entry = new StockHistory(payload);
  await entry.save({ session });
}

async function decrementProductStockForItem(
  productId: mongoose.Types.ObjectId,
  quantity: number,
  variantKey: string | undefined,
  session: mongoose.ClientSession,
) {
  const qty = Math.max(1, Number(quantity || 0));
  if (!qty) throw new Error('Invalid quantity');

  const baseFilter: any = { _id: productId, stock: { $gte: qty } };
  let updated: any = null;

  if (variantKey) {
    if (isLikelyObjectId(variantKey)) {
      updated = await Product.findOneAndUpdate(
        {
          ...baseFilter,
          variants: { $elemMatch: { _id: new mongoose.Types.ObjectId(variantKey), stock: { $gte: qty } } },
        },
        {
          $inc: { stock: -qty, 'variants.$.stock': -qty, soldCount: qty },
        },
        { new: true, session },
      );
    }

    if (!updated) {
      updated = await Product.findOneAndUpdate(
        {
          ...baseFilter,
          variants: { $elemMatch: { sku: variantKey, stock: { $gte: qty } } },
        },
        {
          $inc: { stock: -qty, 'variants.$.stock': -qty, soldCount: qty },
        },
        { new: true, session },
      );
    }
  } else {
    updated = await Product.findOneAndUpdate(
      baseFilter,
      { $inc: { stock: -qty, soldCount: qty } },
      { new: true, session },
    );
  }

  if (!updated) {
    throw new InventoryOutOfStockError('Insufficient stock for one or more items');
  }

  updated.status = toInventoryStatus(updated.stock);
  await updated.save({ session });
  return updated;
}

async function incrementProductStockForItem(
  productId: mongoose.Types.ObjectId,
  quantity: number,
  variantKey: string | undefined,
  session: mongoose.ClientSession,
) {
  const qty = Math.max(1, Number(quantity || 0));
  if (!qty) throw new Error('Invalid quantity');

  let updated: any = null;
  if (variantKey) {
    if (isLikelyObjectId(variantKey)) {
      updated = await Product.findOneAndUpdate(
        {
          _id: productId,
          variants: { $elemMatch: { _id: new mongoose.Types.ObjectId(variantKey) } },
        },
        { $inc: { stock: qty, 'variants.$.stock': qty } },
        { new: true, session },
      );
    }

    if (!updated) {
      updated = await Product.findOneAndUpdate(
        {
          _id: productId,
          variants: { $elemMatch: { sku: variantKey } },
        },
        { $inc: { stock: qty, 'variants.$.stock': qty } },
        { new: true, session },
      );
    }
  } else {
    updated = await Product.findOneAndUpdate(
      { _id: productId },
      { $inc: { stock: qty } },
      { new: true, session },
    );
  }

  if (!updated) {
    throw new Error('Product not found while restoring stock');
  }

  updated.status = toInventoryStatus(updated.stock);
  await updated.save({ session });
  return updated;
}

export async function ensureStockAvailableForOrderPayload(
  sellerGroups: Array<{ items: Array<{ product_id: string; variant_id?: string; quantity: number }> }>,
) {
  for (const group of sellerGroups || []) {
    for (const item of group.items || []) {
      if (!mongoose.Types.ObjectId.isValid(item.product_id)) {
        throw new Error('Invalid product in cart');
      }
      const product = await Product.findById(item.product_id).lean();
      if (!product) throw new Error('Product not found');
      const qty = Math.max(1, Number(item.quantity || 0));
      if ((product.stock || 0) < qty) throw new Error('Insufficient stock for one or more items');
      if (item.variant_id) {
        const variants = Array.isArray(product.variants) ? product.variants : [];
        const variant = variants.find(
          (v: any) =>
            String(v?._id || '') === String(item.variant_id) || String(v?.sku || '') === String(item.variant_id),
        );
        if (!variant || Number(variant.stock || 0) < qty) {
          throw new Error('Insufficient stock for one or more variants');
        }
      }
    }
  }
}

export async function decrementInventoryForPaidOrder(orderId: string) {
  const session = await mongoose.startSession();
  try {
    let touchedProducts = new Map<string, any>();
    await session.withTransaction(async () => {
      touchedProducts = await decrementInventoryForPaidOrderInSession(orderId, session);
    });
    for (const p of touchedProducts.values()) {
      await emitInventoryUpdated(p);
    }
  } finally {
    await session.endSession();
  }
}

export async function emitInventoryUpdatedForOrder(orderId: string) {
  const order = await Order.findById(orderId).lean();
  if (!order) return;
  const uniqueIds = Array.from(new Set((order.items || []).map((i: any) => String(i.productId))));
  if (!uniqueIds.length) return;
  const products = await Product.find({ _id: { $in: uniqueIds } }).lean();
  for (const product of products) {
    await emitInventoryUpdated(product);
  }
}

export async function decrementInventoryForPaidOrderInSession(
  orderId: string,
  session: mongoose.ClientSession,
): Promise<Map<string, any>> {
  const touchedProducts = new Map<string, any>();
  const order = await Order.findById(orderId).session(session);
  if (!order) throw new Error('Order not found');

  if (order.inventory?.stockDeductedAt) {
    return touchedProducts;
  }

  for (const item of order.items || []) {
    const updated = await decrementProductStockForItem(
      new mongoose.Types.ObjectId(String(item.productId)),
      Number(item.quantity || 0),
      item.variant,
      session,
    );

    touchedProducts.set(String(updated._id), updated);

    await createStockHistoryEntry(
      {
        sellerId: new mongoose.Types.ObjectId(String(order.sellerId)),
        productId: new mongoose.Types.ObjectId(String(updated._id)),
        productName: item.name || updated.name,
        sku: updated.sku,
        change: -Math.abs(Number(item.quantity || 0)),
        reason: `Inventory deducted for paid order ${order.orderNumber}`,
        type: 'sold',
        date: new Date(),
      },
      session,
    );
  }

  order.inventory = {
    ...(order.inventory || {}),
    stockDeductedAt: new Date(),
    lastChangeReason: 'order_paid',
  } as any;
  await order.save({ session });
  return touchedProducts;
}

export async function restoreInventoryForOrder(orderId: string, reason: InventoryChangeReason) {
  const session = await mongoose.startSession();
  const touchedProducts = new Map<string, any>();
  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);
      if (!order) throw new Error('Order not found');

      if (!order.inventory?.stockDeductedAt || order.inventory?.stockRestoredAt) {
        return;
      }

      for (const item of order.items || []) {
        const updated = await incrementProductStockForItem(
          new mongoose.Types.ObjectId(String(item.productId)),
          Number(item.quantity || 0),
          item.variant,
          session,
        );

        touchedProducts.set(String(updated._id), updated);

        await createStockHistoryEntry(
          {
            sellerId: new mongoose.Types.ObjectId(String(order.sellerId)),
            productId: new mongoose.Types.ObjectId(String(updated._id)),
            productName: item.name || updated.name,
            sku: updated.sku,
            change: Math.abs(Number(item.quantity || 0)),
            reason: `Inventory restored for ${reason} (${order.orderNumber})`,
            type: 'added',
            date: new Date(),
          },
          session,
        );
      }

      order.inventory = {
        ...(order.inventory || {}),
        stockRestoredAt: new Date(),
        lastChangeReason: reason,
      } as any;
      await order.save({ session });
    });

    for (const p of touchedProducts.values()) {
      await emitInventoryUpdated(p);
    }
  } finally {
    await session.endSession();
  }
}

