import { memo } from 'react';
import { Clock, X } from 'lucide-react';
import type { RecentIntelligenceView } from '@/lib/intelligenceTemporal';
import { formatRelativeTime } from '@/lib/intelligenceTemporal';

type Props = {
  items: RecentIntelligenceView[];
  onOpen: (item: RecentIntelligenceView) => void;
  onClear: () => void;
};

function IntelligenceRecentSection({ items, onOpen, onClear }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="intel-recent-section">
      <div className="intel-search-group-label">
        <Clock className="w-3.5 h-3.5" />
        Recent
        <button type="button" className="intel-recent-clear" onClick={onClear} aria-label="Clear recent">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="intel-recent-grid">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="intel-recent-card"
            onClick={() => onOpen(item)}
          >
            <span className="intel-recent-card-title">{item.title}</span>
            <span className="intel-recent-card-sub">{item.subtitle}</span>
            <span className="intel-recent-card-meta">
              {item.moduleLabel} · {formatRelativeTime(item.viewedAt)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default memo(IntelligenceRecentSection);
