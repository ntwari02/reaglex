import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import {
  assertSuperAdmin,
  canAccessAdminApiPath,
  getAdminAccessForUserId,
} from '../services/adminAccess.service';

/** Attach adminAccess DTO to request for admin users. */
export async function attachAdminAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.user || req.user.role !== 'admin') {
    return next();
  }
  try {
    const access = await getAdminAccessForUserId(req.user.id);
    (req as AuthenticatedRequest & { adminAccess?: typeof access }).adminAccess = access;
    return next();
  } catch (err) {
    console.error('[adminAccess] attach failed', err);
    return res.status(500).json({ message: 'Failed to resolve admin permissions' });
  }
}

/** Enforce scoped admin API access by URL prefix. */
export async function enforceAdminApiScope(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.user || req.user.role !== 'admin') {
    return next();
  }
  try {
    const path = req.originalUrl.split('?')[0];
    const ok = await canAccessAdminApiPath(req.user.id, req.method, path);
    if (!ok) {
      return res.status(403).json({
        message: 'You do not have permission to access this admin area.',
        code: 'ADMIN_SCOPE_DENIED',
      });
    }
    return next();
  } catch (err) {
    console.error('[adminAccess] enforce failed', err);
    return res.status(500).json({ message: 'Permission check failed' });
  }
}

/** Super-admin only (team management, granting admin role). */
export async function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  const ok = await assertSuperAdmin(req.user.id);
  if (!ok) {
    return res.status(403).json({
      message: 'Super admin access required.',
      code: 'SUPER_ADMIN_REQUIRED',
    });
  }
  return next();
}
