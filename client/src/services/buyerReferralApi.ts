import { API_BASE_URL } from '../lib/config';

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

export type BuyerReferralDashboard = {
  programEnabled: boolean;
  referralCode: string | null;
  shareLink: string | null;
  rewardType: 'cash' | 'points' | 'coupon';
  rewardAmount: number;
  rewardLabel: string;
  stats: {
    friendsInvited: number;
    rewardsEarned: number;
    totalRewardAmount: number;
  };
  recentRewards: Array<{
    id: string;
    amount: number;
    rewardType: string;
    status: string;
    createdAt: string;
  }>;
};

export const buyerReferralApi = {
  async getDashboard(): Promise<BuyerReferralDashboard> {
    const res = await fetch(`${API_BASE_URL}/buyer/referral`, {
      headers: getAuthHeaders(),
      credentials: 'include',
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to load referral');
    return data as BuyerReferralDashboard;
  },
};
