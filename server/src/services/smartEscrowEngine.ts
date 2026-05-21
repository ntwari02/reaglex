export function resolveEscrowReleaseMode(type: 'shipping' | 'pickup' | 'digital' | 'service') {
  if (type === 'pickup') return 'release_on_qr_scan';
  if (type === 'digital') return 'release_on_access_confirmation';
  if (type === 'service') return 'release_on_buyer_approval';
  return 'release_on_delivery';
}
