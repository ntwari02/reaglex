/**
 * Seller marketing / info pages that use BuyerLayout and should keep
 * storefront navbar + mobile bottom nav (not hidden like /seller/* dashboard).
 */
export const SELLER_PATHS_WITH_BUYER_NAV = [
  '/seller/advertise',
  '/seller/fees',
  '/seller/guidelines',
];

export function isSellerPathWithBuyerNav(pathname) {
  return SELLER_PATHS_WITH_BUYER_NAV.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Prefixes where buyer navbar + mobile bottom nav are hidden (auth, dashboards).
 * Match with strict boundaries: exact path or `prefix/` (avoids `/auth` matching unrelated paths).
 */
export const NO_BUYER_CHROME_PREFIXES = [
  '/auth',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/verify-otp',
  '/select-role',
  '/auth/google',
  '/approve-device-success',
  '/seller',
  '/admin',
  '/dashboard',
];

function matchesChromeHidePrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Hide GlobalNavbar + MobileBottomNav on these routes (unless seller marketing whitelist). */
export function isBuyerChromeHidden(pathname) {
  if (isSellerPathWithBuyerNav(pathname)) return false;
  return NO_BUYER_CHROME_PREFIXES.some((p) => matchesChromeHidePrefix(pathname, p));
}
