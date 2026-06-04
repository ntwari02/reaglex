import { useHomeFeedSection } from '../../../hooks/useHomeFeedSections';
import { HOME_PRODUCT_LIMIT } from './HomeExploreSection';
import { mergeUpcomingList, enrichDrop } from './upcomingProductsData';
import UpcomingRailCard from './UpcomingRailCard';
import MobileSectionHeader from './MobileSectionHeader';
import { explorePath } from '../../explore/exploreConfig';
import { useToastStore } from '../../../stores/toastStore';
import '../../../styles/upcoming-drops-premium.css';

export default function UpcomingProductsSection() {
  const showToast = useToastStore((s) => s.showToast);
  const { data: upcomingProducts, isPending } = useHomeFeedSection('upcoming', HOME_PRODUCT_LIMIT);

  const drops = mergeUpcomingList(Array.isArray(upcomingProducts) ? upcomingProducts : [])
    .map(enrichDrop)
    .slice(0, HOME_PRODUCT_LIMIT);

  const handleNotify = (drop) => {
    showToast(`We'll notify you when ${drop.title} drops`, 'success');
  };

  if (!isPending && !drops.length) return null;

  return (
    <section className="ud-section mob-section mob-home-ex" aria-labelledby="upcoming-drops-heading">
      <MobileSectionHeader
        id="upcoming-drops-heading"
        title="Upcoming Drops"
        subtitle="Limited releases · notify before they sell out"
        href={explorePath('upcoming')}
      />

      {isPending && !drops.length ? (
        <div className="ex-rail-wrap">
          <div className="ex-rail-scroll">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="ex-skeleton-rail" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {drops.length > 0 && (
            <div className="ex-rail-wrap mob-home-ex-rail">
              <div className="ex-rail-scroll">
                {drops.map((drop, i) => (
                  <UpcomingRailCard key={drop.id} drop={drop} index={i} onNotify={handleNotify} />
                ))}
              </div>
            </div>
          )}

          <div className="ud-promo ud-promo--alerts">
            <div className="ud-promo-icon ud-promo-icon--bell" aria-hidden />
            <div>
              <p className="ud-promo-title">Never Miss a Drop</p>
              <p className="ud-promo-sub">Get instant alerts when hype products go live</p>
            </div>
            <button type="button" className="ud-promo-cta" onClick={() => handleNotify(drops[0])}>
              Enable Alerts
            </button>
          </div>

          <div className="ud-promo ud-promo--vip">
            <div className="ud-promo-icon ud-promo-icon--crown" aria-hidden />
            <div>
              <p className="ud-promo-title">VIP Early Access</p>
              <p className="ud-promo-sub">Shop drops 24h before everyone else</p>
            </div>
            <button type="button" className="ud-promo-cta ud-promo-cta--vip">
              Become VIP
            </button>
          </div>
        </>
      )}
    </section>
  );
}
