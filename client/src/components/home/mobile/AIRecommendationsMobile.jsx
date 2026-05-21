import { useNavigate } from 'react-router-dom';
import { Sparkles, ShoppingBag } from 'lucide-react';
import { useBuyerCart } from '../../../stores/buyerCartStore';
import { useCurrencyPricing } from '../../../hooks/useCurrencyPricing';
import { buyerProductPath } from '../../../lib/productUrl';
import MobileSectionHeader from './MobileSectionHeader';
import { productDisplayName, resolveProductImage } from './productUtils';

function AIHeroCard({ product }) {
  const navigate = useNavigate();
  const addItem = useBuyerCart((s) => s.addItem);
  const currencyPricing = useCurrencyPricing();
  const name = productDisplayName(product);
  const imgSrc = resolveProductImage(product);
  const reason = product.aiMeta?.topReason || product.aiMeta?.reasons?.[0] || 'Picked for you';

  return (
    <button
      type="button"
      onClick={() => navigate(buyerProductPath(product))}
      className="mob-card-surface relative flex w-full overflow-hidden text-left active:scale-[0.99] transition-transform"
      style={{ minHeight: 120 }}
    >
      <div className="relative w-[42%] shrink-0 overflow-hidden">
        <img src={imgSrc} alt="" className="h-full min-h-[120px] w-full object-cover" />
        <span
          className="absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
          style={{
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            color: '#fff',
          }}
        >
          <Sparkles size={10} />
          AI Pick
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          For you
        </p>
        <h3
          className="mt-0.5 line-clamp-2 text-[14px] font-semibold leading-snug"
          style={{ color: 'var(--text-primary)' }}
        >
          {name}
        </h3>
        <p className="mt-1 line-clamp-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {reason}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[15px] font-bold" style={{ color: 'var(--brand-primary)' }}>
            {currencyPricing.formatLocalWithUsd(product.price || 0)}
          </span>
          <span
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
            style={{ background: 'var(--brand-primary)' }}
            onClick={(e) => {
              e.stopPropagation();
              addItem(product, 1);
            }}
            role="presentation"
          >
            <ShoppingBag size={12} />
            Add
          </span>
        </div>
      </div>
    </button>
  );
}

function AISupportCard({ product }) {
  const navigate = useNavigate();
  const currencyPricing = useCurrencyPricing();
  const imgSrc = resolveProductImage(product);

  return (
    <button
      type="button"
      onClick={() => navigate(buyerProductPath(product))}
      className="mob-card-surface flex w-[120px] shrink-0 flex-col overflow-hidden text-left"
    >
      <div className="relative" style={{ aspectRatio: '1 / 1' }}>
        <img src={imgSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="px-2 py-1.5">
        <p className="line-clamp-1 text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>
          {productDisplayName(product)}
        </p>
        <p className="text-[12px] font-bold" style={{ color: 'var(--brand-primary)' }}>
          {currencyPricing.formatLocalWithUsd(product.price || 0)}
        </p>
      </div>
    </button>
  );
}

export default function AIRecommendationsMobile({ products = [], loading }) {
  if (loading) {
    return (
      <section className="mob-section">
        <div className="mob-card-surface mb-3 h-[120px] pwa-skeleton" />
        <div className="mob-horizontal-scroll">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="mob-card-surface h-[140px] w-[120px] pwa-skeleton" />
          ))}
        </div>
      </section>
    );
  }

  if (!products.length) return null;

  const [hero, ...rest] = products;

  return (
    <section className="mob-section" aria-labelledby="mob-ai-recs">
      <MobileSectionHeader
        id="mob-ai-recs"
        title="AI for you"
        subtitle="Personalized picks based on your taste"
        href="/explore?tab=ai"
      />
      <AIHeroCard product={hero} />
      {rest.length > 0 && (
        <div className="mob-horizontal-scroll mt-3">
          {rest.slice(0, 6).map((p) => (
            <AISupportCard key={p._id || p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
