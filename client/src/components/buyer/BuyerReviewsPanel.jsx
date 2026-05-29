import { useCallback, useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { buyerReturnsAPI } from '@/lib/api';
import { orderAPI } from '@/services/api';
import { useToastStore } from '@/stores/toastStore';

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5"
          aria-label={`${n} stars`}
        >
          <Star
            className="h-5 w-5"
            fill={n <= value ? '#f59e0b' : 'transparent'}
            stroke={n <= value ? '#f59e0b' : 'var(--text-muted)'}
          />
        </button>
      ))}
    </div>
  );
}

export default function BuyerReviewsPanel({ filter = 'all', sort = 'newest' }) {
  const { showToast } = useToastStore();
  const [reviews, setReviews] = useState([]);
  const [eligible, setEligible] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState({ orderId: '', productId: '', productName: '', rating: 5, message: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [revRes, ordersRes] = await Promise.all([
        buyerReturnsAPI.listMyReviews(),
        orderAPI.list(),
      ]);
      const myReviews = revRes?.reviews || [];
      setReviews(myReviews);

      const reviewedKeys = new Set(
        myReviews.map((r) => `${r.orderId}:${r.productId}`),
      );
      const orders = ordersRes?.orders || ordersRes || [];
      const pending = [];
      for (const o of orders) {
        const status = String(o.status || '').toLowerCase();
        if (!['delivered', 'shipped', 'completed'].includes(status)) continue;
        const oid = String(o._id || o.id);
        const items = o.items || o.products || [];
        for (const it of items) {
          const pid = String(it.productId || it.product_id || it.id || '');
          if (!pid) continue;
          if (reviewedKeys.has(`${oid}:${pid}`)) continue;
          pending.push({
            orderId: oid,
            orderNumber: o.orderNumber || oid.slice(-8),
            productId: pid,
            productName: it.name || it.title || 'Product',
          });
        }
      }
      setEligible(pending);
    } catch (e) {
      showToast(e?.message || 'Could not load reviews', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayReviews = useMemo(() => {
    let list = [...reviews];
    if (filter !== 'all') {
      const min = Number(filter);
      list = list.filter((r) => Number(r.rating) >= min);
    }
    list.sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sort === 'oldest' ? da - db : db - da;
    });
    return list;
  }, [reviews, filter, sort]);

  const submit = async (e) => {
    e.preventDefault();
    if (!draft.orderId || !draft.productId) return;
    setSubmitting(true);
    try {
      const res = await buyerReturnsAPI.submitReview({
        orderId: draft.orderId,
        productId: draft.productId,
        rating: draft.rating,
        message: draft.message.trim(),
      });
      showToast(
        res?.reward?.points
          ? `Review submitted! +${res.reward.points} reward points.`
          : 'Review submitted — thank you!',
        'success',
      );
      setDraft({ orderId: '', productId: '', productName: '', rating: 5, message: '' });
      await load();
    } catch (e) {
      showToast(e?.message || 'Could not submit review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-[var(--text-muted)] py-8 text-center">Loading reviews…</p>;
  }

  return (
    <div className="space-y-6">
      {eligible.length > 0 && (
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--card-bg)' }}>
          <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
            Leave a review ({eligible.length} pending)
          </h3>
          {!draft.orderId ? (
            <ul className="space-y-2">
              {eligible.slice(0, 8).map((row) => (
                <li key={`${row.orderId}-${row.productId}`}>
                  <button
                    type="button"
                    className="w-full text-left rounded-lg border px-3 py-2 text-sm hover:border-orange-300"
                    style={{ borderColor: 'var(--border-subtle)' }}
                    onClick={() =>
                      setDraft({
                        orderId: row.orderId,
                        productId: row.productId,
                        productName: row.productName,
                        rating: 5,
                        message: '',
                      })
                    }
                  >
                    <span className="font-medium">{row.productName}</span>
                    <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                      Order #{row.orderNumber}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <p className="text-sm font-medium">{draft.productName}</p>
              <StarPicker value={draft.rating} onChange={(n) => setDraft((d) => ({ ...d, rating: n }))} />
              <textarea
                value={draft.message}
                onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
                placeholder="Share your experience (optional)"
                rows={3}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg border text-sm"
                  onClick={() => setDraft({ orderId: '', productId: '', productName: '', rating: 5, message: '' })}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--brand-primary)] disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit review'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {displayReviews.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
          {eligible.length ? 'No published reviews yet — pick an order above to write one.' : 'No reviews yet. After delivery, you can review your purchases here.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {displayReviews.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border p-4"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--card-bg)' }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="font-semibold text-sm">{r.productName}</p>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-3.5 w-3.5"
                      fill={i < r.rating ? '#f59e0b' : 'transparent'}
                      stroke={i < r.rating ? '#f59e0b' : '#d1d5db'}
                    />
                  ))}
                </div>
              </div>
              {r.message ? (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {r.message}
                </p>
              ) : null}
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                {new Date(r.createdAt).toLocaleDateString()}
                {r.verifiedPurchase ? ' · Verified purchase' : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
