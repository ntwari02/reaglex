import MobileSectionHeader from './MobileSectionHeader';
import { explorePath } from '../../explore/exploreConfig';
import { AIHeroCard, AIGridCard } from '../../cards/PremiumCards';

export default function AIRecommendationsMobile({ products = [], loading }) {
  if (loading) {
    return (
      <section className="mob-section">
        <div className="mob-card-surface mb-3 h-[168px] pwa-skeleton" />
        <div className="rx-card-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mob-card-surface aspect-[3/4] pwa-skeleton" />
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
        href={explorePath('ai')}
      />
      <AIHeroCard product={hero} />
      {rest.length > 0 && (
        <div className="rx-card-grid rx-card-grid--ai">
          {rest.slice(0, 6).map((p, i) => (
            <AIGridCard key={p._id || p.id} product={p} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
