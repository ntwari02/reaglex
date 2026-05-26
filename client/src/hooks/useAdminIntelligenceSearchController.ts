import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  adminIntelligenceSearchApi,
  type IntelligenceAssistantAction,
  type IntelligenceAssistantBrief,
  type IntelligenceEntityPreview,
  type IntelligenceSearchHit,
  type IntelligenceSearchResponse,
} from '@/services/adminIntelligenceSearchApi';
import { explainQueryLocally } from '@/lib/intelligenceQueryHints';
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
import { useIntelligencePreviewCache } from '@/hooks/useIntelligencePreviewCache';

const INITIAL_VISIBLE = 8;
const VISIBLE_STEP = 10;
const SEARCH_DEBOUNCE_MS = 280;
const SUGGEST_DEBOUNCE_MS = 520;
const PREVIEW_DEBOUNCE_MS = 380;
const FAST_SEARCH_LIMIT = 12;
const FULL_SEARCH_LIMIT = 24;

function flatHits(groups: IntelligenceSearchResponse['groups']): IntelligenceSearchHit[] {
  return groups.flatMap((g) => g.hits);
}

export function useAdminIntelligenceSearchController(open: boolean, onClose: () => void) {
  const navigate = useNavigate();
  const previewCache = useIntelligencePreviewCache();

  const [query, setQuery] = useState('');
  const [result, setResult] = useState<IntelligenceSearchResponse | null>(null);
  const [staleResult, setStaleResult] = useState<IntelligenceSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
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
  const [timeFilter, setTimeFilter] = useState<TimeFilterId>('all');
  const [recentViews, setRecentViews] = useState<RecentIntelligenceView[]>([]);
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE);
  const [configLoaded, setConfigLoaded] = useState(false);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController | null>(null);
  const suggestAbortRef = useRef<AbortController | null>(null);
  const searchGenRef = useRef(0);
  const queryRef = useRef(query);
  const resultRef = useRef(result);
  queryRef.current = query;
  resultRef.current = result;

  const localUnderstanding = useMemo(() => explainQueryLocally(query), [query]);

  const activeBrief = useMemo((): IntelligenceAssistantBrief | null => {
    if (result?.assistant) return result.assistant;
    if (query.trim().length >= 2) {
      return typingBrief || buildLocalTypingBrief(query, localUnderstanding, aiTypingHint);
    }
    return null;
  }, [result?.assistant, query, typingBrief, localUnderstanding, aiTypingHint]);

  const rawHits = useMemo(() => {
    const src = result || staleResult;
    if (!src) return [];
    const top = src.assistant?.topResults?.length
      ? src.assistant.topResults
      : flatHits(src.groups).slice(0, 3);
    const topIds = new Set(top.map((h) => h.id));
    const rest = flatHits(src.groups).filter((h) => !topIds.has(h.id));
    return [...top, ...rest];
  }, [result, staleResult]);

  const enrichedHits = useMemo(
    () => applyTimeFilter(rawHits.map(enrichHit), timeFilter),
    [rawHits, timeFilter],
  );

  const timeGroups = useMemo(() => groupHitsByTimeBucket(enrichedHits), [enrichedHits]);
  const hits = enrichedHits;
  const visibleHits = hits.slice(0, visibleLimit);
  const hasMoreHits = hits.length > visibleLimit;
  const activeHit = hits[activeIndex] || null;

  const displayGroups = useMemo(() => {
    const visibleIds = new Set(visibleHits.map((h) => h.id));
    return timeGroups
      .map((g) => ({
        ...g,
        hits: g.hits.filter((h) => visibleIds.has(h.id)),
      }))
      .filter((g) => g.hits.length > 0);
  }, [timeGroups, visibleHits]);

  const resetState = useCallback(() => {
    abortRef.current?.abort();
    suggestAbortRef.current?.abort();
    previewCache.clear();
    setQuery('');
    setResult(null);
    setStaleResult(null);
    setPreview(null);
    setError(null);
    setActiveIndex(0);
    setTypingBrief(null);
    setAiTypingHint(null);
    setTimeFilter('all');
    setVisibleLimit(INITIAL_VISIBLE);
    setLoading(false);
    setLoadingMore(false);
  }, [previewCache]);

  const close = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const navigateAndClose = useCallback(
    (href: string) => {
      close();
      navigate(href);
    },
    [close, navigate],
  );

  const openHit = useCallback(
    (hit: IntelligenceSearchHit) => {
      recordRecentView(hit);
      setRecentViews(getRecentViews());
      close();
      navigate(hit.deepLink);
    },
    [close, navigate],
  );

  const openRecent = useCallback(
    (item: RecentIntelligenceView) => {
      close();
      navigate(item.deepLink);
    },
    [close, navigate],
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

  const loadMoreVisible = useCallback(() => {
    setVisibleLimit((n) => Math.min(hits.length, n + VISIBLE_STEP));
  }, [hits.length]);

  const runSearch = useCallback(async (q: string, gen: number) => {
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);
    if (resultRef.current) setStaleResult(resultRef.current);

    try {
      const fast = await adminIntelligenceSearchApi.search(q, FAST_SEARCH_LIMIT, ac.signal);
      if (ac.signal.aborted || gen !== searchGenRef.current) return;
      setResult(fast);
      setStaleResult(null);
      setActiveIndex(0);
      setVisibleLimit(INITIAL_VISIBLE);
      setLoading(false);

      if (fast.total > FAST_SEARCH_LIMIT || flatHits(fast.groups).length >= FAST_SEARCH_LIMIT) {
        setLoadingMore(true);
        const full = await adminIntelligenceSearchApi.search(q, FULL_SEARCH_LIMIT, ac.signal);
        if (!ac.signal.aborted && gen === searchGenRef.current && queryRef.current.trim() === q) {
          setResult(full);
        }
        setLoadingMore(false);
      }
    } catch (err: unknown) {
      if (ac.signal.aborted || gen !== searchGenRef.current) return;
      setResult(null);
      setError(err instanceof Error ? err.message : 'Search failed');
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setRecentViews(getRecentViews());
    const idle =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 1);
    const cancel =
      typeof cancelIdleCallback === 'function'
        ? cancelIdleCallback
        : (id: number) => clearTimeout(id);
    const id = idle(() => {
      adminIntelligenceSearchApi
        .getConfig()
        .then((cfg) => {
          setAiConfig(cfg);
          setConfigLoaded(true);
        })
        .catch(() => setConfigLoaded(true));
    });
    return () => cancel(id as number);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    clearTimeout(searchDebounceRef.current);
    clearTimeout(suggestDebounceRef.current);
    abortRef.current?.abort();
    suggestAbortRef.current?.abort();

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResult(null);
      setStaleResult(null);
      setLoading(false);
      setLoadingMore(false);
      setError(null);
      setAiTypingHint(null);
      setTypingBrief(null);
      setTimeFilter('all');
      setVisibleLimit(INITIAL_VISIBLE);
      return;
    }

    setTypingBrief(buildLocalTypingBrief(query, localUnderstanding, null));

    suggestDebounceRef.current = setTimeout(() => {
      const sac = new AbortController();
      suggestAbortRef.current = sac;
      adminIntelligenceSearchApi
        .suggest(trimmed)
        .then((s) => {
          if (sac.signal.aborted || queryRef.current.trim() !== trimmed) return;
          setAiTypingHint(s.aiTypingHint || null);
          if (!resultRef.current) {
            setTypingBrief(
              s.assistant || buildLocalTypingBrief(query, localUnderstanding, s.aiTypingHint),
            );
          }
        })
        .catch(() => {});
    }, SUGGEST_DEBOUNCE_MS);

    const gen = ++searchGenRef.current;
    searchDebounceRef.current = setTimeout(() => {
      suggestAbortRef.current?.abort();
      void runSearch(trimmed, gen);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(searchDebounceRef.current);
      clearTimeout(suggestDebounceRef.current);
    };
  }, [query, open, localUnderstanding, runSearch]);

  useEffect(() => {
    setActiveIndex(0);
    setVisibleLimit(INITIAL_VISIBLE);
  }, [timeFilter, result?.query]);

  useEffect(() => {
    if (!activeHit) {
      setPreview(null);
      setPreviewLoading(false);
      return;
    }

    const cached = previewCache.getCached(activeHit.entityType, activeHit.entityId);
    if (cached) {
      setPreview(cached);
      setPreviewLoading(false);
      const next = hits[activeIndex + 1];
      if (next) previewCache.prefetch(next.entityType, next.entityId);
      return;
    }

    setPreview(null);
    clearTimeout(previewDebounceRef.current);
    previewDebounceRef.current = setTimeout(() => {
      setPreviewLoading(true);
      const ac = new AbortController();
      void previewCache
        .fetchPreview(activeHit.entityType, activeHit.entityId, ac.signal)
        .then((p) => {
          if (!ac.signal.aborted) setPreview(p);
        })
        .finally(() => {
          if (!ac.signal.aborted) setPreviewLoading(false);
        });
    }, PREVIEW_DEBOUNCE_MS);

    return () => clearTimeout(previewDebounceRef.current);
  }, [activeHit?.id, activeIndex, hits, previewCache]);

  const toggleAiAssist = async () => {
    if (!aiConfig?.geminiConfigured || aiToggling) return;
    setAiToggling(true);
    try {
      const cfg = await adminIntelligenceSearchApi.setAiAssist(!aiConfig.userAiAssistEnabled);
      setAiConfig(cfg);
    } finally {
      setAiToggling(false);
    }
  };

  const globalHitIndex = useCallback(
    (hit: EnrichedIntelligenceHit) => hits.findIndex((h) => h.id === hit.id),
    [hits],
  );

  const showSkeleton = loading && !staleResult && query.trim().length >= 2;
  const showStaleOverlay = loading && Boolean(staleResult);

  return {
    query,
    setQuery,
    result,
    loading,
    loadingMore,
    showSkeleton,
    showStaleOverlay,
    error,
    activeIndex,
    setActiveIndex,
    preview,
    previewLoading,
    aiConfig,
    aiToggling,
    configLoaded,
    toggleAiAssist,
    activeBrief,
    hits,
    visibleHits,
    displayGroups,
    hasMoreHits,
    visibleLimit,
    loadMoreVisible,
    rawHits,
    timeFilter,
    setTimeFilter,
    recentViews,
    setRecentViews,
    activeHit,
    close,
    navigateAndClose,
    openHit,
    openRecent,
    handleAssistantAction,
    globalHitIndex,
    clearRecentViews,
  };
}
