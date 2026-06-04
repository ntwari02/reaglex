import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { liveCommerceApi } from '../../services/liveCommerceApi';
import LiveStatusPill from './LiveStatusPill';

/** Contextual “Watch live” entry on product pages when a session is live. */
export default function LiveProductTeaser({ sellerId }) {
  const { data } = useQuery({
    queryKey: ['live-commerce', 'discover', 'product', sellerId],
    queryFn: () => liveCommerceApi.discover(12),
    enabled: Boolean(sellerId),
    staleTime: 45_000,
  });

  if (!data?.enabled || !data?.sessions?.length) return null;

  const match =
    data.sessions.find((s) => s.sellerId === String(sellerId) && s.status === 'live') ||
    data.sessions.find((s) => s.sellerId === String(sellerId));

  if (!match) return null;

  return (
    <Link to={`/live/${match.id}`} className="live-product-banner">
      <span className="inline-flex items-center gap-1.5">
        <Radio size={14} style={{ color: 'var(--brand-primary)' }} />
        Watch live demo
      </span>
      <LiveStatusPill status={match.status} compact />
    </Link>
  );
}
