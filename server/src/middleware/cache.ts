import NodeCache from 'node-cache';
import type { NextFunction, Request, Response } from 'express';

const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

export function cacheMiddleware(durationSeconds = 60) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Never cache authenticated/user-specific requests
    if (req.headers.authorization) return next();

    const key = `cache_${req.originalUrl}`;
    const cached = cache.get(key);
    if (cached) {
      return res.json(cached);
    }

    const originalJson = res.json.bind(res);
    res.json = ((data: any) => {
      cache.set(key, data, durationSeconds);
      return originalJson(data);
    }) as any;

    return next();
  };
}

