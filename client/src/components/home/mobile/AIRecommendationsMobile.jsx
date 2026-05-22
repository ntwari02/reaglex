import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useBuyerCart } from '../../../stores/buyerCartStore';
import { useCurrencyPricing } from '../../../hooks/useCurrencyPricing';
import { navigateToProduct } from '../../../lib/productNavigation';
import { explorePath } from '../../explore/exploreConfig';
import MobileSectionHeader from './MobileSectionHeader';
import MobileAddCta from './MobileAddCta';
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
      className="mob-ai-hero w-full text-left active:scale-[0.99] transition-transform"
      onClick={() => navigateToProduct(navigate, product)}
    >
      <div className="mob-ai-hero-media">
        <img src={imgSrc} alt="" loading="lazy" />
        <span
          className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase"
          style={{
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            color: '#fff',
          }}
        >
          <Sparkles size={8} />
          AI
        </span>
      </div>
      <div className="mob-ai-hero-body">
        <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          For you
        </p>
        <h3 className="mob-ai-hero-title">{name}</h3>
        <p className="mob-ai-hero-reason">{reason}</p>
        <div className="mob-ai-hero-foot">
          <span className="mob-ai-hero-price">
            {currencyPricing.formatLocalWithUsd(product.price || 0)}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                background: 'var(--brand-tint)',
                color: 'var(--brand-primary)',
                border: '1px solid var(--brand-border-subtle)',
              }}
            >
              View pick
            </span>
            <MobileAddCta
              onClick={(e) => {
                e.stopPropagation();
                addItem(product, 1);
              }}
            />
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
      className="mob-ai-chip-card text-left active:scale-[0.98] transition-transform"
      onClick={() => navigateToProduct(navigate, product)}
    >
      <div className="mob-ai-chip-media">
        <img src={imgSrc} alt="" loading="lazy" />
      </div>
      <div className="mob-ai-chip-body">
        <p className="mob-ai-chip-title">{productDisplayName(product)}</p>
        <p className="mob-ai-chip-price">
          {currencyPricing.formatLocalWithUsd(product.price || 0)}
        </p>
      </div>
    </button>
  );
}

export default function AIRecommendationsMobile({ products = [], loading }) {
  if (loading) {
    return (
      <section className="mob-section mob-ai-section">
        <div className="mob-card-surface mb-2 h-[104px] pwa-skeleton" />
        <div className="mob-horizontal-scroll">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="mob-ai-chip-card h-[128px] pwa-skeleton" />
          ))}
        </div>
      </section>
    );
  }

  if (!products.length) return null;

  const [hero, ...rest] = products;

  return (
    <section className="mob-section mob-ai-section" aria-labelledby="mob-ai-recs">
      <MobileSectionHeader
        id="mob-ai-recs"
        title="AI for you"
        subtitle="Personalized picks"
        href={explorePath('ai')}
      />
      <AIHeroCard product={hero} />
      {rest.length > 0 && (
        <div className="mob-horizontal-scroll mt-2">
          {rest.slice(0, 6).map((p) => (
            <AISupportCard key={p._id || p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
