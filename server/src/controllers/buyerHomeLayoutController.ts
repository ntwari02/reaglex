import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { assertSuperAdmin } from '../services/adminAccess.service';
import { verifySuperAdminPassword } from '../services/systemFeatureSettings.service';
import {
  getAdminHomeLayoutPayload,
  getPublicHomeLayoutPayload,
  publishHomeLayoutDraft,
  resetHomeLayoutToDefaults,
  saveHomeLayoutDraft,
} from '../services/buyerHomeLayout.service';
import type { HomeLayoutSectionId, HomeSectionLayoutEntry } from '../constants/buyerHomeLayoutDefaults';

const PUBLISH_ACK =
  'I understand that publishing homepage layout changes will immediately affect what all buyers see on the live store.';

async function requireSuper(req: AuthenticatedRequest, res: Response): Promise<boolean> {
  if (!req.user?.id) {
    res.status(401).json({ message: 'Authentication required' });
    return false;
  }
  if (!(await assertSuperAdmin(req.user.id))) {
    res.status(403).json({ message: 'Super admin required', code: 'SUPER_ADMIN_REQUIRED' });
    return false;
  }
  return true;
}

/** GET /api/public/home-product-layout — live published layout only */
export async function getPublicHomeLayout(_req: Request, res: Response) {
  try {
    const payload = await getPublicHomeLayoutPayload();
    res.setHeader('Cache-Control', 'public, max-age=120');
    return res.json(payload);
  } catch (err: unknown) {
    console.error('[home-layout] public get failed', err);
    return res.status(500).json({ message: 'Failed to load home layout' });
  }
}

/** GET /api/admin/system-features/home-layout */
export async function getAdminHomeLayout(req: AuthenticatedRequest, res: Response) {
  if (!(await requireSuper(req, res))) return;
  try {
    return res.json(await getAdminHomeLayoutPayload());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load layout settings';
    return res.status(500).json({ message });
  }
}

/** PUT /api/admin/system-features/home-layout/draft */
export async function putAdminHomeLayoutDraft(req: AuthenticatedRequest, res: Response) {
  if (!(await requireSuper(req, res))) return;
  try {
    const sections = req.body?.sections as Partial<
      Record<HomeLayoutSectionId, Partial<HomeSectionLayoutEntry>>
    >;
    if (!sections || typeof sections !== 'object') {
      return res.status(400).json({ message: 'sections object required' });
    }
    const payload = await saveHomeLayoutDraft(sections);
    return res.json({ ok: true, ...payload });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save draft';
    return res.status(400).json({ message });
  }
}

/** POST /api/admin/system-features/home-layout/publish */
export async function postAdminHomeLayoutPublish(req: AuthenticatedRequest, res: Response) {
  if (!(await requireSuper(req, res))) return;
  try {
    const ack = String(req.body?.acknowledgment || '').trim();
    if (ack !== PUBLISH_ACK) {
      return res.status(400).json({ message: 'Accept the publish responsibility statement' });
    }
    if (String(req.body?.confirmPhrase || '').trim().toUpperCase() !== 'PUBLISH') {
      return res.status(400).json({ message: 'Type PUBLISH to confirm' });
    }
    const ok = await verifySuperAdminPassword(req.user!.id, req.body?.superAdminPassword);
    if (!ok) {
      return res.status(403).json({ message: 'Incorrect super admin password' });
    }
    const payload = await publishHomeLayoutDraft();
    return res.json({ ok: true, publishAcknowledgment: PUBLISH_ACK, ...payload });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Publish failed';
    return res.status(400).json({ message });
  }
}

/** POST /api/admin/system-features/home-layout/reset */
export async function postAdminHomeLayoutReset(req: AuthenticatedRequest, res: Response) {
  if (!(await requireSuper(req, res))) return;
  try {
    const payload = await resetHomeLayoutToDefaults();
    return res.json({ ok: true, ...payload });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Reset failed';
    return res.status(500).json({ message });
  }
}
