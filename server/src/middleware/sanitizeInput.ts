import type { NextFunction, Request, Response } from 'express';

const FORBIDDEN_SQL_PATTERN =
  /(;--|\/\*|\*\/|\bunion\b\s+\bselect\b|\bor\b\s+1=1|\band\b\s+1=1|\bxp_)/i;

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      // Block Mongo/NoSQL operator style keys ($gt, profile.name, etc.)
      if (key.startsWith('$') || key.includes('.')) {
        throw new Error(`Disallowed key: ${key}`);
      }
      out[key] = sanitizeValue(raw);
    }
    return out;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/\u0000/g, '');
    if (FORBIDDEN_SQL_PATTERN.test(normalized)) {
      throw new Error('Suspicious input pattern');
    }
    return normalized;
  }

  return value;
}

export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  try {
    // Body is safe to normalize and reassign after JSON parsing.
    if (req.body) {
      req.body = sanitizeValue(req.body) as Request['body'];
    }

    // For query/params, validate recursively but avoid direct reassignment:
    // some Express internals expose these as special objects/getters.
    if (req.query) {
      sanitizeValue(req.query);
    }
    if (req.params) {
      sanitizeValue(req.params);
    }
    next();
  } catch {
    res.status(400).json({ message: 'Invalid input payload.' });
  }
}
