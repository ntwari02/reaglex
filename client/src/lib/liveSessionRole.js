/**
 * True only when this user is the host of this specific live session (not merely role=seller).
 */
export function isLiveSessionHost(user, session) {
  if (!user || !session) return false;
  if (user.role !== 'seller') return false;

  const userId = String(user.id || '').trim();
  const hostId = String(session.sellerId || session.seller?.id || '').trim();
  if (!userId || !hostId) return false;

  return userId === hostId;
}
