import MobileSectionHeader from './MobileSectionHeader';
import RecentlyViewedRailCard from './RecentlyViewedRailCard';
import '../../../styles/explore-all.css';

/**
 * Horizontal rail — same 148px card width as best-seller rails,
 * with “you might also like” premium card styling.
 */
export default function RecentlyViewedRail({
  items = [],
  id = 'mob-recent',
  title = 'Recently viewed',
  subtitle = 'Recommended for you',
  href = '/search',
  className = '',
  showHeader = true,
}) {
  if (!items.length) return null;

  return (
    <section className={`mob-section mob-home-ex ${className}`.trim()} aria-labelledby={id}>
      {showHeader && (
        <MobileSectionHeader id={id} title={title} subtitle={subtitle} href={href} />
      )}
      <div className="ex-rail-wrap mob-home-ex-rail">
        <div className="ex-rail-scroll">
          {items.slice(0, 8).map((p, i) => (
            <RecentlyViewedRailCard key={p._id || p.id || i} product={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
