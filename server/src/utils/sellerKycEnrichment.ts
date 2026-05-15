import { isSellerKycVerified } from '../services/sellerKyc.service';

type SellerKycUserInput = {
  role?: string;
  _id?: unknown;
  id?: unknown;
};

/** Attach `kycVerified` for seller users in API responses. */
export async function enrichUserWithSellerKyc<T extends SellerKycUserInput>(
  user: T,
): Promise<T & { kycVerified?: boolean }> {
  if (user.role !== 'seller') return user;
  const id = (user._id ?? user.id) as string | undefined;
  if (!id) return user;
  const kycVerified = await isSellerKycVerified(String(id));
  return { ...user, kycVerified };
}
