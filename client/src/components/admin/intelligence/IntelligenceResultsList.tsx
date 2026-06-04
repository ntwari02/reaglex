import { memo } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import type { EnrichedIntelligenceHit } from '@/lib/intelligenceTemporal';
import IntelligenceSearchHitRow from './IntelligenceSearchHitRow';

type TimeGroup = {
  bucket: string;
  label: string;
  hits: EnrichedIntelligenceHit[];
};

type Props = {
  groups: TimeGroup[];
  activeIndex: number;
  globalHitIndex: (hit: EnrichedIntelligenceHit) => number;
  onHover: (index: number) => void;
  onOpen: (hit: EnrichedIntelligenceHit) => void;
  onExpand: (hit: EnrichedIntelligenceHit, index: number) => void;
  hasMore: boolean;
  hiddenCount: number;
  loadingMore: boolean;
  onLoadMore: () => void;
};

function IntelligenceResultsListInner({
  groups,
  activeIndex,
  globalHitIndex,
  onHover,
  onOpen,
  onExpand,
  hasMore,
  hiddenCount,
  loadingMore,
  onLoadMore,
}: Props) {
  return (
    <div className="intel-search-time-groups">
      {groups.map((group) => (
        <section key={group.bucket} className="intel-search-time-section">
          <div className="intel-search-group-label">{group.label}</div>
          {group.hits.map((hit) => {
            const idx = globalHitIndex(hit);
            return (
              <IntelligenceSearchHitRow
                key={hit.id}
                hit={hit}
                active={idx === activeIndex}
                onHover={() => onHover(idx)}
                onOpen={() => onOpen(hit)}
                onExpand={() => onExpand(hit, idx)}
              />
            );
          })}
        </section>
      ))}

      {hasMore && (
        <button type="button" className="intel-search-load-more" onClick={onLoadMore} disabled={loadingMore}>
          {loadingMore ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading more matches…
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show {hiddenCount} more
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default memo(IntelligenceResultsListInner);
