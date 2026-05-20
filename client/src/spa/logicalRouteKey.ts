/**
 * Stable route identity for scroll/UI memory (bottom tabs, feeds).
 * Unlike React Router location.key, this stays the same when re-tapping a tab.
 */
export function logicalRouteKey(pathname: string, search = ''): string {
  const params = new URLSearchParams(search);
  if (pathname === '/') return 'tab:home';
  if (pathname.startsWith('/explore')) return `tab:explore${search}`;
  if (
    pathname.startsWith('/products') ||
    pathname.startsWith('/category') ||
    pathname.startsWith('/search')
  ) {
    return `tab:browse:${pathname}${search}`;
  }
  if (pathname.startsWith('/product/') || pathname.startsWith('/products/')) {
    return `tab:product:${pathname}`;
  }
  if (pathname.startsWith('/account')) {
    const tab = params.get('tab') || 'overview';
    return `tab:account:${tab}${params.get('section') ? `:${params.get('section')}` : ''}`;
  }
  if (pathname.startsWith('/notifications')) return 'tab:notifications';
  if (pathname.startsWith('/upcoming')) return 'tab:upcoming';
  return `${pathname}${search}`;
}

export function bottomNavTabId(pathname: string, search = ''): string | null {
  const params = new URLSearchParams(search);
  if (pathname === '/') return 'home';
  if (
    pathname.startsWith('/products') ||
    pathname.startsWith('/category') ||
    pathname.startsWith('/search')
  ) {
    return 'browse';
  }
  if (pathname.startsWith('/account') || pathname.startsWith('/notifications')) {
    if (params.get('tab') === 'wishlist') return 'wishlist';
    return 'account';
  }
  return null;
}
