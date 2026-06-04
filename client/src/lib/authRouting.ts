import type { Profile } from '../types';

export type AppRole = Profile['role'];

const VALID_ROLES: AppRole[] = ['buyer', 'seller', 'admin'];

export function isValidRole(role: string | undefined | null): role is AppRole {
  return !!role && (VALID_ROLES as string[]).includes(role);
}

/** Default landing path after login or when role cannot access current shell. */
export function getDashboardPathForRole(role: string | undefined | null): string {
  if (role === 'seller') return '/seller';
  if (role === 'admin') return '/admin';
  if (role === 'buyer') return '/';
  return '/login';
}

/** Guests and buyers may use the storefront / buyer shell. */
export function canAccessBuyerUi(user: Profile | null | undefined): boolean {
  if (!user) return true;
  return user.role === 'buyer';
}

/** Paths that stay on the storefront for any role (marketing / legal). */
const BUYER_SHELL_PUBLIC_PREFIXES = [
  '/seller/fees',
  '/seller/guidelines',
  '/seller/advertise',
  '/terms',
  '/privacy',
  '/cookies',
  '/cookie-settings',
  '/faq',
  '/sitemap',
  '/about',
  '/contact',
  '/buyer-protection',
];

export function isBuyerShellPublicPath(pathname: string): boolean {
  return BUYER_SHELL_PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Post-login redirect: honor ?redirect= only when it matches the user's role.
 */
export function resolvePostLoginPath(
  role: string | undefined,
  redirectParam?: string | null,
): string {
  const home = getDashboardPathForRole(role);
  if (!isValidRole(role)) return '/login';
  if (!redirectParam?.startsWith('/') || redirectParam.startsWith('//')) {
    return home;
  }

  if (role === 'seller') {
    return redirectParam.startsWith('/seller') ? redirectParam : home;
  }
  if (role === 'admin') {
    return redirectParam.startsWith('/admin') ? redirectParam : home;
  }
  // buyer
  if (redirectParam.startsWith('/admin') || redirectParam.startsWith('/seller')) {
    if (isBuyerShellPublicPath(redirectParam)) return redirectParam;
    return home;
  }
  return redirectParam;
}
