import { memo, useMemo } from 'react';
import type { EnrichedIntelligenceHit } from '@/lib/intelligenceTemporal';
import IntelligenceSearchHitRow from './IntelligenceSearchHitRow';

type Props = {
  groups: Array<{ bucket: string; label: string; hits: EnrichedIntelligenceHit[] }>;
  indexByHitId: Map<string, number>;
  activeIndex: number;
  onHoverIndex: (index: number) => void;
  onOpen: (hit: EnrichedIntelligenceHit) => void;
  onExpand: (hit: EnrichedIntelligenceHit, index: number) => void;
  onPrefetch: (hit: EnrichedIntelligenceHit) => void;
};

function IntelligenceVirtualResults({
  groups,
  indexByHitId,
  activeIndex,
  onHoverIndex,
  onOpen,
  onExpand,
  onPrefetch,
}: Props) {
  const sections = useMemo(() => groups, [groups]);

  return (
    <div className="intel-search-time-groups">
      {sections.map((group) => (
        <section key={group.bucket} className="intel-search-time-section">
          <div className="intel-search-group-label">{group.label}</div>
          {group.hits.map((hit) => {
            const idx = indexByHitId.get(hit.id) ?? 0;
            return (
              <IntelligenceSearchHitRow
                key={hit.id}
                hit={hit}
                active={idx === activeIndex}
                onHover={() => onHoverIndex(idx)}
                onOpen={() => onOpen(hit)}
                onExpand={() => onExpand(hit, idx)}
                onPrefetch={() => onPrefetch(hit)}
              />
            );
          })}
        </section>
      ))}
    </div>
  );
}

export default memo(IntelligenceVirtualResults);
