import { useRecentlyViewed } from '../../../stores/recentlyViewedStore';
import RecentlyViewedRail from './RecentlyViewedRail';

export default function RecentlyViewedMobile() {
  const items = useRecentlyViewed((s) => s.items);
  return <RecentlyViewedRail items={items} />;
}
