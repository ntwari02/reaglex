import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Box,
  Command,
  CreditCard,
  Crown,
  LifeBuoy,
  Loader2,
  Package,
  Search,
  Store,
  Truck,
  User,
  X,
} from 'lucide-react';
import {
  adminIntelligenceSearchApi,
  type IntelligenceEntityPreview,
  type IntelligenceSearchHit,
  type IntelligenceSearchResponse,
} from '@/services/adminIntelligenceSearchApi';
import { useAdminIntelligenceSearchStore } from '@/stores/adminIntelligenceSearchStore';
import '@/styles/admin-intelligence-search.css';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  user: User,
  store: Store,
  package: Package,
  'credit-card': CreditCard,
  box: Box,
  truck: Truck,
  'life-buoy': LifeBuoy,
  crown: Crown,
};

function HitIcon({ name }: { name: string }) {
  const Icon = ICONS[name] || Search;
  return <Icon className="w-4 h-4" />;
}

function flatHits(groups: IntelligenceSearchResponse['groups']): IntelligenceSearchHit[] {
  return groups.flatMap((g) => g.hits);
}

export default function AdminIntelligenceSearch() {
  const open = useAdminIntelligenceSearchStore((s) => s.open);
  const setOpen = useAdminIntelligenceSearchStore((s) => s.setOpen);
  const liveConnected = useAdminIntelligenceSearchStore((s) => s.liveConnected);
  const livePulses = useAdminIntelligenceSearchStore((s) => s.livePulses);
  const navigate = useNavigate();

  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<IntelligenceSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [preview, setPreview] = useState<IntelligenceEntityPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const hits = useMemo(() => flatHits(result?.groups || []), [result]);
  const activeHit = hits[activeIndex] || null;

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResult(null);
    setPreview(null);
    setActiveIndex(0);
  }, [setOpen]);

  const openHit = useCallback(
    (hit: IntelligenceSearchHit) => {
      close();
      navigate(hit.deepLink);
    },
    [close, navigate],
  );

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close, setOpen]);

  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResult(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      adminIntelligenceSearchApi
        .search(query.trim())
        .then((res) => {
          setResult(res);
          setActiveIndex(0);
        })
        .catch(() => setResult(null))
        .finally(() => setLoading(false));
    }, 280);
    return () => clearTimeout(debounceRef.current);
  }, [query, open]);

  useEffect(() => {
    if (!activeHit) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    const t = setTimeout(() => {
      adminIntelligenceSearchApi
        .preview(activeHit.entityType, activeHit.entityId)
        .then(setPreview)
        .catch(() => setPreview(null))
        .finally(() => setPreviewLoading(false));
    }, 120);
    return () => clearTimeout(t);
  }, [activeHit?.id]);

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, hits.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeHit) {
      e.preventDefault();
      openHit(activeHit);
    }
  };

  let flatIdx = -1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="intel-search-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={close}
        >
          <motion.div
            className="intel-search-shell"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Platform intelligence search"
          >
            <motion.div className="intel-search-input-row" layout>
              <Command className="w-5 h-5 text-emerald-400/80 shrink-0" />
              <input
                ref={inputRef}
                className="intel-search-input"
                placeholder="Search users, orders, payments, vehicles…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                autoComplete="off"
                spellCheck={false}
              />
              {result?.intentLabel && query.length >= 2 && (
                <span className="intel-search-intent">{result.intentLabel}</span>
              )}
              <button
                type="button"
                onClick={close}
                className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>

            {livePulses.length > 0 && (
              <div className="intel-search-live-strip">
                <span className={`intel-search-live-dot${liveConnected ? ' is-on' : ''}`} />
                <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-white/35 mr-2">
                  Live
                </span>
                {livePulses.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="intel-search-live-chip"
                    onClick={() => {
                      if (p.deepLink) {
                        close();
                        navigate(p.deepLink);
                      }
                    }}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            )}

            <motion.div className="intel-search-body" layout>
              <div className="intel-search-results">
                {loading && (
                  <motion.div
                    className="intel-search-empty flex items-center justify-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-400/70" />
                    Searching platform…
                  </motion.div>
                )}

                {!loading && query.length < 2 && (
                  <div className="intel-search-empty">
                    <p className="text-white/50 mb-2">Platform intelligence</p>
                    <p className="text-xs">Try an email, order ID, payment ref, phone, or seller name.</p>
                  </div>
                )}

                {!loading && query.length >= 2 && hits.length === 0 && (
                  <motion.div
                    className="intel-search-empty"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    No matches for &ldquo;{query}&rdquo;
                  </motion.div>
                )}

                {!loading &&
                  result?.groups.map((group) => (
                    <motion.div
                      key={group.entityType}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.div className="intel-search-group-label" layout="position">
                        <HitIcon name={group.icon} />
                        {group.label}
                      </motion.div>
                      {group.hits.map((hit) => {
                        flatIdx += 1;
                        const idx = flatIdx;
                        return (
                          <motion.button
                            key={hit.id}
                            type="button"
                            className={`intel-search-hit${idx === activeIndex ? ' is-active' : ''}`}
                            onMouseEnter={() => setActiveIndex(idx)}
                            onClick={() => openHit(hit)}
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.02, duration: 0.18 }}
                          >
                            <div className="intel-search-hit-icon">
                              <HitIcon name={group.icon} />
                            </div>
                            <div className="intel-search-hit-main">
                              <motion.div className="intel-search-hit-title">{hit.title}</motion.div>
                              <motion.div className="intel-search-hit-sub" layout="position">
                                {hit.subtitle}
                              </motion.div>
                              <div className="intel-search-hit-meta">
                                {hit.status && (
                                  <span className={`intel-search-badge intel-search-badge--${hit.statusTone || 'info'}`}>
                                    {hit.status}
                                  </span>
                                )}
                                <span className="intel-search-module">{hit.moduleLabel}</span>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  ))}
              </div>

              <aside className="intel-search-preview">
                {previewLoading && (
                  <div className="flex items-center gap-2 text-white/40 text-sm py-8 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading context…
                  </div>
                )}
                {!previewLoading && !preview && activeHit && (
                  <motion.div className="py-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <p className="intel-search-preview-title">{activeHit.title}</p>
                    <p className="intel-search-preview-sub">{activeHit.subtitle}</p>
                    <div className="intel-search-actions mt-4">
                      <button
                        type="button"
                        className="intel-search-action intel-search-action--primary"
                        onClick={() => openHit(activeHit)}
                      >
                        Open {activeHit.moduleLabel}
                      </button>
                    </div>
                  </motion.div>
                )}
                {!previewLoading && preview && (
                  <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                    <p className="intel-search-preview-title">{preview.title}</p>
                    <p className="intel-search-preview-sub">{preview.subtitle}</p>
                    {preview.status && (
                      <span className={`intel-search-badge intel-search-badge--${preview.statusTone || 'info'} mt-3 inline-block`}>
                        {preview.status}
                      </span>
                    )}
                    <div className="mt-5 space-y-0">
                      {preview.fields.map((f) => (
                        <div key={f.label} className="intel-search-field">
                          <span className="intel-search-field-label">{f.label}</span>
                          <span className="intel-search-field-value">{f.value}</span>
                        </div>
                      ))}
                    </div>
                    {preview.relationships.length > 0 && (
                      <div className="mt-5">
                        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-white/30 mb-2">Related</p>
                        {preview.relationships.map((r) => (
                          <a key={r.label} href={r.href} className="intel-search-rel" onClick={(e) => { e.preventDefault(); close(); navigate(r.href); }}>
                            <span>{r.label}</span>
                            <span>{r.count}</span>
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="intel-search-actions">
                      {preview.actions.map((a) => (
                        <button
                          key={a.href}
                          type="button"
                          className={`intel-search-action${a.primary ? ' intel-search-action--primary' : ''}`}
                          onClick={() => { close(); navigate(a.href); }}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
                {!previewLoading && !preview && !activeHit && (
                  <div className="intel-search-empty text-sm py-12">Select a result to preview connections</div>
                )}
              </aside>
            </motion.div>

            <div className="intel-search-footer">
              <span>
                {result ? (
                  <>
                    {result.total} results · {result.tookMs}ms · {result.engine}
                    {result.cached ? ' · cached' : ''}
                    {liveConnected ? ' · live' : ''}
                  </>
                ) : (
                  <>Intelligence search{liveConnected ? ' · live' : ''}</>
                )}
              </span>
              <span className="flex gap-3">
                <span>
                  <span className="intel-search-kbd">↑↓</span> navigate
                </span>
                <span>
                  <span className="intel-search-kbd">↵</span> open
                </span>
                <span>
                  <span className="intel-search-kbd">esc</span> close
                </span>
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
