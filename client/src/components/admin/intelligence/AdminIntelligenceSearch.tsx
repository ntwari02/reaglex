import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Command, Shield, Sparkles, X } from 'lucide-react';
import {
  adminIntelligenceSearchApi,
  type IntelligenceAssistantAction,
  type IntelligenceAssistantBrief,
  type IntelligenceSearchHit,
  type IntelligenceSearchResponse,
} from '@/services/adminIntelligenceSearchApi';
import { explainQueryLocally, EXAMPLE_QUERIES } from '@/lib/intelligenceQueryHints';
import { buildLocalTypingBrief } from '@/lib/intelligenceAssistantLocal';
import {
  applyTimeFilter,
  clearRecentViews,
  enrichHit,
  getRecentViews,
  groupHitsByTimeBucket,
  recordRecentView,
  type EnrichedIntelligenceHit,
  type RecentIntelligenceView,
  type TimeFilterId,
} from '@/lib/intelligenceTemporal';
import { clearPreviewCache as clearClientPreviewCache } from '@/lib/intelligencePreviewCache';
import { useIntelligencePreview } from '@/hooks/useIntelligencePreview';
import { IntelligenceAssistantCard } from '@/components/admin/intelligence/IntelligenceAssistantCard';
import IntelligencePreviewAside from '@/components/admin/intelligence/IntelligencePreviewAside';
import IntelligenceRecentSection from '@/components/admin/intelligence/IntelligenceRecentSection';
import IntelligenceTimeFilterBar from '@/components/admin/intelligence/IntelligenceTimeFilterBar';
import IntelligenceVirtualResults from '@/components/admin/intelligence/IntelligenceVirtualResults';
import { useAdminIntelligenceSearchStore } from '@/stores/adminIntelligenceSearchStore';
import '@/styles/admin-intelligence-search.css';

const IntelligenceDetailPopup = lazy(() => import('@/components/admin/intelligence/IntelligenceDetailPopup'));

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
  const suggestAbortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [query, setQuery] = useState('');
  const [result, setResult] = useState<IntelligenceSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [aiConfig, setAiConfig] = useState<{
    geminiConfigured: boolean;
    userAiAssistEnabled: boolean;
    aiAvailable: boolean;
  } | null>(null);
  const [aiToggling, setAiToggling] = useState(false);
  const [aiTypingHint, setAiTypingHint] = useState<string | null>(null);
  const [typingBrief, setTypingBrief] = useState<IntelligenceAssistantBrief | null>(null);
  const [previewFieldsExpanded, setPreviewFieldsExpanded] = useState(false);
  const [previewRelatedExpanded, setPreviewRelatedExpanded] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilterId>('all');
  const [recentViews, setRecentViews] = useState<RecentIntelligenceView[]>([]);
  const [detailPopupOpen, setDetailPopupOpen] = useState(false);

  const localUnderstanding = useMemo(() => explainQueryLocally(query), [query]);

  const activeBrief = useMemo((): IntelligenceAssistantBrief | null => {
    if (result?.assistant) return result.assistant;
    if (query.trim().length >= 2) {
      return typingBrief || buildLocalTypingBrief(query, localUnderstanding, aiTypingHint);
    }
    return null;
  }, [result?.assistant, query, typingBrief, localUnderstanding, aiTypingHint]);

  const rawHits = useMemo(() => {
    if (!result) return [];
    const top = result.assistant?.topResults?.length
      ? result.assistant.topResults
      : flatHits(result.groups).slice(0, 3);
    const topIds = new Set(top.map((h) => h.id));
    const rest = flatHits(result.groups).filter((h) => !topIds.has(h.id));
    return [...top, ...rest];
  }, [result]);

  const hits = useMemo(
    () => applyTimeFilter(rawHits.map(enrichHit), timeFilter),
    [rawHits, timeFilter],
  );

  const indexByHitId = useMemo(() => {
    const m = new Map<string, number>();
    hits.forEach((h, i) => m.set(h.id, i));
    return m;
  }, [hits]);

  const timeGroups = useMemo(() => groupHitsByTimeBucket(hits), [hits]);
  const activeHit = hits[activeIndex] || null;

  const wantFullPreview = detailPopupOpen || previewRelatedExpanded || previewFieldsExpanded;
  const { preview, loading: previewLoading, loadingFull, prefetch } = useIntelligencePreview(activeHit, {
    wantFull: wantFullPreview,
  });

  const close = useCallback(() => {
    abortRef.current?.abort();
    setOpen(false);
    setQuery('');
    setResult(null);
    setError(null);
    setActiveIndex(0);
    setTypingBrief(null);
    setPreviewFieldsExpanded(false);
    setPreviewRelatedExpanded(false);
    setTimeFilter('all');
    setDetailPopupOpen(false);
  }, [setOpen]);

  const navigateAndClose = useCallback(
    (href: string) => {
      close();
      navigate(href);
    },
    [close, navigate],
  );

  const openWorkspace = useCallback(
    (hit: IntelligenceSearchHit) => {
      recordRecentView(hit);
      setRecentViews(getRecentViews());
      navigateAndClose(hit.deepLink);
    },
    [navigateAndClose],
  );

  const openRecent = useCallback(
    (item: RecentIntelligenceView) => {
      navigateAndClose(item.deepLink);
    },
    [navigateAndClose],
  );

  const handleAssistantAction = useCallback(
    (action: IntelligenceAssistantAction) => {
      if (action.kind === 'navigate' && action.href) {
        navigateAndClose(action.href);
        return;
      }
      if (action.kind === 'search' || action.kind === 'deep_search') {
        if (action.query) setQuery(action.query);
      }
    },
    [navigateAndClose],
  );

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => inputRef.current?.focus());
    setRecentViews(getRecentViews());
    adminIntelligenceSearchApi.getConfig().then(setAiConfig).catch(() => setAiConfig(null));
    return () => {
      clearClientPreviewCache();
    };
  }, [open]);

  const toggleAiAssist = async () => {
    if (!aiConfig?.geminiConfigured || aiToggling) return;
    setAiToggling(true);
    try {
      const cfg = await adminIntelligenceSearchApi.setAiAssist(!aiConfig.userAiAssistEnabled);
      setAiConfig(cfg);
    } catch {
      /* keep */
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
      if (e.key === 'Escape') {
        if (detailPopupOpen) setDetailPopupOpen(false);
        else close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close, setOpen, detailPopupOpen]);

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
      setTimeFilter('all');
      return;
    }

    suggestAbortRef.current?.abort();
    const sac = new AbortController();
    suggestAbortRef.current = sac;
    setTypingBrief(buildLocalTypingBrief(query, localUnderstanding, null));
    adminIntelligenceSearchApi
      .suggest(query.trim())
      .then((s) => {
        if (sac.signal.aborted) return;
        setAiTypingHint(s.aiTypingHint || null);
        setTypingBrief(s.assistant || buildLocalTypingBrief(query, localUnderstanding, s.aiTypingHint));
      })
      .catch(() => {});

    setLoading(true);
    setError(null);
    debounceRef.current = setTimeout(() => {
      const ac = new AbortController();
      abortRef.current = ac;
      adminIntelligenceSearchApi
        .search(query.trim(), 24, ac.signal)
        .then((res) => {
          if (ac.signal.aborted) return;
          startTransition(() => {
            setResult(res);
            setActiveIndex(0);
          });
        })
        .catch((err: unknown) => {
          if (ac.signal.aborted) return;
          setResult(null);
          setError(err instanceof Error ? err.message : 'Search failed');
        })
        .finally(() => {
          if (!ac.signal.aborted) setLoading(false);
        });
    }, 280);
    return () => clearTimeout(debounceRef.current);
  }, [query, open, localUnderstanding]);

  useEffect(() => {
    setActiveIndex(0);
  }, [timeFilter, result?.query]);

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, hits.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeHit) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) openWorkspace(activeHit);
      else if (e.shiftKey) setDetailPopupOpen(true);
      else setDetailPopupOpen(true);
    }
  };

  const handleExpand = useCallback((hit: EnrichedIntelligenceHit, index: number) => {
    setActiveIndex(index);
    setDetailPopupOpen(true);
  }, []);

  if (!open) return null;

  return (
    <div className="intel-search-overlay intel-search-overlay--open" onClick={close} role="presentation">
      <div
        className="intel-search-shell intel-search-shell--wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Platform intelligence search"
      >
        <div className="intel-search-input-row">
          <Command className="w-5 h-5 text-emerald-400/80 shrink-0" />
          <input
            ref={inputRef}
            className="intel-search-input"
            placeholder="Search — instant, ranked by what matters now"
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
        </div>

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
          <span>Progressive load · cached · zero-lag UI</span>
          {aiConfig?.geminiConfigured ? (
            <button
              type="button"
              className={`intel-search-ai-toggle${aiConfig.userAiAssistEnabled ? ' is-on' : ''}`}
              onClick={toggleAiAssist}
              disabled={aiToggling}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {aiToggling ? 'Saving…' : aiConfig.userAiAssistEnabled ? 'Gemini on' : 'Gemini off'}
            </button>
          ) : null}
        </div>

        {livePulses.length > 0 && (
          <div className="intel-search-live-strip">
            <span className={`intel-search-live-dot${liveConnected ? ' is-on' : ''}`} />
            <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-white/35 mr-2">
              Live
            </span>
            {livePulses.slice(0, 4).map((p) => (
              <button
                key={p.id}
                type="button"
                className="intel-search-live-chip"
                onClick={() => p.deepLink && navigateAndClose(p.deepLink)}
              >
                {p.title}
              </button>
            ))}
          </div>
        )}

        {query.length >= 2 && hits.length > 0 && !loading && (
          <IntelligenceTimeFilterBar value={timeFilter} onChange={setTimeFilter} resultCount={hits.length} />
        )}

        <div className="intel-search-body">
          <div className="intel-search-results">
            {loading && query.length >= 2 && (
              <div className="intel-search-skeleton" aria-busy="true">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="intel-search-skeleton-row intel-op-card-skeleton" />
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
              <div className="intel-search-empty intel-search-empty--start">
                <p className="text-white/60 mb-1 font-semibold">Operational memory</p>
                <p className="text-xs text-white/40 mb-4 max-w-md mx-auto">
                  Layered previews — summary first, investigation details on demand.
                </p>
                <IntelligenceRecentSection
                  items={recentViews}
                  onOpen={openRecent}
                  onClear={() => {
                    clearRecentViews();
                    setRecentViews([]);
                  }}
                />
                <div className="intel-search-examples mt-6">
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

            {!loading && !error && query.length >= 2 && hits.length === 0 && rawHits.length > 0 && (
              <div className="intel-search-empty">
                <p>No results in this time window.</p>
                <button type="button" className="intel-search-more-toggle mt-3" onClick={() => setTimeFilter('all')}>
                  Clear time filter
                </button>
              </div>
            )}

            {!loading && !error && query.length >= 2 && rawHits.length === 0 && (
              <div className="intel-search-empty">
                <p>No matches for &ldquo;{query}&rdquo;</p>
              </div>
            )}

            {!loading && !error && timeGroups.length > 0 && (
              <IntelligenceVirtualResults
                groups={timeGroups}
                indexByHitId={indexByHitId}
                activeIndex={activeIndex}
                onHoverIndex={setActiveIndex}
                onOpen={(hit) => {
                  setActiveIndex(indexByHitId.get(hit.id) ?? 0);
                }}
                onExpand={handleExpand}
                onPrefetch={prefetch}
              />
            )}
          </div>

          <IntelligencePreviewAside
            activeHit={activeHit}
            preview={preview}
            loading={previewLoading}
            loadingFull={loadingFull}
            fieldsExpanded={previewFieldsExpanded}
            relatedExpanded={previewRelatedExpanded}
            onToggleFields={() => setPreviewFieldsExpanded((v) => !v)}
            onToggleRelated={() => setPreviewRelatedExpanded((v) => !v)}
            onOpenWorkspace={() => activeHit && openWorkspace(activeHit)}
            onExpandPopup={() => setDetailPopupOpen(true)}
            onNavigate={navigateAndClose}
          />
        </div>

        <div className="intel-search-footer">
          <span>
            {result ? (
              <>
                {hits.length} shown · {result.tookMs}ms{result.cached ? ' · cached' : ''}
              </>
            ) : (
              <>↵ investigate · ⌘↵ open workspace</>
            )}
          </span>
          <span className="flex gap-3">
            <span>
              <span className="intel-search-kbd">↑↓</span> navigate
            </span>
            <span>
              <span className="intel-search-kbd">↵</span> dossier
            </span>
            <span>
              <span className="intel-search-kbd">⌘↵</span> workspace
            </span>
          </span>
        </div>
      </div>

      {detailPopupOpen && (
        <Suspense fallback={null}>
          <IntelligenceDetailPopup
            open={detailPopupOpen}
            hit={activeHit}
            preview={preview}
            loading={previewLoading || loadingFull}
            onClose={() => setDetailPopupOpen(false)}
            onOpenWorkspace={() => activeHit && openWorkspace(activeHit)}
            onNavigate={navigateAndClose}
          />
        </Suspense>
      )}
    </div>
  );
}
