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
  '/checkout',
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

/** Account settings — distraction-free (no storefront navbar / bottom nav). */
export function isAccountSettingsRoute(pathname, search = '') {
  if (pathname !== '/account') return false;
  const tab = new URLSearchParams(search).get('tab');
  return tab === 'settings';
}

/** Category browse — own top bar + search; hide storefront header. */
export function isCategoryBrowseRoute(pathname) {
  if (pathname === '/category/all') return false;
  return pathname === '/category' || pathname.startsWith('/category/');
}

/** Product detail — own mobile top bar; hide storefront header. */
export function isProductDetailRoute(pathname) {
  return pathname.startsWith('/product/') || pathname.startsWith('/products/');
}

export function isBuyerHeaderHidden(pathname) {
  return isCategoryBrowseRoute(pathname) || isProductDetailRoute(pathname);
}

/** Hide GlobalNavbar + MobileBottomNav on these routes (unless seller marketing whitelist). */
export function isBuyerChromeHidden(pathname, search = '') {
  if (isSellerPathWithBuyerNav(pathname)) return false;
  if (isAccountSettingsRoute(pathname, search)) return true;
  return NO_BUYER_CHROME_PREFIXES.some((p) => matchesChromeHidePrefix(pathname, p));
}
