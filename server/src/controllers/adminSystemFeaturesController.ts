import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { assertSuperAdmin } from '../services/adminAccess.service';
import {
  applySystemFeatureUpdates,
  getSystemFeatureCatalog,
  requestDisableUnlock,
} from '../services/systemFeatureSettings.service';
import { DISABLE_ACKNOWLEDGMENT } from '../constants/systemFeatureRegistry';

async function requireSuper(req: AuthenticatedRequest, res: Response): Promise<boolean> {
  if (!req.user?.id) {
    res.status(401).json({ message: 'Authentication required' });
    return false;
  }
  const ok = await assertSuperAdmin(req.user.id);
  if (!ok) {
    res.status(403).json({
      message: 'Super admin access required for system feature controls.',
      code: 'SUPER_ADMIN_REQUIRED',
    });
    return false;
  }
  return true;
}

/** GET /api/admin/system-features */
export async function getAdminSystemFeatures(req: AuthenticatedRequest, res: Response) {
  if (!(await requireSuper(req, res))) return;
  try {
    const catalog = await getSystemFeatureCatalog();
    return res.json({
      ...catalog,
      disableAcknowledgment: DISABLE_ACKNOWLEDGMENT,
      confirmPhraseRequired: 'DISABLE',
    });
  } catch (err: any) {
    console.error('[system-features] get failed', err);
    return res.status(500).json({ message: err?.message || 'Failed to load system features' });
  }
}

/** POST /api/admin/system-features/unlock */
export async function postSystemFeaturesUnlock(req: AuthenticatedRequest, res: Response) {
  if (!(await requireSuper(req, res))) return;
  try {
    const result = await requestDisableUnlock({
      actorUserId: String(req.user!.id),
      superAdminPassword: req.body?.superAdminPassword,
      acknowledgment: req.body?.acknowledgment,
      confirmPhrase: req.body?.confirmPhrase,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ message: err?.message || 'Unlock failed' });
  }
}

/** PATCH /api/admin/system-features */
export async function patchAdminSystemFeatures(req: AuthenticatedRequest, res: Response) {
  if (!(await requireSuper(req, res))) return;
  try {
    const updates = Array.isArray(req.body?.updates) ? req.body.updates : [];
    const result = await applySystemFeatureUpdates({
      updates,
      actorUserId: String(req.user!.id),
      actorEmail: req.user?.email,
      unlockToken: req.body?.unlockToken,
      superAdminPassword: req.body?.superAdminPassword,
      acknowledgment: req.body?.acknowledgment,
      confirmPhrase: req.body?.confirmPhrase,
    });
    return res.json({ success: true, ...result });
  } catch (err: any) {
    const msg = err?.message || 'Update failed';
    const status = msg.includes('password') || msg.includes('DISABLE') || msg.includes('accept') ? 400 : 500;
    return res.status(status).json({ message: msg });
  }
}
