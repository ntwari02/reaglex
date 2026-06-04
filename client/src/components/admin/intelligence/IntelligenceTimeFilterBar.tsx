import { memo } from 'react';
import type { TimeFilterId } from '@/lib/intelligenceTemporal';
import { TIME_FILTER_OPTIONS } from '@/lib/intelligenceTemporal';

type Props = {
  value: TimeFilterId;
  onChange: (id: TimeFilterId) => void;
  resultCount?: number;
};

function IntelligenceTimeFilterBar({ value, onChange, resultCount }: Props) {
  return (
    <div className="intel-time-filters">
      <span className="intel-time-filters-label">Time</span>
      <div className="intel-time-filters-chips" role="tablist" aria-label="Time filters">
        {TIME_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={value === opt.id}
            className={`intel-time-filter-chip${value === opt.id ? ' is-active' : ''}`}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {typeof resultCount === 'number' && (
        <span className="intel-time-filters-count">{resultCount} shown</span>
      )}
    </div>
  );
}

export default memo(IntelligenceTimeFilterBar);
