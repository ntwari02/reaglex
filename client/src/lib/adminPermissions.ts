import type { Profile } from '../types';
import { ADMIN_ROUTE_SCOPES, getAllAdminRouteIds } from './adminNavCatalog';

export type AdminScope =
  | 'dashboard'
  | 'users'
  | 'sellers'
  | 'kyc'
  | 'products'
  | 'orders'
  | 'finance'
  | 'subscriptions'
  | 'support'
  | 'returns'
  | 'logistics'
  | 'notifications'
  | 'live_commerce'
  | 'marketing'
  | 'reviews'
  | 'collections'
  | 'compliance'
  | 'system'
  | 'security'
  | 'settings';

export const ALL_ADMIN_SCOPES: AdminScope[] = [
  'dashboard',
  'users',
  'sellers',
  'kyc',
  'products',
  'orders',
  'finance',
  'subscriptions',
  'support',
  'returns',
  'logistics',
  'notifications',
  'live_commerce',
  'marketing',
  'reviews',
  'collections',
  'compliance',
  'system',
  'security',
  'settings',
];

export interface AdminAccessInfo {
  tier: 'super' | 'scoped';
  isSuperAdmin: boolean;
  scopes: AdminScope[];
  preset?: string;
  label: string;
  require2FA?: boolean;
}

function normalizeScopes(scopes: unknown): AdminScope[] {
  if (!Array.isArray(scopes)) return [];
  const allowed = new Set(ALL_ADMIN_SCOPES);
  return scopes
    .map((s) => String(s).trim())
    .filter((s): s is AdminScope => allowed.has(s as AdminScope));
}

/** Mirrors server `resolveAdminAccess` — legacy admins without adminAccess are super admins. */
function superAdminAccess(label = 'Super Admin'): AdminAccessInfo {
  return {
    tier: 'super',
    isSuperAdmin: true,
    scopes: [...ALL_ADMIN_SCOPES],
    preset: 'super_admin',
    label,
    require2FA: true,
  };
}

export function getAdminAccess(user: Profile | null | undefined): AdminAccessInfo | null {
  if (!user || user.role !== 'admin') return null;
  const raw = (user as Profile & { adminAccess?: AdminAccessInfo })?.adminAccess;

  if (!raw || !raw.tier) {
    return superAdminAccess();
  }

  if (raw.tier === 'super' || raw.isSuperAdmin) {
    return superAdminAccess(raw.label || 'Super Admin');
  }

  return {
    tier: 'scoped',
    isSuperAdmin: false,
    scopes: normalizeScopes(raw.scopes),
    preset: raw.preset,
    label: raw.label || raw.preset || 'Admin staff',
    require2FA: raw.require2FA !== false,
  };
}

export function isSuperAdmin(user: Profile | null | undefined): boolean {
  return Boolean(getAdminAccess(user)?.isSuperAdmin);
}

export function hasAdminScope(user: Profile | null | undefined, scope: AdminScope | 'super'): boolean {
  const access = getAdminAccess(user);
  if (!access) return false;
  if (scope === 'super') return access.isSuperAdmin;
  if (access.isSuperAdmin) return true;
  return access.scopes.includes(scope);
}

export function canAccessAdminRoute(user: Profile | null | undefined, routeId: string): boolean {
  if (routeId === 'team' || routeId === 'system-controls') return isSuperAdmin(user);
  const scope = ADMIN_ROUTE_SCOPES[routeId];
  if (!scope) return isSuperAdmin(user);
  if (scope === 'super') return isSuperAdmin(user);
  return hasAdminScope(user, scope);
}

export function adminRoleLabel(user: Profile | null | undefined): string {
  return getAdminAccess(user)?.label || 'Admin';
}

/** First sidebar route this staff member may open (for redirects). */
export function getDefaultAdminRouteId(user: Profile | null | undefined): string {
  const order = getAllAdminRouteIds();
  const hit = order.find((routeId) => canAccessAdminRoute(user, routeId));
  return hit || 'dashboard';
}

export function getDefaultAdminPath(user: Profile | null | undefined): string {
  const routeId = getDefaultAdminRouteId(user);
  return routeId === 'dashboard' ? '/admin' : `/admin/${routeId}`;
}

/** ⌘K search — any scoped area except team management. */
export function canUseAdminIntelligenceSearch(user: Profile | null | undefined): boolean {
  const access = getAdminAccess(user);
  if (!access) return false;
  if (access.isSuperAdmin) return true;
  return access.scopes.length > 0;
}
