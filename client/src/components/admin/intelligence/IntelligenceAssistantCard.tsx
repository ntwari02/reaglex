import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import type {
  IntelligenceAssistantBrief,
  IntelligenceAssistantAction,
} from '@/services/adminIntelligenceSearchApi';

const CONFIDENCE_CLASS: Record<string, string> = {
  high: 'intel-assistant-conf--high',
  medium: 'intel-assistant-conf--medium',
  low: 'intel-assistant-conf--low',
};

export function IntelligenceAssistantCard({
  brief,
  loading,
  onAction,
  onAltQuery,
}: {
  brief: IntelligenceAssistantBrief;
  loading?: boolean;
  onAction: (action: IntelligenceAssistantAction) => void;
  onAltQuery: (q: string) => void;
}) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAction = (action: IntelligenceAssistantAction) => {
    if (action.kind === 'expand' && action.sectionId) {
      toggleSection(action.sectionId);
      return;
    }
    onAction(action);
  };

  return (
    <div className={`intel-assistant-card${brief.mode === 'gemini' ? ' intel-assistant-card--ai' : ''}`}>
      <div className="intel-assistant-card-head">
        <div className="intel-assistant-card-titles">
          {brief.mode === 'gemini' && <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />}
          <h3 className="intel-assistant-title">{loading ? 'Searching…' : brief.title}</h3>
        </div>
        <span className={`intel-assistant-conf ${CONFIDENCE_CLASS[brief.confidence] || ''}`}>
          {brief.confidenceLabel}
        </span>
      </div>

      <p className="intel-assistant-summary">{loading ? 'Pulling registry matches…' : brief.summary}</p>

      {!loading && (
        <div className="intel-assistant-action-row">
          <span className="intel-assistant-action-label">Suggested action</span>
          <p className="intel-assistant-action-text">{brief.suggestedAction}</p>
        </div>
      )}

      {brief.relatedInfo.length > 0 && !loading && (
        <div className="intel-assistant-related">
          {brief.relatedInfo.map((r) => (
            <div key={r.label} className="intel-assistant-related-chip">
              <span className="intel-assistant-related-label">{r.label}</span>
              <span className="intel-assistant-related-hint">{r.hint}</span>
            </div>
          ))}
        </div>
      )}

      {brief.actions.length > 0 && !loading && (
        <div className="intel-assistant-buttons">
          {brief.actions.map((a) => (
            <button
              key={a.id}
              type="button"
              className="intel-assistant-btn"
              onClick={() => handleAction(a)}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      {brief.alternativeQueries.length > 0 && !loading && (
        <div className="intel-assistant-alts">
          {brief.alternativeQueries.map((alt) => (
            <button key={alt} type="button" className="intel-search-ai-alt-chip" onClick={() => onAltQuery(alt)}>
              {alt}
            </button>
          ))}
        </div>
      )}

      {brief.expandableSections.length > 0 && !loading && (
        <div className="intel-assistant-sections">
          {brief.expandableSections.map((sec) => {
            const isOpen = openSections.has(sec.id);
            return (
              <div key={sec.id} className="intel-assistant-section">
                <button
                  type="button"
                  className="intel-assistant-section-head"
                  onClick={() => toggleSection(sec.id)}
                >
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span className="font-semibold text-white/85">{sec.title}</span>
                  <span className="text-white/35 text-xs ml-auto truncate max-w-[50%]">{sec.preview}</span>
                </button>
                {isOpen && (
                  <div className="intel-assistant-section-body">
                    {sec.items.map((item, i) => (
                      <div key={`${item.label}-${i}`} className="intel-assistant-section-item">
                        <span className="intel-assistant-section-item-label">{item.label}</span>
                        {item.href ? (
                          <button
                            type="button"
                            className="intel-assistant-section-item-link"
                            onClick={() => onAction({ id: `link-${i}`, label: item.label, kind: 'navigate', href: item.href })}
                          >
                            {item.value}
                          </button>
                        ) : (
                          <span className="intel-assistant-section-item-value">{item.value}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
