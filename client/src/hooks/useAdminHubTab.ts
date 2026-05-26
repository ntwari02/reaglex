import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Syncs admin hub sub-tabs with URL paths: /admin/{hubSegment}/{tab}
 * Falls back to ?tab= for bookmarks and legacy links.
 */
export function useAdminHubTab<T extends string>(
  hubSegment: string,
  defaultTab: T,
  validTabs: readonly T[],
): { activeTab: T; setActiveTab: (tab: T) => void } {
  const location = useLocation();
  const navigate = useNavigate();

  const tabFromUrl = useMemo((): T => {
    const segments = location.pathname.split('/').filter(Boolean);
    const adminIdx = segments.indexOf('admin');
    if (adminIdx < 0 || segments[adminIdx + 1] !== hubSegment) {
      return defaultTab;
    }
    const sub = segments[adminIdx + 2];
    if (sub && (validTabs as readonly string[]).includes(sub)) {
      return sub as T;
    }
    const q = new URLSearchParams(location.search).get('tab');
    if (q && (validTabs as readonly string[]).includes(q)) {
      return q as T;
    }
    return defaultTab;
  }, [location.pathname, location.search, hubSegment, defaultTab, validTabs]);

  const [activeTab, setActiveTabState] = useState<T>(tabFromUrl);

  useEffect(() => {
    setActiveTabState(tabFromUrl);
  }, [tabFromUrl]);

  const setActiveTab = useCallback(
    (tab: T) => {
      const base = `/admin/${hubSegment}`;
      if (tab === defaultTab) {
        navigate(base, { replace: true });
      } else {
        navigate(`${base}/${tab}`, { replace: true });
      }
    },
    [navigate, hubSegment, defaultTab],
  );

  return { activeTab, setActiveTab };
}
