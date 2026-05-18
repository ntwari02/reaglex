import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import {
  restoreScrollSnapshot,
  saveScrollSnapshot,
  scrollCacheKey,
} from '../spa/scrollCache';

export function ScrollToTop() {
  const { pathname, search, hash, key: locationKey } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    const cacheKey = scrollCacheKey(pathname, search, locationKey);

    if (navigationType === 'POP') {
      restoreScrollSnapshot(cacheKey, {});
    } else if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }

    return () => {
      saveScrollSnapshot(cacheKey, {});
    };
  }, [pathname, search, hash, navigationType, locationKey]);

  return null;
}
