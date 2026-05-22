import { useQuery } from '@tanstack/react-query';
import { liveCommerceApi } from '../../services/liveCommerceApi';
import MobileSectionHeader from '../home/mobile/MobileSectionHeader';
import LiveSessionCard from './LiveSessionCard';
import '../../styles/live-commerce.css';

export default function TrendingLiveRail() {
  const { data, isPending } = useQuery({
    queryKey: ['live-commerce', 'discover'],
    queryFn: () => liveCommerceApi.discover(8),
    staleTime: 60_000,
  });

  if (data && data.enabled === false) return null;

  const sessions = data?.sessions ?? [];

  if (!isPending && !sessions.length) return null;

  return (
    <section className="mob-section live-rail-section" aria-labelledby="trending-live">
      <MobileSectionHeader
        id="trending-live"
        title="Trending Live Now"
        subtitle="Realtime showcases & auctions"
        href="/live"
        linkLabel="See all"
      />
      <div className="live-rail-scroll">
        {isPending
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="live-card live-card--compact live-card--skel" />
            ))
          : sessions.map((s) => (
              <LiveSessionCard key={s.id} session={s} compact />
            ))}
      </div>
    </section>
  );
}
