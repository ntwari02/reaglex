import UpcomingProductCard from '../home/mobile/UpcomingProductCard';
import { mergeUpcomingList } from '../home/mobile/upcomingProductsData';
import '../../styles/upcoming-products.css';

export default function ExploreUpcomingFeed({ products, loading }) {
  const drops = mergeUpcomingList(Array.isArray(products) ? products : []);

  if (loading && !drops.length) {
    return (
      <div className="up-explore-feed">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="up-card up-card--skel up-explore-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="up-explore-feed">
      {drops.map((drop, i) => (
        <UpcomingProductCard key={drop.id} drop={drop} index={i} />
      ))}
    </div>
  );
}
