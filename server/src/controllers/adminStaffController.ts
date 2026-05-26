import bcrypt from 'bcryptjs';
import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { AdminStaffAudit } from '../models/AdminStaffAudit';
import {
  ADMIN_SCOPES,
  ADMIN_STAFF_PRESETS,
  type AdminScope,
  type AdminStaffPreset,
} from '../constants/adminScopes';
import {
  assertSuperAdmin,
  buildAdminAccessFromPreset,
  formatUserWithAdminAccess,
  getAdminAccessForUserId,
  logAdminStaffAction,
  resolveAdminAccess,
} from '../services/adminAccess.service';

const createStaffSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(12).max(128),
  preset: z.enum(Object.keys(ADMIN_STAFF_PRESETS) as [AdminStaffPreset, ...AdminStaffPreset[]]),
  scopes: z.array(z.enum(ADMIN_SCOPES as unknown as [AdminScope, ...AdminScope[]])).optional(),
  phone: z.string().max(32).optional(),
});

const updateStaffSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  preset: z
    .enum(Object.keys(ADMIN_STAFF_PRESETS) as [AdminStaffPreset, ...AdminStaffPreset[]])
    .optional(),
  scopes: z.array(z.enum(ADMIN_SCOPES as unknown as [AdminScope, ...AdminScope[]])).optional(),
  accountStatus: z.enum(['active', 'inactive', 'banned']).optional(),
  password: z.string().min(12).max(128).optional(),
});

function clientIp(req: AuthenticatedRequest): string {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string') return xf.split(',')[0]?.trim() || '';
  return req.ip || '';
}

export async function getAdminStaffPresets(_req: AuthenticatedRequest, res: Response) {
  const presets = Object.entries(ADMIN_STAFF_PRESETS).map(([id, p]) => ({
    id,
    ...p,
    scopes: p.tier === 'super' ? [...ADMIN_SCOPES] : p.scopes,
  }));
  res.json({ presets, allScopes: ADMIN_SCOPES });
}

export async function getMyAdminAccess(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  const access = await getAdminAccessForUserId(req.user.id);
  if (!access) return res.status(403).json({ message: 'Not an admin account' });
  res.json({ adminAccess: access });
}

export async function listAdminStaff(req: AuthenticatedRequest, res: Response) {
  const staff = await User.find({ role: 'admin' })
    .select('fullName email phone accountStatus adminAccess security.twoFactorEnabled createdAt updatedAt')
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    staff: staff.map((u) => formatUserWithAdminAccess(u as any)),
  });
}

export async function createAdminStaff(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const body = createStaffSchema.parse(req.body);

    if (body.preset === 'super_admin') {
      const superCount = await User.countDocuments({
        role: 'admin',
        $or: [{ 'adminAccess.tier': 'super' }, { adminAccess: { $exists: false } }],
      });
      const envSuper = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
      const actor = await User.findById(req.user.id).select('email').lean();
      const actorEmail = actor?.email?.toLowerCase() || '';
      if (superCount > 0 && envSuper && actorEmail !== envSuper) {
        return res.status(403).json({
          message: 'Only the primary super admin can create another super admin.',
        });
      }
    }

    const existing = await User.findOne({ email: body.email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const adminAccess = buildAdminAccessFromPreset(body.preset, body.scopes);
    adminAccess.createdBy = req.user.id as any;
    adminAccess.lastScopeChangeAt = new Date();

    const user = await User.create({
      fullName: body.fullName.trim(),
      email: body.email.toLowerCase().trim(),
      phone: body.phone?.trim(),
      passwordHash: await bcrypt.hash(body.password, 12),
      role: 'admin',
      accountStatus: 'active',
      emailVerified: true,
      adminAccess,
      security: {
        twoFactorEnabled: true,
        twoFactorMethod: null,
        lastPasswordChangeAt: new Date(),
      },
    });

    await logAdminStaffAction({
      actorId: req.user.id,
      actorEmail: req.user.email || '',
      action: 'STAFF_CREATED',
      targetUserId: user._id.toString(),
      targetEmail: user.email,
      detail: { preset: body.preset, scopes: adminAccess.scopes },
      req: { ip: clientIp(req), headers: req.headers as Record<string, unknown> },
    });

    res.status(201).json({
      message: 'Admin staff account created. They must enable 2FA on first login.',
      user: formatUserWithAdminAccess(user),
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: err.flatten() });
    }
    console.error('[adminStaff] create', err);
    res.status(500).json({ message: 'Failed to create admin staff' });
  }
}

export async function updateAdminStaff(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const { staffId } = req.params;
    const body = updateStaffSchema.parse(req.body);

    const user = await User.findById(staffId);
    if (!user || user.role !== 'admin') {
      return res.status(404).json({ message: 'Admin staff not found' });
    }

    const targetAccess = resolveAdminAccess(user);
    if (targetAccess?.isSuperAdmin && req.user.id !== user._id.toString()) {
      const actorIsSuper = await assertSuperAdmin(req.user.id);
      const envSuper = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
      const actor = await User.findById(req.user.id).select('email').lean();
      if (!actorIsSuper || (envSuper && actor?.email?.toLowerCase() !== envSuper)) {
        return res.status(403).json({ message: 'Cannot modify another super admin account' });
      }
    }

    if (body.preset === 'super_admin' && !targetAccess?.isSuperAdmin) {
      return res.status(403).json({
        message: 'Promoting to super admin requires primary super admin approval.',
      });
    }

    if (body.fullName) user.fullName = body.fullName.trim();
    if (body.accountStatus) user.accountStatus = body.accountStatus as any;
    if (body.password) {
      user.passwordHash = await bcrypt.hash(body.password, 12);
      user.security = user.security || ({} as any);
      user.security.lastPasswordChangeAt = new Date();
    }

    if (body.preset) {
      const next = buildAdminAccessFromPreset(body.preset, body.scopes);
      next.createdBy = user.adminAccess?.createdBy || (req.user.id as any);
      user.adminAccess = next;
    } else if (body.scopes && user.adminAccess?.tier === 'scoped') {
      user.adminAccess.scopes = body.scopes;
      user.adminAccess.lastScopeChangeAt = new Date();
    }

    await user.save();

    await logAdminStaffAction({
      actorId: req.user.id,
      actorEmail: req.user.email || '',
      action: 'STAFF_UPDATED',
      targetUserId: user._id.toString(),
      targetEmail: user.email,
      detail: body,
      req: { ip: clientIp(req), headers: req.headers as Record<string, unknown> },
    });

    res.json({ message: 'Admin staff updated', user: formatUserWithAdminAccess(user) });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: err.flatten() });
    }
    console.error('[adminStaff] update', err);
    res.status(500).json({ message: 'Failed to update admin staff' });
  }
}

export async function deactivateAdminStaff(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const { staffId } = req.params;
    if (staffId === req.user.id) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    const user = await User.findById(staffId);
    if (!user || user.role !== 'admin') {
      return res.status(404).json({ message: 'Admin staff not found' });
    }

    const targetAccess = resolveAdminAccess(user);
    if (targetAccess?.isSuperAdmin) {
      return res.status(403).json({ message: 'Cannot deactivate a super admin' });
    }

    user.accountStatus = 'inactive';
    await user.save();

    await logAdminStaffAction({
      actorId: req.user.id,
      actorEmail: req.user.email || '',
      action: 'STAFF_DEACTIVATED',
      targetUserId: user._id.toString(),
      targetEmail: user.email,
      req: { ip: clientIp(req), headers: req.headers as Record<string, unknown> },
    });

    res.json({ message: 'Admin staff deactivated' });
  } catch (err) {
    console.error('[adminStaff] deactivate', err);
    res.status(500).json({ message: 'Failed to deactivate admin staff' });
  }
}

export async function listAdminStaffAudit(req: AuthenticatedRequest, res: Response) {
  const limit = Math.min(100, Number(req.query.limit) || 50);
  const rows = await AdminStaffAudit.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  res.json({ audit: rows });
}
