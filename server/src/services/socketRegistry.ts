/** Shared socket presence counts (avoids circular imports with websocket ↔ monitor sockets). */

const roles = new Map<string, 'buyer' | 'seller' | 'admin'>();

export function socketPresenceRegister(userId: string, role: string) {
  const r =
    role === 'admin' ? 'admin' : role === 'seller' ? 'seller' : 'buyer';
  roles.set(userId, r);
}

export function socketPresenceUnregister(userId: string) {
  roles.delete(userId);
}

export function getConnectedUsersByRole(): { buyer: number; seller: number; admin: number } {
  let buyer = 0;
  let seller = 0;
  let admin = 0;
  for (const r of roles.values()) {
    if (r === 'admin') admin++;
    else if (r === 'seller') seller++;
    else buyer++;
  }
  return { buyer, seller, admin };
}
