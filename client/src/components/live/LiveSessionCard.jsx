import { Link } from 'react-router-dom';
import { Users, Shield } from 'lucide-react';
import LiveStatusPill from './LiveStatusPill';

export default function LiveSessionCard({ session, compact = false }) {
  const thumb =
    session.thumbnailUrl ||
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';

  return (
    <Link
      to={`/live/${session.id}`}
      className={`live-card${compact ? ' live-card--compact' : ''}`}
    >
      <div className="live-card-media">
        <img src={thumb} alt="" loading="lazy" />
        <LiveStatusPill status={session.status} mode={session.mode} compact />
        {session.escrowProtected && (
          <span className="live-escrow-badge">
            <Shield size={10} />
            Escrow
          </span>
        )}
      </div>
      <div className="live-card-body">
        <p className="live-card-seller">{session.seller?.name || 'Verified seller'}</p>
        <h3 className="live-card-title">{session.title}</h3>
        {session.mode === 'auction' && (
          <p className="live-card-meta">
            High bid · ${Number(session.highestBid || 0).toFixed(0)}
          </p>
        )}
        <div className="live-card-foot">
          <span className="live-card-viewers">
            <Users size={11} />
            {session.viewerCount || 0}
          </span>
          <span className="live-card-cta">Join</span>
        </div>
      </div>
    </Link>
  );
}
