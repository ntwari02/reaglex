import { Request, Response } from 'express';
import { getPublicSystemFeatures } from '../services/systemFeatureSettings.service';

/** GET /api/platform/features — buyer/seller clients (no auth). */
export async function getPublicFeatures(_req: Request, res: Response) {
  try {
    const features = await getPublicSystemFeatures();
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.json({ features, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error('[system-features] public get failed', err);
    return res.status(500).json({ message: 'Failed to load feature flags' });
  }
}
