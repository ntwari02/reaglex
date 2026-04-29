import api from './api';

export type RecommendationFrequency = 'daily' | 'weekly';
export type RecommendationMode = 'deals_only' | 'mixed';

export async function getRecommendationEmailPreference() {
  const { data } = await api.get('/recommendation-emails/preferences/me');
  return data?.preference || null;
}

export async function updateRecommendationEmailPreference(payload: {
  enabled?: boolean;
  frequency?: RecommendationFrequency;
  mode?: RecommendationMode;
  unsubscribed?: boolean;
}) {
  const { data } = await api.patch('/recommendation-emails/preferences/me', payload);
  return data?.preference || null;
}

export async function trackRecommendationActivity(payload: {
  eventType:
    | 'wishlist_add'
    | 'wishlist_remove'
    | 'product_view'
    | 'cart_add'
    | 'cart_remove'
    | 'purchase'
    | 'category_interaction'
    | 'tag_interaction';
  productId?: string;
  category?: string;
  tags?: string[];
  meta?: Record<string, unknown>;
}) {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    await api.post('/recommendation-emails/activity', payload);
  } catch {
    // analytics should never break UX
  }
}

