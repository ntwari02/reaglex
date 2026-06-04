import mongoose from 'mongoose';
import {
  ADMIN_SCOPES,
  ADMIN_API_SCOPE_RULES,
  ADMIN_STAFF_PRESETS,
  type AdminScope,
  type AdminStaffPreset,
  type AdminStaffTier,
} from '../constants/adminScopes';
import { User, type IAdminAccess, type IUser } from '../models/User';
import { AdminStaffAudit } from '../models/AdminStaffAudit';
import type { IntelligenceEntityType } from '../search/intelligenceSearch.types';

/** Admin API prefixes that require an explicit scope match (scoped staff). */
export const ADMIN_PROTECTED_API_PREFIXES = [
  '/api/admin',
  '/api/payments/admin',
  '/api/system',
  '/api/security-analysis',
  '/api/live-commerce/admin',
  '/api/affiliate/admin',
  '/api/recommendation-emails',
  '/api/verification/suspicious',
  '/api/verification/seller-trust/adjust',
] as const;

const INTELLIGENCE_ENTITY_SCOPES: Record<IntelligenceEntityType, AdminScope | AdminScope[]> = {
  user: 'users',
  seller: 'sellers',
  order: 'orders',
  payment: 'finance',
  product: 'products',
  vehicle: 'logistics',
  support: 'support',
  dispute: ['support', 'returns'],
  subscription: 'subscriptions',
};

export function isAdminProtectedApiPath(path: string): boolean {
  const p = path.split('?')[0];
  return ADMIN_PROTECTED_API_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

export interface AdminAccessDto {
  tier: AdminStaffTier;
  isSuperAdmin: boolean;
  scopes: AdminScope[];
  preset?: string;
  label: string;
  require2FA: boolean;
}

function normalizeScopes(scopes: unknown): AdminScope[] {
  if (!Array.isArray(scopes)) return [];
  const allowed = new Set(ADMIN_SCOPES);
  return scopes.map((s) => String(s).trim()).filter((s): s is AdminScope => allowed.has(s as AdminScope));
}

/** Legacy admins without adminAccess become super on read. */
export function resolveAdminAccess(user: Pick<IUser, 'role' | 'adminAccess'>): AdminAccessDto | null {
  if (user.role !== 'admin') return null;
  const raw = user.adminAccess;
  if (!raw || !raw.tier) {
    return {
      tier: 'super',
      isSuperAdmin: true,
      scopes: [...ADMIN_SCOPES],
      preset: 'super_admin',
      label: 'Super Admin',
      require2FA: true,
    };
  }
  if (raw.tier === 'super') {
    return {
      tier: 'super',
      isSuperAdmin: true,
      scopes: [...ADMIN_SCOPES],
      preset: raw.preset || 'super_admin',
      label: raw.label || 'Super Admin',
      require2FA: raw.require2FA !== false,
    };
  }
  const scopes = normalizeScopes(raw.scopes);
  return {
    tier: 'scoped',
    isSuperAdmin: false,
    scopes,
    preset: raw.preset,
    label: raw.label || raw.preset || 'Admin staff',
    require2FA: raw.require2FA !== false,
  };
}

export async function getAdminAccessForUserId(userId: string): Promise<AdminAccessDto | null> {
  const user = await User.findById(userId).select('role adminAccess').lean();
  if (!user || user.role !== 'admin') return null;
  return resolveAdminAccess(user as IUser);
}

export function adminHasScope(access: AdminAccessDto | null, scope: AdminScope): boolean {
  if (!access) return false;
  if (access.isSuperAdmin) return true;
  return access.scopes.includes(scope);
}

export function resolveScopesForApiPath(path: string): AdminScope[] | null {
  const p = path.split('?')[0];
  for (const rule of ADMIN_API_SCOPE_RULES) {
    if (p === rule.prefix || p.startsWith(`${rule.prefix}/`)) {
      return rule.scopes;
    }
  }
  return null;
}

/** Staff management mutations require super admin. */
export function isStaffManagementPath(path: string): boolean {
  const p = path.split('?')[0];
  return (
    p.startsWith('/api/admin/staff') &&
    !p.endsWith('/presets') &&
    !p.endsWith('/me') &&
    p !== '/api/admin/staff/me'
  );
}

export async function canAccessAdminApiPath(userId: string, method: string, path: string): Promise<boolean> {
  const access = await getAdminAccessForUserId(userId);
  if (!access) return false;
  if (access.isSuperAdmin) return true;

  const p = path.split('?')[0];

  if (p === '/api/admin/staff/me' || p === '/api/admin/staff/presets') {
    return true;
  }
  if (p.startsWith('/api/admin/intelligence/settings')) {
    return false;
  }
  if (p.startsWith('/api/admin/system-features')) {
    return false;
  }
  if (p.includes('/home-product-layout')) {
    return false;
  }
  if (p.startsWith('/api/admin/staff')) {
    return false;
  }

  const required = resolveScopesForApiPath(p);
  if (!required || required.length === 0) {
    return !isAdminProtectedApiPath(p);
  }
  return required.some((scope) => access.scopes.includes(scope));
}

export function canAccessIntelligenceEntity(
  access: AdminAccessDto | null,
  entityType: IntelligenceEntityType,
): boolean {
  if (!access) return false;
  if (access.isSuperAdmin) return true;
  const required = INTELLIGENCE_ENTITY_SCOPES[entityType];
  const scopes = Array.isArray(required) ? required : [required];
  return scopes.some((scope) => access.scopes.includes(scope));
}

export function filterIntelligenceHitsByAccess<T extends { entityType: IntelligenceEntityType }>(
  access: AdminAccessDto | null,
  hits: T[],
): T[] {
  if (!access) return [];
  if (access.isSuperAdmin) return hits;
  return hits.filter((h) => canAccessIntelligenceEntity(access, h.entityType));
}

export async function assertSuperAdmin(userId: string): Promise<boolean> {
  const access = await getAdminAccessForUserId(userId);
  return Boolean(access?.isSuperAdmin);
}

export function buildAdminAccessFromPreset(
  preset: AdminStaffPreset,
  customScopes?: AdminScope[],
): IAdminAccess {
  const def = ADMIN_STAFF_PRESETS[preset];
  if (!def) {
    throw new Error('Invalid admin preset');
  }
  return {
    tier: def.tier,
    scopes: def.tier === 'super' ? [] : customScopes?.length ? customScopes : def.scopes,
    preset,
    label: def.label,
    require2FA: true,
    lastScopeChangeAt: new Date(),
  };
}

export async function logAdminStaffAction(params: {
  actorId: string;
  actorEmail: string;
  action: string;
  targetUserId?: string;
  targetEmail?: string;
  detail?: Record<string, unknown>;
  req?: { ip?: string; headers?: Record<string, unknown> };
}) {
  try {
    await AdminStaffAudit.create({
      actorId: new mongoose.Types.ObjectId(params.actorId),
      actorEmail: params.actorEmail,
      action: params.action,
      targetUserId: params.targetUserId
        ? new mongoose.Types.ObjectId(params.targetUserId)
        : undefined,
      targetEmail: params.targetEmail,
      detail: params.detail,
      ip: params.ip,
      userAgent: String(params.req?.headers?.['user-agent'] || ''),
    });
  } catch (err) {
    console.warn('[adminStaff] audit log failed', err);
  }
}

export function formatUserWithAdminAccess(user: IUser | Record<string, unknown>) {
  const u = user as IUser;
  const base: Record<string, unknown> = {
    id: (u as any)._id?.toString?.() || (u as any).id,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    phone: u.phone,
    avatarUrl: u.avatarUrl,
    accountStatus: u.accountStatus,
    sellerVerificationStatus: u.sellerVerificationStatus,
    isSellerVerified: u.isSellerVerified,
    emailVerified: u.emailVerified,
    createdAt: (u as any).createdAt,
    updatedAt: (u as any).updatedAt,
  };
  if (u.role === 'admin') {
    base.adminAccess = resolveAdminAccess(u);
  }
  return base;
}
