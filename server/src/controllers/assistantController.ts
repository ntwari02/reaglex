import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

type UserRole = 'guest' | 'buyer' | 'seller' | 'admin';

const AI_DOC_FILES = [
  'system-overview.md',
  'roles-permissions.md',
  'api-endpoints.md',
  'product-flow.md',
  'order-flow.md',
  'seller-flow.md',
  'admin-flow.md',
];

/** Max chars injected into Gemini system prompt (keep under model limits). */
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
  return merged.length > MAX_DOCS_CHARS ? `${merged.slice(0, MAX_DOCS_CHARS)}\n\n[Documentation truncated]` : merged;
}

function getRoleFromRequest(req: Request): UserRole {
  const authHeader = req.headers.authorization;
  const token =
    authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req as any).cookies?.token;
  if (!token) return 'guest';

  try {
    const secret = process.env.JWT_SECRET || 'dev_secret';
    const decoded = jwt.verify(token, secret) as { role?: string };
    if (decoded?.role === 'admin') return 'admin';
    if (decoded?.role === 'seller') return 'seller';
    if (decoded?.role === 'buyer') return 'buyer';
    return 'guest';
  } catch {
    return 'guest';
  }
}

function buildSystemPrompt(role: UserRole, docs: string): string {
  const header = [
    'You are an advanced AI assistant integrated into the REAGLEX ecommerce platform.',
    'Priority: follow the INTERNAL DOCUMENTATION block below when it conflicts with casual assumptions.',
    'Use a professional, clear, actionable tone.',
    'Never expose secrets, keys, tokens, environment variables, or internal private implementation details.',
    'If asked for secrets, respond exactly: "I cannot provide that information for security reasons."',
    'Only suggest actions allowed by the current role.',
    '',
    `Current authenticated role: ${role}.`,
    'Role permissions (summary):',
    '- guest: browse public products and general info only.',
    '- buyer: browse, cart, checkout, order tracking, returns, account help.',
    '- seller: manage own products, inventory, pricing, and own store orders.',
    '- admin: user management, moderation, system monitoring, analytics, admin settings.',
    '',
    'When asked to buy based on budget:',
    '- extract budget from user message.',
    '- suggest product filtering strategy and next steps using real API/UI flows from documentation.',
    '- do not invent query parameters; if unsure, say what the user should do in the UI.',
    '',
    'When seller asks to create/manage products:',
    '- provide step-by-step guided flow: name, description, category, price, stock, images.',
    '- map steps to seller inventory/collections endpoints described in documentation.',
    '',
    'When admin asks operations questions:',
    '- provide structured actions and concise risk notes; reference admin routes from documentation.',
    '',
    'INTERNAL DOCUMENTATION (Reaglex):',
    docs || '(No documentation files loaded on server — rely on role summary only.)',
  ].join('\n');
  return header;
}

export async function chatWithAssistant(req: Request, res: Response) {
  try {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return res.status(503).json({
        message: 'Assistant is not configured. Set GEMINI_API_KEY on the server.',
      });
    }

    const message = String(req.body?.message || '').trim();
    if (!message) {
      return res.status(400).json({ message: 'Message is required.' });
    }

    const role = getRoleFromRequest(req);
    const docs = loadAiDocsForPrompt();
    const model = (process.env.GEMINI_MODEL || 'gemini-1.5-flash').trim();

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const body = {
      systemInstruction: {
        parts: [{ text: buildSystemPrompt(role, docs) }],
      },
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 700,
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = data?.error?.message || 'Assistant request failed.';
      return res.status(502).json({ message: err });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join(' ').trim() ||
      'I can help with products, orders, payments, and account workflows. What would you like to do?';

    return res.json({ reply, role });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Assistant internal error.' });
  }
}

