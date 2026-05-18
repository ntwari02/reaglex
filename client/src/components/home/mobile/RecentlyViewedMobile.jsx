import { useNavigate } from 'react-router-dom';
import { useRecentlyViewed } from '../../../stores/recentlyViewedStore';
import { useCurrencyPricing } from '../../../hooks/useCurrencyPricing';
import { SERVER_URL } from '../../../lib/config';
import MobileSectionHeader from './MobileSectionHeader';

function resolveThumb(src) {
  if (!src) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80';
  const v = typeof src === 'string' ? src : src?.url || '';
  return v.startsWith('http') ? v : `${SERVER_URL}${v}`;
}

export default function RecentlyViewedMobile() {
  const items = useRecentlyViewed((s) => s.items);
  const navigate = useNavigate();
  const currencyPricing = useCurrencyPricing();

  if (!items.length) return null;

  return (
    <section className="mob-section" aria-labelledby="mob-recent">
      <MobileSectionHeader id="mob-recent" title="Recently viewed" href="/search" />
      <div className="mob-horizontal-scroll">
        {items.slice(0, 8).map((p) => (
          <button
            key={p._id || p.id}
            type="button"
            onClick={() => navigate(`/product/${p._id || p.id}`)}
            className="mob-card-surface flex w-[100px] shrink-0 flex-col overflow-hidden text-left active:scale-[0.98] transition-transform"
          >
            <div className="relative overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
              <img
                src={resolveThumb(p.image)}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="px-2 py-1.5">
              <p
                className="line-clamp-1 text-[11px] font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {p.title}
              </p>
              <p className="text-[12px] font-bold" style={{ color: 'var(--brand-primary)' }}>
                {currencyPricing.formatLocalWithUsd(p.price || 0)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
