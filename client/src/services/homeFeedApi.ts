/**
 * homeFeedApi.ts — thin client for the marketplace AI home-feed endpoint.
 *
 * The server returns sections of products already personalised, ranked,
 * and tagged with `aiMeta`. Existing UI components consume them exactly
 * as they consumed `productAPI.getProducts(...)` because each section's
 * `products[]` shape is product-card-compatible (price, thumbnail, etc).
 *
 * The new `aiMeta` field is optional — UI may render it (badges, reasons)
 * or simply ignore it, so no UI redesign is required.
 */

import axios from 'axios';
import { API_BASE_URL } from '../lib/config';

const SESSION_KEY = 'spacilly-mp-session';

function getSessionId(): string {
  try {
    let s = localStorage.getItem(SESSION_KEY);
    if (!s) {
      s =
        (crypto as any)?.randomUUID?.() ||
        `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return `s-${Date.now()}`;
  }
}

function getAuthHeader(): Record<string, string> {
  try {
    const t = localStorage.getItem('auth_token');
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch {
    return {};
  }
}

export interface AIMetaBadges {
  almostGone?: number;
  sellingFast?: boolean;
  viewersNow?: number;
  socialProof?: string;
  dealEndsInMin?: number;
  trendingBadge?: boolean;
  freshArrival?: boolean;
}

export interface AIMeta {
  score: number;
  reasons: string[];
  topReason: string;
  sponsored?: boolean;
  badges?: AIMetaBadges;
}

export interface FeedProduct {
  _id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  discount?: number;
  thumbnail?: string;
  images?: string[];
  rating?: number;
  reviewCount?: number;
  category?: string;
  sellerId?: string;
  stock?: number;
  aiMeta?: AIMeta;
}

export type FeedSectionId =
  | 'hero'
  | 'trending'
  | 'foryou'
  | 'deals'
  | 'fresh'
  | 'bestsellers'
  | 'near_you'
  | 'inspired'
  | 'upcoming';

export interface FeedSection {
  id: FeedSectionId;
  title: string;
  subtitle?: string;
  layout: 'grid' | 'carousel' | 'hero';
  products: FeedProduct[];
}

export interface HomeFeed {
  config: { mode: string; confidence: number };
  sections: FeedSection[];
  generatedAt: string;
}

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
});

export const homeFeedApi = {
  /** Fetch the full personalised home feed. */
  getFeed: async (params: { limit?: number } = {}): Promise<HomeFeed> => {
    const res = await client.get('/home/feed', {
      params,
      headers: { 'X-Spacilly-Session': getSessionId(), ...getAuthHeader() },
      withCredentials: true,
    });
    return res.data;
  },

  /** Fetch a single section (e.g. used by the existing TrendingProducts component). */
  getSection: async (id: FeedSectionId, params: { limit?: number } = {}): Promise<FeedSection> => {
    const res = await client.get(`/home/section/${encodeURIComponent(id)}`, {
      params,
      headers: { 'X-Spacilly-Session': getSessionId(), ...getAuthHeader() },
      withCredentials: true,
    });
    return res.data;
  },

  /**
   * Beacon — fire-and-forget behaviour tracking.
   * `event.type` may be `search`, `view`, `click`, `hover`, `scroll`,
   * `cart_add`, or `wishlist_add` (matching the server enum).
   */
  track: (event: any, extra: Record<string, unknown> = {}): void => {
    try {
      const body = JSON.stringify({ event, sessionId: getSessionId(), ...extra });
      const url = `${API_BASE_URL}/home/track`;
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        // sendBeacon doesn't accept custom headers, but the server reads
        // sessionId from body so it still works for anonymous beacons.
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        return;
      }
      void client.post('/home/track', JSON.parse(body), {
        headers: { 'X-Spacilly-Session': getSessionId(), ...getAuthHeader() },
        withCredentials: true,
      });
    } catch {
      /* ignore */
    }
  },

  getSessionId,
};
