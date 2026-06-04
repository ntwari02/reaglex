import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import LiveSessionCard from '../components/live/LiveSessionCard';
import { liveCommerceApi } from '../services/liveCommerceApi';
import '../styles/live-commerce.css';

export default function LiveDiscover() {
  const { data, isPending } = useQuery({
    queryKey: ['live-commerce', 'discover', 'all'],
    queryFn: () => liveCommerceApi.discover(24),
  });

  const sessions = data?.sessions ?? [];
  const disabled = data?.enabled === false;

  return (
    <BuyerLayout>
      <div className="live-viewer-page">
        <header className="live-viewer-top">
          <Link to="/" className="ex-back" aria-label="Back">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="ex-page-title" style={{ textAlign: 'left', fontSize: 16 }}>
            Live now
          </h1>
        </header>

        {disabled ? (
          <p className="ex-empty" style={{ padding: 24 }}>
            Live commerce is temporarily unavailable.
          </p>
        ) : (
          <div className="live-discover-grid">
            {isPending
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="live-card live-card--skel" />
                ))
              : sessions.map((s) => (
                  <LiveSessionCard key={s.id} session={s} />
                ))}
            {!isPending && !sessions.length && (
              <p className="ex-empty" style={{ gridColumn: '1 / -1' }}>
                No live sessions right now. Follow sellers to get notified.
              </p>
            )}
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}
