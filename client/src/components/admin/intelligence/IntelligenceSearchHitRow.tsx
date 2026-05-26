import { memo, useRef } from 'react';
import {
  AlertTriangle,
  Box,
  CreditCard,
  Crown,
  LifeBuoy,
  Package,
  Search,
  Store,
  Truck,
  User,
} from 'lucide-react';
import type { EnrichedIntelligenceHit } from '@/lib/intelligenceTemporal';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  user: User,
  seller: Store,
  order: Package,
  payment: CreditCard,
  product: Box,
  vehicle: Truck,
  support: LifeBuoy,
  dispute: AlertTriangle,
  subscription: Crown,
};

function iconFor(entityType: string) {
  if (entityType === 'payment') return CreditCard;
  if (entityType === 'user') return User;
  if (entityType === 'seller') return Store;
  if (entityType === 'order') return Package;
  if (entityType === 'dispute') return AlertTriangle;
  return ICONS[entityType] || Search;
}

type Props = {
  hit: EnrichedIntelligenceHit;
  active: boolean;
  onHover: () => void;
  onOpen: () => void;
  onExpand?: () => void;
  onPrefetch?: () => void;
};

function IntelligenceSearchHitRow({ hit, active, onHover, onOpen, onExpand, onPrefetch }: Props) {
  const Icon = iconFor(hit.entityType);
  const prefetched = useRef(false);

  const handleEnter = () => {
    onHover();
    if (!prefetched.current && onPrefetch) {
      prefetched.current = true;
      onPrefetch();
    }
  };

  return (
    <button
      type="button"
      className={`intel-op-card${active ? ' is-active' : ''}${hit.isUnresolved ? ' is-unresolved' : ''}`}
      onMouseEnter={handleEnter}
      onFocus={handleEnter}
      onClick={onOpen}
      onDoubleClick={(e) => {
        e.preventDefault();
        onExpand?.();
      }}
    >
      <div className={`intel-op-card-icon${hit.isLive ? ' is-live' : ''}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="intel-op-card-body">
        <div className="intel-op-card-top">
          <span className="intel-op-card-title">{hit.title}</span>
          {hit.relativeTime && (
            <time className="intel-op-card-time" dateTime={new Date(hit.lastActivityAt).toISOString()}>
              {hit.relativeTime}
            </time>
          )}
        </div>
        <p className="intel-op-card-sub">{hit.subtitle}</p>
        <div className="intel-op-card-footer">
          {hit.status && (
            <span className={`intel-search-badge intel-search-badge--${hit.statusTone || 'info'}`}>
              {hit.status}
            </span>
          )}
          {hit.isLive && <span className="intel-search-live-pill">Live</span>}
          {hit.isUnresolved && !hit.isLive && <span className="intel-search-open-pill">Open</span>}
          <span className="intel-op-card-hint">{hit.activityLabel}</span>
          <span className="intel-search-module">{hit.moduleLabel}</span>
        </div>
      </div>
    </button>
  );
}

export default memo(IntelligenceSearchHitRow);
