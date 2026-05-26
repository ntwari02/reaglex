import { memo } from 'react';

function IntelligencePreviewSkeleton() {
  return (
    <div className="intel-preview-skeleton" aria-hidden>
      <div className="intel-preview-skeleton-title" />
      <div className="intel-preview-skeleton-sub" />
      <div className="intel-preview-skeleton-badge" />
      <div className="intel-preview-skeleton-fields">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="intel-preview-skeleton-row">
            <span className="intel-preview-skeleton-label" />
            <span className="intel-preview-skeleton-value" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(IntelligencePreviewSkeleton);
