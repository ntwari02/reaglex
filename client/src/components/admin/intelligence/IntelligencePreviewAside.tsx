import { memo } from 'react';
import { Expand } from 'lucide-react';
import type { IntelligenceEntityPreview, IntelligenceSearchHit } from '@/services/adminIntelligenceSearchApi';
import type { EnrichedIntelligenceHit } from '@/lib/intelligenceTemporal';
import IntelligencePreviewSkeleton from './IntelligencePreviewSkeleton';
import IntelligenceTimeline from './IntelligenceTimeline';

type Props = {
  activeHit: EnrichedIntelligenceHit | IntelligenceSearchHit | null;
  preview: IntelligenceEntityPreview | null;
  loading: boolean;
  loadingFull: boolean;
  fieldsExpanded: boolean;
  relatedExpanded: boolean;
  onToggleFields: () => void;
  onToggleRelated: () => void;
  onOpenWorkspace: () => void;
  onExpandPopup: () => void;
  onNavigate: (href: string) => void;
};

function IntelligencePreviewAside({
  activeHit,
  preview,
  loading,
  loadingFull,
  fieldsExpanded,
  relatedExpanded,
  onToggleFields,
  onToggleRelated,
  onOpenWorkspace,
  onExpandPopup,
  onNavigate,
}: Props) {
  const enriched = activeHit && 'relativeTime' in activeHit ? (activeHit as EnrichedIntelligenceHit) : null;

  return (
    <aside className="intel-search-preview">
      {loading && !preview?.fields?.length && <IntelligencePreviewSkeleton />}

      {!loading && preview && (
        <>
          <div className="intel-preview-head">
            <div className="min-w-0">
              <p className="intel-search-preview-title">{preview.title}</p>
              <p className="intel-search-preview-sub">{preview.subtitle}</p>
            </div>
            <button type="button" className="intel-preview-expand" onClick={onExpandPopup} title="Expand dossier">
              <Expand className="w-4 h-4" />
            </button>
          </div>

          {preview.status && (
            <span className={`intel-search-badge intel-search-badge--${preview.statusTone || 'info'} mt-3 inline-block`}>
              {preview.status}
            </span>
          )}

          {enriched && (
            <p className="intel-search-preview-time mt-2">
              {enriched.activityLabel}
              {enriched.relativeTime ? ` · ${enriched.relativeTime}` : ''}
            </p>
          )}

          <div className="mt-4 space-y-0">
            {(fieldsExpanded ? preview.fields : preview.fields.slice(0, 4)).map((f) => (
              <div key={f.label} className="intel-search-field">
                <span className="intel-search-field-label">{f.label}</span>
                <span className="intel-search-field-value">{f.value}</span>
              </div>
            ))}
            {preview.fields.length > 4 && (
              <button type="button" className="intel-search-more-toggle w-full mt-2" onClick={onToggleFields}>
                {fieldsExpanded ? 'Less details' : 'More details'}
              </button>
            )}
          </div>

          {relatedExpanded && loadingFull && (
            <div className="intel-preview-loading-hint">Loading investigation data…</div>
          )}

          {relatedExpanded && preview.timeline && preview.timeline.length > 0 && (
            <div className="mt-5">
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-white/30 mb-2">Timeline</p>
              <IntelligenceTimeline entries={preview.timeline.slice(0, 6)} compact />
            </div>
          )}

          {preview.connectedRecords && preview.connectedRecords.length > 0 && (
            <div className="mt-5">
              <button type="button" className="intel-search-more-toggle mb-2" onClick={onToggleRelated}>
                {relatedExpanded ? 'Hide linked records' : 'Linked records'}
              </button>
              {relatedExpanded && (
                <div className="intel-detail-linked max-h-40 overflow-y-auto">
                  {preview.connectedRecords.map((c) => (
                    <button
                      key={`${c.entityType}-${c.entityId}`}
                      type="button"
                      className="intel-search-rel w-full text-left"
                      onClick={() => onNavigate(c.href)}
                    >
                      <span className="block font-semibold text-white/90">{c.title}</span>
                      <span className="block text-[0.7rem] text-white/45 truncate">{c.subtitle}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {preview.relationships.length > 0 && (
            <div className="mt-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-white/30 mb-2">Counts</p>
              {preview.relationships.slice(0, 4).map((r) => (
                <button
                  key={r.label}
                  type="button"
                  className="intel-search-rel w-full"
                  onClick={() => onNavigate(r.href)}
                >
                  <span>{r.label}</span>
                  <span>{r.count}</span>
                </button>
              ))}
            </div>
          )}

          <div className="intel-search-actions">
            <button
              type="button"
              className="intel-search-action intel-search-action--primary"
              onClick={onOpenWorkspace}
            >
              Open workspace →
            </button>
            {preview.actions
              .filter((a) => !a.primary)
              .slice(0, 2)
              .map((a) => (
                <button
                  key={a.href}
                  type="button"
                  className="intel-search-action"
                  onClick={() => onNavigate(a.href)}
                >
                  {a.label}
                </button>
              ))}
          </div>
        </>
      )}

      {!loading && !preview && !activeHit && (
        <div className="intel-search-empty text-sm py-12">Select a result — preview loads progressively</div>
      )}
    </aside>
  );
}

export default memo(IntelligencePreviewAside);
