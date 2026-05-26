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

export interface AdminAccessInfo {
  tier: 'super' | 'scoped';
  isSuperAdmin: boolean;
  scopes: AdminScope[];
  preset?: string;
  label: string;
  require2FA?: boolean;
}

export function getAdminAccess(user: Profile | null | undefined): AdminAccessInfo | null {
  const raw = (user as Profile & { adminAccess?: AdminAccessInfo })?.adminAccess;
  if (!user || user.role !== 'admin') return null;
  if (!raw) {
    return {
      tier: 'scoped',
      isSuperAdmin: false,
      scopes: [],
      label: 'Admin',
      require2FA: true,
    };
  }
  return raw;
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
  if (routeId === 'team') return isSuperAdmin(user);
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
