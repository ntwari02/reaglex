import { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, Loader2, X } from 'lucide-react';
import type { IntelligenceEntityPreview, IntelligenceSearchHit } from '@/services/adminIntelligenceSearchApi';
import type { EnrichedIntelligenceHit } from '@/lib/intelligenceTemporal';
import IntelligenceTimeline from './IntelligenceTimeline';

type Props = {
  open: boolean;
  hit: EnrichedIntelligenceHit | IntelligenceSearchHit | null;
  preview: IntelligenceEntityPreview | null;
  loading: boolean;
  onClose: () => void;
  onOpenWorkspace: () => void;
  onNavigate: (href: string) => void;
};

function IntelligenceDetailPopup({
  open,
  hit,
  preview,
  loading,
  onClose,
  onOpenWorkspace,
  onNavigate,
}: Props) {
  return (
    <AnimatePresence>
      {open && hit && (
        <motion.div
          className="intel-detail-popup-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="intel-detail-popup"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Entity dossier"
          >
            <header className="intel-detail-popup-head">
              <div className="min-w-0">
                <h2 className="intel-detail-popup-title">{preview?.title || hit.title}</h2>
                <p className="intel-detail-popup-sub">{preview?.subtitle || hit.subtitle}</p>
              </div>
              <button type="button" className="intel-detail-popup-close" onClick={onClose} aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </header>

            {loading && (
              <div className="intel-detail-popup-loading">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading operational dossier…
              </div>
            )}

            {!loading && preview && (
              <div className="intel-detail-popup-body">
                {preview.status && (
                  <span className={`intel-search-badge intel-search-badge--${preview.statusTone || 'info'}`}>
                    {preview.status}
                  </span>
                )}

                <div className="intel-detail-popup-grid">
                  {preview.fields.map((f) => (
                    <div key={f.label} className="intel-search-field">
                      <span className="intel-search-field-label">{f.label}</span>
                      <span className="intel-search-field-value">{f.value}</span>
                    </div>
                  ))}
                </div>

                {preview.timeline && preview.timeline.length > 0 && (
                  <section className="intel-detail-popup-section">
                    <h3 className="intel-detail-popup-section-title">Operational timeline</h3>
                    <IntelligenceTimeline entries={preview.timeline} />
                  </section>
                )}

                {preview.connectedRecords && preview.connectedRecords.length > 0 && (
                  <section className="intel-detail-popup-section">
                    <h3 className="intel-detail-popup-section-title">Linked records</h3>
                    <div className="intel-detail-linked">
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
                  </section>
                )}

                <div className="intel-search-actions">
                  <button
                    type="button"
                    className="intel-search-action intel-search-action--primary"
                    onClick={onOpenWorkspace}
                  >
                    <ExternalLink className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                    Open workspace
                  </button>
                  {preview.actions.map((a) => (
                    <button
                      key={a.href}
                      type="button"
                      className={`intel-search-action${a.primary ? ' intel-search-action--primary' : ''}`}
                      onClick={() => onNavigate(a.href)}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(IntelligenceDetailPopup);
