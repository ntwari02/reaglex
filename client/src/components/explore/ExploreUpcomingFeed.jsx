import { useMemo } from 'react';
import UpcomingRailCard from '../home/mobile/UpcomingRailCard';
import { mergeUpcomingList, enrichDrop } from '../home/mobile/upcomingProductsData';
import '../../styles/upcoming-drops-premium.css';

const LIMIT = 10;

export default function ExploreUpcomingFeed({ products, loading }) {
  const drops = useMemo(
    () =>
      mergeUpcomingList(Array.isArray(products) ? products : [])
        .map(enrichDrop)
        .slice(0, LIMIT),
    [products]
  );

  if (loading && !drops.length) {
    return (
      <div className="ud-explore-loading">
        <div className="ud-skeleton-featured" />
      </div>
    );
  }

  return (
    <div className="ud-explore-feed mob-home-ex">
      {drops.length > 0 && (
        <div className="ex-rail-wrap mob-home-ex-rail">
          <div className="ex-rail-scroll">
            {drops.map((drop, i) => (
              <UpcomingRailCard key={drop.id} drop={drop} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
