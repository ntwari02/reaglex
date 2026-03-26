/**
 * Gemini agent with function calling: Mongo-backed order/search/payment tools.
 * Uses @google/generative-ai SDK (ChatSession + function responses).
 */
import { GoogleGenerativeAI, FunctionCallingMode, SchemaType } from '@google/generative-ai';
import mongoose from 'mongoose';
import { getServerUrl } from '../config/publicEnv';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { initializePayment } from './paymentService';

const MAX_TOOL_ITERATIONS = 8;

export type ChatRole = 'guest' | 'buyer' | 'seller' | 'admin';

export interface GeminiChatContext {
  userId: string | null;
  role: ChatRole;
  email?: string;
  phone?: string;
  fullName?: string;
}

export interface ProductCard {
  id: string;
  name: string;
  price: number;
  currency: string;
  category?: string;
  imageUrls: string[];
}

export interface GeminiChatResult {
  reply: string;
  products?: ProductCard[];
  payment?: {
    paymentLink?: string;
    orderId?: string;
    amount?: number;
    currency?: string;
  };
}

function baseUrl(): string {
  return getServerUrl();
}

function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${baseUrl()}${url.startsWith('/') ? '' : '/'}${url}`;
}

type OrderOwnership = 'buyer' | 'seller' | 'admin' | 'none';

function orderOwnership(
  order: { buyerId: unknown; sellerId: unknown },
  userId: string | null,
  role: ChatRole
): OrderOwnership {
  if (!userId) return 'none';
  if (role === 'admin') return 'admin';
  if (String(order.buyerId) === userId) return 'buyer';
  if (String(order.sellerId) === userId) return 'seller';
  return 'none';
}

// --- Tool declarations (Gemini function calling) ---

const functionDeclarations = [
  {
    name: 'suggestProducts',
    description:
      'Search the catalog for products matching interests, budget, or category. Use for guests and logged-in users.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: 'Search text (e.g. watch, shoes, gift).',
        },
        maxPrice: {
          type: SchemaType.NUMBER,
          description: 'Maximum unit price (same currency as stored prices).',
        },
        category: {
          type: SchemaType.STRING,
          description: 'Optional category filter.',
        },
        limit: {
          type: SchemaType.NUMBER,
          description: 'Max results (default 8, max 15).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'getTrackingInfo',
    description:
      'Get order status and tracking number. Requires the user to be buyer or seller of the order (or admin).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        orderId: {
          type: SchemaType.STRING,
          description: 'MongoDB ObjectId of the order.',
        },
        orderNumber: {
          type: SchemaType.STRING,
          description: 'Human-readable order number if known.',
        },
      },
    },
  },
  {
    name: 'updateShippingAddress',
    description:
      'Update shipping address on an order before it ships. Only the buyer (or admin) can update.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        orderId: { type: SchemaType.STRING },
        name: { type: SchemaType.STRING },
        street: { type: SchemaType.STRING },
        city: { type: SchemaType.STRING },
        state: { type: SchemaType.STRING },
        zip: { type: SchemaType.STRING },
        country: { type: SchemaType.STRING },
      },
      required: ['orderId', 'name', 'street', 'city', 'state', 'zip', 'country'],
    },
  },
  {
    name: 'cancelOrder',
    description:
      'Cancel an order if it has not shipped yet. Buyer or seller of the order (or admin) may cancel.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        orderId: { type: SchemaType.STRING, description: 'Order id.' },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'initializeOrderPayment',
    description:
      'Create a Flutterwave payment link for an unpaid order. Only the buyer who owns the order can pay.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        orderId: { type: SchemaType.STRING },
      },
      required: ['orderId'],
    },
  },
];

function parseObjectId(id: string): mongoose.Types.ObjectId | null {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

async function findOrderByIdOrNumber(
  orderId?: string,
  orderNumber?: string
): Promise<any | null> {
  if (orderId) {
    const oid = parseObjectId(orderId);
    if (oid) {
      const o = await Order.findById(oid);
      if (o) return o;
    }
  }
  if (orderNumber && String(orderNumber).trim()) {
    return Order.findOne({ orderNumber: String(orderNumber).trim() });
  }
  return null;
}

interface ToolExtras {
  products?: ProductCard[];
  payment?: GeminiChatResult['payment'];
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: GeminiChatContext,
  extras: ToolExtras
): Promise<Record<string, unknown>> {
  switch (name) {
    case 'suggestProducts': {
      const query = String(args.query || '').trim();
      if (!query) {
        return { ok: false, error: 'Missing query.' };
      }
      const maxPrice =
        typeof args.maxPrice === 'number' && !Number.isNaN(args.maxPrice)
          ? args.maxPrice
          : undefined;
      const categoryRaw = args.category ? String(args.category).trim() : '';
      let limit = typeof args.limit === 'number' ? Math.min(15, Math.max(1, args.limit)) : 8;

      const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

      const filter: Record<string, unknown> = {
        stock: { $gt: 0 },
        status: { $in: ['in_stock', 'low_stock'] },
      };
      if (maxPrice !== undefined) {
        filter.price = { $lte: maxPrice };
      }

      const textMatch = {
        $or: [
          { name: regex },
          { description: regex },
          { category: regex },
          { tags: regex },
        ],
      };
      if (categoryRaw) {
        filter.$and = [
          textMatch,
          { category: new RegExp(categoryRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        ];
      } else {
        Object.assign(filter, textMatch);
      }

      const docs = await Product.find(filter)
        .sort({ price: 1 })
        .limit(limit)
        .lean();

      const currency = process.env.DEFAULT_CURRENCY || 'USD';

      const products: ProductCard[] = docs.map((p: any) => ({
        id: p._id.toString(),
        name: p.name,
        price: p.price,
        currency,
        category: p.category,
        imageUrls: (p.images || []).slice(0, 4).map((u: string) => resolveImageUrl(u)),
      }));

      extras.products = products;

      return {
        ok: true,
        count: products.length,
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          currency: p.currency,
          category: p.category,
          images: p.imageUrls,
        })),
      };
    }

    case 'getTrackingInfo': {
      if (!ctx.userId) {
        return { ok: false, error: 'Sign in to view order tracking.' };
      }
      const order = await findOrderByIdOrNumber(
        args.orderId as string | undefined,
        args.orderNumber as string | undefined
      );
      if (!order) {
        return { ok: false, error: 'Order not found.' };
      }
      const own = orderOwnership(order, ctx.userId, ctx.role);
      if (own === 'none') {
        return { ok: false, error: 'You do not have access to this order.' };
      }
      return {
        ok: true,
        orderNumber: order.orderNumber,
        orderId: order._id.toString(),
        status: order.status,
        trackingNumber: order.trackingNumber || null,
        total: order.total,
        timeline: (order.timeline || []).slice(-6),
      };
    }

    case 'updateShippingAddress': {
      if (!ctx.userId) {
        return { ok: false, error: 'Sign in to update shipping address.' };
      }
      const oid = parseObjectId(String(args.orderId || ''));
      if (!oid) {
        return { ok: false, error: 'Invalid order id.' };
      }
      const order = await Order.findById(oid);
      if (!order) {
        return { ok: false, error: 'Order not found.' };
      }
      const own = orderOwnership(order, ctx.userId, ctx.role);
      if (own !== 'buyer' && own !== 'admin') {
        return { ok: false, error: 'Only the buyer can update the shipping address.' };
      }
      if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
        return {
          ok: false,
          error: `Cannot change address when order status is "${order.status}".`,
        };
      }
      order.shippingAddress = {
        name: String(args.name),
        street: String(args.street),
        city: String(args.city),
        state: String(args.state),
        zip: String(args.zip),
        country: String(args.country),
      };
      await order.save();
      return {
        ok: true,
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        shippingAddress: order.shippingAddress,
      };
    }

    case 'cancelOrder': {
      if (!ctx.userId) {
        return { ok: false, error: 'Sign in to cancel an order.' };
      }
      const oid = parseObjectId(String(args.orderId || ''));
      if (!oid) {
        return { ok: false, error: 'Invalid order id.' };
      }
      const order = await Order.findById(oid);
      if (!order) {
        return { ok: false, error: 'Order not found.' };
      }
      const own = orderOwnership(order, ctx.userId, ctx.role);
      if (own === 'none') {
        return { ok: false, error: 'You do not have access to this order.' };
      }
      if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
        return {
          ok: false,
          error: `Cannot cancel: order is already "${order.status}".`,
        };
      }
      order.status = 'cancelled';
      order.timeline = order.timeline || [];
      order.timeline.push({
        status: 'cancelled',
        date: new Date(),
        time: new Date().toLocaleTimeString(),
      });
      await order.save();
      return { ok: true, orderId: order._id.toString(), orderNumber: order.orderNumber,
        status: order.status };
    }

    case 'initializeOrderPayment': {
      if (!ctx.userId || ctx.role === 'guest') {
        return { ok: false, error: 'Sign in as the buyer to get a payment link.' };
      }
      const oid = parseObjectId(String(args.orderId || ''));
      if (!oid) {
        return { ok: false, error: 'Invalid order id.' };
      }
      const order = await Order.findById(oid);
      if (!order) {
        return { ok: false, error: 'Order not found.' };
      }
      if (order.buyerId.toString() !== ctx.userId) {
        return { ok: false, error: 'Only the buyer can pay for this order.' };
      }
      if (order.payment?.paidAt) {
        return { ok: false, error: 'This order is already paid.' };
      }
      if (order.status === 'cancelled') {
        return { ok: false, error: 'Cannot pay for a cancelled order.' };
      }

      try {
        const init = await initializePayment(order._id.toString(), {
          _id: ctx.userId,
          email: ctx.email || '',
          phone: ctx.phone,
          fullName: ctx.fullName || ctx.email || 'Customer',
        });
        extras.payment = {
          paymentLink: init.paymentLink,
          orderId: order._id.toString(),
          amount: init.amount,
          currency: order.paymentMethod === 'RWF' ? 'RWF' : 'USD',
        };
        return {
          ok: true,
          paymentLink: init.paymentLink,
          orderId: order._id.toString(),
          amount: init.amount,
          txRef: init.txRef,
        };
      } catch (e: any) {
        return { ok: false, error: e?.message || 'Payment initialization failed.' };
      }
    }

    default:
      return { ok: false, error: `Unknown tool: ${name}` };
  }
}

function getResponseObject(result: any): any {
  return result?.response ?? result;
}

function getFunctionCallsFromResponse(response: any): { name: string; args: Record<string, unknown> }[] {
  const r = getResponseObject(response);
  if (r && typeof r.functionCalls === 'function') {
    try {
      const calls = r.functionCalls();
      if (calls && Array.isArray(calls) && calls.length) {
        return calls.map((c: any) => ({
          name: c.name,
          args: (c.args as Record<string, unknown>) || {},
        }));
      }
    } catch {
      // fall through
    }
  }
  const parts = r?.candidates?.[0]?.content?.parts;
  if (!parts) return [];
  const out: { name: string; args: Record<string, unknown> }[] = [];
  for (const p of parts) {
    if (p.functionCall) {
      out.push({
        name: p.functionCall.name,
        args: (p.functionCall.args as Record<string, unknown>) || {},
      });
    }
  }
  return out;
}

function getTextFromResponse(response: any): string {
  const r = getResponseObject(response);
  if (r && typeof r.text === 'function') {
    try {
      const t = r.text();
      if (t && String(t).trim()) return String(t).trim();
    } catch {
      // no text (function call turn)
    }
  }
  const parts = r?.candidates?.[0]?.content?.parts;
  if (!parts) return '';
  return parts
    .map((p: any) => p?.text || '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

export async function handleChat(
  userMessage: string,
  ctx: GeminiChatContext
): Promise<GeminiChatResult> {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const modelName = (
    process.env.GEMINI_AGENT_MODEL ||
    process.env.GEMINI_MODEL ||
    'gemini-1.5-pro'
  ).trim();

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    tools: [{ functionDeclarations: functionDeclarations as any }],
    toolConfig: {
      functionCallingConfig: {
        mode: FunctionCallingMode.AUTO,
      },
    },
    systemInstruction: {
      role: 'system',
      parts: [
        {
          text: [
            'You are REAGLEX AI Agent. You can call tools to search products, manage orders, and create payment links.',
            'When the user has a budget (e.g. $4), call suggestProducts with query and maxPrice.',
            'After listing products, help them choose one and direct them to checkout or cart in the app.',
            'For payment links, call initializeOrderPayment only when the user is logged in and owns the order.',
            'Never claim you changed data without a successful tool result.',
            'Be concise; include order numbers and links when tools return them.',
            `User role: ${ctx.role}.`,
          ].join('\n'),
        },
      ],
    },
  });

  const extras: ToolExtras = {};
  const chat = model.startChat({});

  let result = await chat.sendMessage(userMessage);
  let response = result.response;
  let calls = getFunctionCallsFromResponse(response);
  let iter = 0;

  while (calls.length > 0 && iter < MAX_TOOL_ITERATIONS) {
    iter += 1;
    const functionResponses = await Promise.all(
      calls.map(async (call) => ({
        functionResponse: {
          name: call.name,
          response: await executeTool(call.name, call.args, ctx, extras),
        },
      }))
    );

    result = await chat.sendMessage(functionResponses);
    response = result.response;
    calls = getFunctionCallsFromResponse(response);
  }

  const reply =
    getTextFromResponse(response) ||
    'Here is what I found. If you need more, say your budget or order number.';

  const out: GeminiChatResult = { reply };
  if (extras.products?.length) out.products = extras.products;
  if (extras.payment?.paymentLink) out.payment = extras.payment;

  return out;
}
