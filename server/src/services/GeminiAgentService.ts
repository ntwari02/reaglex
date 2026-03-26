/**
 * Unified Gemini Agent Service
 *
 * Role-aware tool execution:
 * - Every tool checks the authenticated user's role (server-side)
 * - Every order mutation additionally checks ownership (buyerId)
 */
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI, FunctionCallingMode, SchemaType } from '@google/generative-ai';
import mongoose from 'mongoose';
import { getServerUrl } from '../config/publicEnv';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Dispute } from '../models/Dispute';

type AgentRole = 'guest' | 'buyer' | 'seller' | 'admin';

export interface AgentContext {
  userId: string | null;
  role: AgentRole;
  email?: string;
  fullName?: string;
  currentPath?: string;
}

export interface ProductCard {
  id: string;
  name: string;
  price: number;
  currency: string;
  category?: string;
  imageUrls: string[];
}

export interface AgentChatResult {
  reply: string;
  products?: ProductCard[];
  // Optional structured action summary (for UI)
  actionResult?: {
    type: 'order' | 'shipping' | 'store' | 'product' | 'return';
    message: string;
  };
}

const AI_DOC_FILES = [
  'system-overview.md',
  'roles-permissions.md',
  'api-endpoints.md',
  'product-flow.md',
  'order-flow.md',
  'seller-flow.md',
  'admin-flow.md',
];

const MAX_DOCS_CHARS = 28000;

function resolveAiDocsDir(): string | null {
  const candidates = [
    process.env.AI_DOCS_PATH?.trim(),
    path.join(process.cwd(), 'ai-docs'),
    path.join(process.cwd(), '..', 'ai-docs'),
    path.join(__dirname, '..', '..', '..', 'ai-docs'),
    path.join(__dirname, '..', '..', 'ai-docs'),
  ].filter(Boolean) as string[];

  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir;
    } catch {
      // ignore
    }
  }
  return null;
}

function loadAiDocsForPrompt(): string {
  const dir = resolveAiDocsDir();
  if (!dir) return '';

  const chunks: string[] = [];
  for (const file of AI_DOC_FILES) {
    const fp = path.join(dir, file);
    try {
      if (!fs.existsSync(fp)) continue;
      const text = fs.readFileSync(fp, 'utf8');
      chunks.push(`\n### ${file}\n${text}`);
    } catch {
      // skip unreadable
    }
  }

  const merged = chunks.join('\n').trim();
  if (!merged) return '';
  return merged.length > MAX_DOCS_CHARS
    ? `${merged.slice(0, MAX_DOCS_CHARS)}\n\n[Documentation truncated]`
    : merged;
}

function baseUrl(): string {
  return getServerUrl();
}

function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${baseUrl()}${url.startsWith('/') ? '' : '/'}${url}`;
}

function parseObjectId(id: string): mongoose.Types.ObjectId | null {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

async function findOrderByIdOrNumber(orderId?: string, orderNumber?: string): Promise<any | null> {
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

function assertRole(currentRole: AgentRole, allowed: AgentRole[], toolName: string) {
  if (!allowed.includes(currentRole)) {
    // Requirement: MUST throw with this message for unauthorized tool execution.
    throw new Error(`Unauthorized action for your role. (${toolName})`);
  }
}

function extractOwnOrder(order: any, userId: string | null): boolean {
  if (!userId) return false;
  return String(order?.buyerId) === userId;
}

// --- Tool declarations (Gemini function calling) ---
const functionDeclarations = [
  {
    name: 'getStoreData',
    description: 'Admin-only sales analytics summary for the platform (revenue/orders).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        timeRangeDays: {
          type: SchemaType.NUMBER,
          description: 'How many days back to compute analytics (default ~30).',
        },
      },
    },
  },
  {
    name: 'manageShipping',
    description:
      'Admin/Manager-only update: set order status and trackingNumber for an order.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        orderId: { type: SchemaType.STRING, description: 'Order Mongo ObjectId (optional).' },
        orderNumber: { type: SchemaType.STRING, description: 'Order number (optional).' },
        status: {
          type: SchemaType.STRING,
          description: 'New order status: shipped | delivered | cancelled | packed | processing | pending.',
        },
        trackingNumber: { type: SchemaType.STRING, description: 'Carrier tracking number.' },
      },
      required: ['status'],
    },
  },
  {
    name: 'myOrderActions',
    description:
      'Customer (buyer) only: update shipping address for your order OR request a return (creates a buyer dispute of type "return").',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        orderId: { type: SchemaType.STRING, description: 'Order Mongo ObjectId (optional).' },
        orderNumber: { type: SchemaType.STRING, description: 'Order number (optional).' },
        action: {
          type: SchemaType.STRING,
          description: 'updateShippingAddress | requestReturn',
        },
        shippingAddress: {
          type: SchemaType.OBJECT,
          description: 'Used only when action is updateShippingAddress',
          properties: {
            name: { type: SchemaType.STRING },
            street: { type: SchemaType.STRING },
            city: { type: SchemaType.STRING },
            state: { type: SchemaType.STRING },
            zip: { type: SchemaType.STRING },
            country: { type: SchemaType.STRING },
          },
          required: ['name', 'street', 'city', 'state', 'zip', 'country'],
        },
        returnDetails: {
          type: SchemaType.OBJECT,
          description: 'Used only when action is requestReturn',
          properties: {
            reason: { type: SchemaType.STRING, description: 'Return reason (required).' },
            description: { type: SchemaType.STRING, description: 'Detailed description (required).' },
            priority: { type: SchemaType.STRING, description: 'low | medium | high | urgent (optional).' },
          },
          required: ['reason', 'description'],
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'productInquiry',
    description: 'Search products and return product cards with images, names, and prices.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: 'Search text, e.g. watch' },
        category: { type: SchemaType.STRING, description: 'Optional category filter' },
        maxPrice: { type: SchemaType.NUMBER, description: 'Optional maximum price filter' },
        limit: { type: SchemaType.NUMBER, description: 'Max products to return' },
      },
      required: ['query'],
    },
  },
];

const MAX_TOOL_ITERATIONS = 6;

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
      // ignore
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
      // ignore
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

async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: AgentContext,
  extras: { products?: ProductCard[] }
): Promise<Record<string, unknown>> {
  try {
    switch (toolName) {
      case 'productInquiry': {
        const query = String(args.query || '').trim();
        if (!query) return { ok: false, error: 'Missing query' };

        const categoryRaw = args.category ? String(args.category).trim() : '';
        const maxPrice =
          typeof args.maxPrice === 'number' && !Number.isNaN(args.maxPrice) ? args.maxPrice : undefined;
        const limit =
          typeof args.limit === 'number' && !Number.isNaN(args.limit)
            ? Math.max(1, Math.min(15, Math.floor(args.limit)))
            : 8;

        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const filter: Record<string, any> = {
          status: { $in: ['in_stock', 'low_stock'] },
          $or: [{ name: regex }, { description: regex }, { category: regex }, { tags: regex }],
        };
        if (categoryRaw) {
          filter.category = new RegExp(
            categoryRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            'i'
          );
        }
        if (maxPrice !== undefined) filter.price = { $lte: maxPrice };

        const docs = await Product.find(filter).sort({ price: 1 }).limit(limit).lean();
        const currency = String(process.env.DEFAULT_CURRENCY || 'USD');
        const products: ProductCard[] = (docs || []).map((p: any) => ({
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
          products: products.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            currency: p.currency,
            category: p.category,
            imageUrls: p.imageUrls,
          })),
        };
      }

      case 'getStoreData': {
        assertRole(ctx.role, ['admin'], 'getStoreData');

        const days =
          typeof args.timeRangeDays === 'number' && !Number.isNaN(args.timeRangeDays)
            ? Math.max(1, Math.min(365, Math.floor(args.timeRangeDays)))
            : 30;
        const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const agg = await Order.aggregate([
          { $match: { date: { $gte: start } } },
          { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
        ]);

        const revenue = Number(agg?.[0]?.revenue || 0);
        const orders = Number(agg?.[0]?.orders || 0);
        const avgOrderValue = orders > 0 ? revenue / orders : 0;

        return {
          ok: true,
          timeRangeDays: days,
          revenue,
          orders,
          avgOrderValue,
        };
      }

      case 'manageShipping': {
        assertRole(ctx.role, ['admin'], 'manageShipping');

        const orderId = args.orderId ? String(args.orderId) : undefined;
        const orderNumber = args.orderNumber ? String(args.orderNumber) : undefined;
        const status = args.status ? String(args.status) : '';
        const trackingNumber = args.trackingNumber !== undefined ? String(args.trackingNumber) : '';

        const allowedStatuses = ['pending', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'];
        if (!allowedStatuses.includes(status)) {
          return { ok: false, error: 'Invalid status' };
        }
        const order = await findOrderByIdOrNumber(orderId, orderNumber);
        if (!order) return { ok: false, error: 'Order not found' };

        const now = new Date();
        const update: any = {
          status,
        };
        if (trackingNumber) update.trackingNumber = trackingNumber;

        const entry = {
          status: status,
          date: now,
          time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        };
        update.timeline = [...(order.timeline || []), entry];

        await Order.findByIdAndUpdate(order._id, { $set: update }, { new: true });

        return {
          ok: true,
          orderId: String(order._id),
          orderNumber: order.orderNumber,
          status,
          trackingNumber: trackingNumber || order.trackingNumber || null,
        };
      }

      case 'myOrderActions': {
        assertRole(ctx.role, ['buyer'], 'myOrderActions');
        if (!ctx.userId) return { ok: false, error: 'Sign in required' };

        const orderId = args.orderId ? String(args.orderId) : undefined;
        const orderNumber = args.orderNumber ? String(args.orderNumber) : undefined;
        const action = args.action ? String(args.action) : '';
        if (!action) return { ok: false, error: 'Missing action' };

        const order = await findOrderByIdOrNumber(orderId, orderNumber);
        if (!order) return { ok: false, error: 'Order not found' };
        if (!extractOwnOrder(order, ctx.userId)) {
          return { ok: false, error: 'Access denied for this order' };
        }

        if (action === 'updateShippingAddress') {
          if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
            return { ok: false, error: `Cannot change address when order is ${order.status}` };
          }

          const addr = (args.shippingAddress || {}) as Record<string, unknown>;
          const required = ['name', 'street', 'city', 'state', 'zip', 'country'];
          for (const k of required) {
            if (!addr[k] || !String(addr[k]).trim()) {
              return { ok: false, error: `Missing shippingAddress.${k}` };
            }
          }

          order.shippingAddress = {
            name: String(addr.name),
            street: String(addr.street),
            city: String(addr.city),
            state: String(addr.state),
            zip: String(addr.zip),
            country: String(addr.country),
          };
          await order.save();

          return {
            ok: true,
            action,
            orderId: String(order._id),
            orderNumber: order.orderNumber,
            shippingAddress: order.shippingAddress,
          };
        }

        if (action === 'requestReturn') {
          const rd = (args.returnDetails || {}) as Record<string, unknown>;
          const reason = rd.reason ? String(rd.reason) : '';
          const description = rd.description ? String(rd.description) : '';
          const priority = rd.priority ? String(rd.priority) : 'medium';
          if (!reason || !description) {
            return { ok: false, error: 'Missing returnDetails.reason or returnDetails.description' };
          }

          const validTypes = ['low', 'medium', 'high', 'urgent'];
          const finalPriority = validTypes.includes(priority) ? priority : 'medium';

          // Check existing active dispute
          const buyerId = new mongoose.Types.ObjectId(ctx.userId);
          const existing = await Dispute.findOne({
            orderId: order._id,
            buyerId,
            status: { $in: ['new', 'under_review', 'seller_response', 'buyer_response'] },
          }).lean();
          if (existing) {
            return { ok: true, action, disputeAlreadyExists: true, disputeNumber: existing.disputeNumber };
          }

          const disputeCount = await Dispute.countDocuments();
          const disputeNumber = `DSP-${Date.now()}-${String(disputeCount + 1).padStart(6, '0')}`;

          const responseDeadline = new Date();
          responseDeadline.setDate(responseDeadline.getDate() + 7);

          const dispute = await Dispute.create({
            disputeNumber,
            orderId: order._id,
            sellerId: order.sellerId,
            buyerId,
            type: 'return',
            reason,
            description,
            priority: finalPriority,
            status: 'new',
            evidence: [],
            responseDeadline,
          });

          return {
            ok: true,
            action,
            disputeNumber: dispute.disputeNumber,
            status: dispute.status,
          };
        }

        return { ok: false, error: 'Invalid action' };
      }

      default:
        return { ok: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Tool execution failed' };
  }
}

function buildSystemPrompt(ctx: AgentContext, docs: string): string {
  const safePath = ctx.currentPath ? String(ctx.currentPath) : '/';
  const role = ctx.role;
  return [
    'You are the official REAGLEX Unified Assistant.',
    'You are a helpful assistant that can call ONLY server-side tools when needed.',
    'State:',
    `- role: ${role}`,
    `- currentPath: ${safePath}`,
    '',
    'Strict rules:',
    '- Do not request passwords or secrets.',
    '- Never mention API keys, JWT contents, or environment variables.',
    '- If a tool returns an authorization error, explain to the user that they do not have permission.',
    '- For product search, show product cards with images from tool results when available.',
    '',
    'INTERNAL DOCUMENTATION (source of truth):',
    docs || '(No documentation loaded on server.)',
  ].join('\n');
}

export async function handleAgentChat(
  userMessage: string,
  ctx: AgentContext
): Promise<AgentChatResult> {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const modelName = (
    process.env.GEMINI_AGENT_MODEL ||
    process.env.GEMINI_MODEL ||
    'gemini-1.5-pro'
  ).trim();

  const docs = loadAiDocsForPrompt();

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    tools: [{ functionDeclarations: functionDeclarations as any }],
    toolConfig: {
      functionCallingConfig: { mode: FunctionCallingMode.AUTO },
    },
    systemInstruction: {
      role: 'system',
      parts: [{ text: buildSystemPrompt(ctx, docs) }],
    },
  });

  const extras: { products?: ProductCard[] } = {};
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
    'I can help with products, order tracking, and role-safe support actions. Tell me what you need.';

  return {
    reply,
    products: extras.products?.length ? extras.products : undefined,
  };
}

