import { useMemo } from 'react';
import UpcomingFeaturedDrop from '../home/mobile/UpcomingFeaturedDrop';
import UpcomingDropMiniCard from '../home/mobile/UpcomingDropMiniCard';
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

  const [featured, ...rest] = drops;

  return (
    <div className="ud-explore-feed">
      {featured && <UpcomingFeaturedDrop drop={featured} />}
      {rest.length > 0 && (
        <div className="ud-mini-rail ud-mini-rail--explore">
          {rest.map((drop, i) => (
            <UpcomingDropMiniCard key={drop.id} drop={drop} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
