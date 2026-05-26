import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Box,
  Command,
  CreditCard,
  Crown,
  LifeBuoy,
  Loader2,
  Package,
  Search,
  Shield,
  Sparkles,
  Store,
  Truck,
  User,
  X,
} from 'lucide-react';
import {
  adminIntelligenceSearchApi,
  type IntelligenceAssistantAction,
  type IntelligenceAssistantBrief,
  type IntelligenceEntityPreview,
  type IntelligenceSearchHit,
  type IntelligenceSearchResponse,
} from '@/services/adminIntelligenceSearchApi';
import { explainQueryLocally, EXAMPLE_QUERIES } from '@/lib/intelligenceQueryHints';
import { buildLocalTypingBrief } from '@/lib/intelligenceAssistantLocal';
import { IntelligenceAssistantCard } from '@/components/admin/intelligence/IntelligenceAssistantCard';
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
  alert: AlertTriangle,
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
  const abortRef = useRef<AbortController | null>(null);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<IntelligenceSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [preview, setPreview] = useState<IntelligenceEntityPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [aiConfig, setAiConfig] = useState<{
    geminiConfigured: boolean;
    userAiAssistEnabled: boolean;
    aiAvailable: boolean;
  } | null>(null);
  const [aiToggling, setAiToggling] = useState(false);
  const [aiTypingHint, setAiTypingHint] = useState<string | null>(null);
  const [typingBrief, setTypingBrief] = useState<IntelligenceAssistantBrief | null>(null);
  const [showMoreResults, setShowMoreResults] = useState(false);
  const [previewFieldsExpanded, setPreviewFieldsExpanded] = useState(false);
  const [previewRelatedExpanded, setPreviewRelatedExpanded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const suggestAbortRef = useRef<AbortController | null>(null);

  const localUnderstanding = useMemo(() => explainQueryLocally(query), [query]);

  const activeBrief = useMemo((): IntelligenceAssistantBrief | null => {
    if (result?.assistant) return result.assistant;
    if (query.trim().length >= 2) {
      return (
        typingBrief ||
        buildLocalTypingBrief(query, localUnderstanding, aiTypingHint)
      );
    }
    return null;
  }, [result?.assistant, query, typingBrief, localUnderstanding, aiTypingHint]);

  const hits = useMemo(() => {
    if (!result) return [];
    const top = result.assistant?.topResults?.length
      ? result.assistant.topResults
      : flatHits(result.groups).slice(0, 3);
    const topIds = new Set(top.map((h) => h.id));
    const rest = flatHits(result.groups).filter((h) => !topIds.has(h.id));
    return [...top, ...rest];
  }, [result]);

  const moreHits = useMemo(() => {
    if (!result?.assistant?.topResults?.length) return hits.slice(3);
    return hits.slice(result.assistant.topResults.length);
  }, [hits, result?.assistant?.topResults]);

  const activeHit = hits[activeIndex] || null;

  const close = useCallback(() => {
    abortRef.current?.abort();
    setOpen(false);
    setQuery('');
    setResult(null);
    setPreview(null);
    setError(null);
    setActiveIndex(0);
    setTypingBrief(null);
    setShowMoreResults(false);
    setPreviewFieldsExpanded(false);
    setPreviewRelatedExpanded(false);
  }, [setOpen]);

  const handleAssistantAction = useCallback(
    (action: IntelligenceAssistantAction) => {
      if (action.kind === 'navigate' && action.href) {
        close();
        navigate(action.href);
        return;
      }
      if (action.kind === 'search' || action.kind === 'deep_search') {
        if (action.query) setQuery(action.query);
        return;
      }
    },
    [close, navigate],
  );

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
      adminIntelligenceSearchApi
        .getConfig()
        .then(setAiConfig)
        .catch(() => setAiConfig(null));
    }
  }, [open]);

  const toggleAiAssist = async () => {
    if (!aiConfig?.geminiConfigured || aiToggling) return;
    setAiToggling(true);
    try {
      const next = !aiConfig.userAiAssistEnabled;
      const cfg = await adminIntelligenceSearchApi.setAiAssist(next);
      setAiConfig(cfg);
    } catch {
      /* keep previous */
    } finally {
      setAiToggling(false);
    }
  };

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
    abortRef.current?.abort();

    if (query.trim().length < 2) {
      setResult(null);
      setLoading(false);
      setError(null);
      setAiTypingHint(null);
      setTypingBrief(null);
      return;
    }

    if (query.trim().length >= 2) {
      suggestAbortRef.current?.abort();
      const sac = new AbortController();
      suggestAbortRef.current = sac;
      setTypingBrief(buildLocalTypingBrief(query, localUnderstanding, null));
      adminIntelligenceSearchApi
        .suggest(query.trim())
        .then((s) => {
          if (sac.signal.aborted) return;
          setAiTypingHint(s.aiTypingHint || null);
          setTypingBrief(
            s.assistant || buildLocalTypingBrief(query, localUnderstanding, s.aiTypingHint),
          );
        })
        .catch(() => {});
    } else {
      setAiTypingHint(null);
      setTypingBrief(null);
    }

    setLoading(true);
    setError(null);
    debounceRef.current = setTimeout(() => {
      const ac = new AbortController();
      abortRef.current = ac;
      adminIntelligenceSearchApi
        .search(query.trim(), 24, ac.signal)
        .then((res) => {
          if (ac.signal.aborted) return;
          setResult(res);
          setActiveIndex(0);
        })
        .catch((err: unknown) => {
          if (ac.signal.aborted) return;
          setResult(null);
          setError(err instanceof Error ? err.message : 'Search failed');
        })
        .finally(() => {
          if (!ac.signal.aborted) setLoading(false);
        });
    }, 320);
    return () => clearTimeout(debounceRef.current);
  }, [query, open, localUnderstanding]);

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
                placeholder="Phone, email, order, payment, seller name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                autoComplete="off"
                spellCheck={false}
                maxLength={100}
              />
              <button
                type="button"
                onClick={close}
                className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>

            {activeBrief && query.length >= 2 && (
              <IntelligenceAssistantCard
                brief={activeBrief}
                loading={loading}
                onAction={handleAssistantAction}
                onAltQuery={(q) => setQuery(q)}
              />
            )}

            <div className="intel-search-trust-bar">
              <Shield className="w-3.5 h-3.5 text-emerald-400/80" />
              <span>Admin-only · rate-limited · audited</span>
              {aiConfig?.geminiConfigured ? (
                <button
                  type="button"
                  className={`intel-search-ai-toggle${aiConfig.userAiAssistEnabled ? ' is-on' : ''}`}
                  onClick={toggleAiAssist}
                  disabled={aiToggling}
                  title="Gemini helps interpret your search and suggest next steps"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {aiToggling ? 'Saving…' : aiConfig.userAiAssistEnabled ? 'Gemini assist on' : 'Gemini assist off'}
                </button>
              ) : (
                <span className="intel-search-trust-rule">Set GEMINI_API_KEY for AI assist</span>
              )}
            </div>

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
                {loading && query.length >= 2 && (
                  <div className="intel-search-skeleton">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="intel-search-skeleton-row" style={{ animationDelay: `${i * 0.06}s` }} />
                    ))}
                  </div>
                )}

                {error && !loading && (
                  <div className="intel-search-empty text-amber-200/90">
                    <AlertTriangle className="w-5 h-5 mx-auto mb-2 opacity-70" />
                    {error}
                  </div>
                )}

                {!loading && !error && query.length < 2 && (
                  <div className="intel-search-empty">
                    <p className="text-white/60 mb-1 font-semibold">Registry intelligence</p>
                    <p className="text-xs text-white/40 mb-5 max-w-sm mx-auto">
                      One search links buyer, seller, order, payment method, disputes, and support — without loading the whole database at once.
                    </p>
                    <div className="intel-search-examples">
                      {EXAMPLE_QUERIES.map((ex) => (
                        <button
                          key={ex.label}
                          type="button"
                          className="intel-search-example-chip"
                          onClick={() => setQuery(ex.value)}
                        >
                          <span className="font-semibold text-white/80">{ex.label}</span>
                          <span className="text-white/35">{ex.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!loading && !error && query.length >= 2 && hits.length === 0 && (
                  <motion.div className="intel-search-empty" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                    <p>No matches for &ldquo;{query}&rdquo;</p>
                    <p className="text-xs mt-2 text-white/35">Try phone digits, full email, or order number</p>
                  </motion.div>
                )}

                {!loading && !error && hits.length > 0 && (
                  <>
                    <div className="intel-search-group-label">
                      <HitIcon name="package" />
                      Priority matches
                      <span className="text-white/25 font-normal ml-1">
                        ({Math.min(3, hits.length)})
                      </span>
                    </div>
                    {hits.slice(0, 3).map((hit, idx) => (
                      <button
                        key={hit.id}
                        type="button"
                        className={`intel-search-hit${idx === activeIndex ? ' is-active' : ''}`}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => openHit(hit)}
                      >
                        <div className="intel-search-hit-icon">
                          <HitIcon name={hit.entityType === 'payment' ? 'credit-card' : hit.entityType === 'user' ? 'user' : 'package'} />
                        </div>
                        <div className="intel-search-hit-main">
                          <div className="intel-search-hit-title">{hit.title}</div>
                          <div className="intel-search-hit-sub">{hit.subtitle}</div>
                          <div className="intel-search-hit-meta">
                            {hit.status && (
                              <span className={`intel-search-badge intel-search-badge--${hit.statusTone || 'info'}`}>
                                {hit.status}
                              </span>
                            )}
                            <span className="intel-search-module">{hit.moduleLabel}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                    {moreHits.length > 0 && (
                      <>
                        <button
                          type="button"
                          className="intel-search-more-toggle"
                          onClick={() => setShowMoreResults((v) => !v)}
                        >
                          {showMoreResults ? 'Hide' : 'More results'} ({moreHits.length})
                        </button>
                        {showMoreResults &&
                          moreHits.map((hit, i) => {
                            const idx = i + Math.min(3, hits.length);
                            return (
                              <button
                                key={hit.id}
                                type="button"
                                className={`intel-search-hit${idx === activeIndex ? ' is-active' : ''}`}
                                onMouseEnter={() => setActiveIndex(idx)}
                                onClick={() => openHit(hit)}
                              >
                                <div className="intel-search-hit-icon">
                                  <HitIcon name="box" />
                                </div>
                                <div className="intel-search-hit-main">
                                  <div className="intel-search-hit-title">{hit.title}</div>
                                  <div className="intel-search-hit-sub">{hit.subtitle}</div>
                                  <div className="intel-search-hit-meta">
                                    <span className="intel-search-module">{hit.moduleLabel}</span>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                      </>
                    )}
                  </>
                )}
              </div>

              <aside className="intel-search-preview">
                {previewLoading && (
                  <div className="flex items-center gap-2 text-white/40 text-sm py-8 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Building dossier…
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
                  <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}>
                    <p className="intel-search-preview-title">{preview.title}</p>
                    <p className="intel-search-preview-sub">{preview.subtitle}</p>
                    {preview.status && (
                      <span className={`intel-search-badge intel-search-badge--${preview.statusTone || 'info'} mt-3 inline-block`}>
                        {preview.status}
                      </span>
                    )}
                    <div className="mt-5 space-y-0">
                      {(previewFieldsExpanded ? preview.fields : preview.fields.slice(0, 4)).map((f) => (
                        <div key={f.label} className="intel-search-field">
                          <span className="intel-search-field-label">{f.label}</span>
                          <span className="intel-search-field-value">{f.value}</span>
                        </div>
                      ))}
                      {preview.fields.length > 4 && (
                        <button
                          type="button"
                          className="intel-search-more-toggle w-full mt-2"
                          onClick={() => setPreviewFieldsExpanded((v) => !v)}
                        >
                          {previewFieldsExpanded ? 'Less details' : 'More details'}
                        </button>
                      )}
                    </div>
                    {preview.connectedRecords && preview.connectedRecords.length > 0 && (
                      <div className="mt-5">
                        <button
                          type="button"
                          className="intel-search-more-toggle mb-2"
                          onClick={() => setPreviewRelatedExpanded((v) => !v)}
                        >
                          {previewRelatedExpanded ? 'Hide linked records' : 'Related information'}
                        </button>
                        {previewRelatedExpanded && (
                        <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                          {preview.connectedRecords.map((c) => (
                            <button
                              key={`${c.entityType}-${c.entityId}`}
                              type="button"
                              className="intel-search-rel w-full text-left"
                              onClick={() => {
                                close();
                                navigate(c.href);
                              }}
                            >
                              <span className="block font-semibold text-white/90">{c.title}</span>
                              <span className="block text-[0.7rem] text-white/45 truncate">{c.subtitle}</span>
                            </button>
                          ))}
                        </div>
                        )}
                      </div>
                    )}
                    {previewRelatedExpanded && preview.timeline && preview.timeline.length > 0 && (
                      <div className="mt-4">
                        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-white/30 mb-2">Timeline</p>
                        {preview.timeline.map((t, i) => (
                          <div key={i} className="intel-search-field">
                            <span className="intel-search-field-label">{t.label}</span>
                            <span className="intel-search-field-value text-xs">{t.at}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {preview.relationships.length > 0 && (
                      <div className="mt-5">
                        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-white/30 mb-2">Counts</p>
                        {preview.relationships.map((r) => (
                          <a
                            key={r.label}
                            href={r.href}
                            className="intel-search-rel"
                            onClick={(e) => {
                              e.preventDefault();
                              close();
                              navigate(r.href);
                            }}
                          >
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
                          onClick={() => {
                            close();
                            navigate(a.href);
                          }}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
                {!previewLoading && !preview && !activeHit && (
                  <div className="intel-search-empty text-sm py-12">
                    Select a result to see the full dossier
                  </div>
                )}
              </aside>
            </motion.div>

            <div className="intel-search-footer">
              <span>
                {result ? (
                  <>
                    {result.total} results · {result.tookMs}ms
                    {typeof result.graphExpanded === 'number' && result.graphExpanded > 0
                      ? ` · +${result.graphExpanded} linked`
                      : ''}
                    {result.truncated ? ' · capped' : ''}
                    {result.cached ? ' · cached' : ''}
                  </>
                ) : (
                  <>Type to search — graph links only when needed</>
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
