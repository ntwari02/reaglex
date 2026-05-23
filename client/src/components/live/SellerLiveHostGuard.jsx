import { useEffect, useRef } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import {
  endSellerLiveHost,
  endSellerLiveHostSync,
  getSellerLiveHostId,
} from '../../live/sellerLiveHost';

/**
 * Ends seller live when they leave /live/:sessionId (any navigation, tab close, offline).
 */
export default function SellerLiveHostGuard() {
  const location = useLocation();
  const lastPathRef = useRef(location.pathname);

  useEffect(() => {
    const hostingId = getSellerLiveHostId();
    if (!hostingId) return;

    const match = matchPath({ path: '/live/:sessionId', end: true }, location.pathname);
    const onStudioPage = match?.params?.sessionId === hostingId;

    if (!onStudioPage && lastPathRef.current !== location.pathname) {
      void endSellerLiveHost('left_live_page');
    }

    lastPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    const onPageHide = (e) => {
      if (e.persisted) return;
      if (!getSellerLiveHostId()) return;
      endSellerLiveHostSync();
    };

    const onOffline = () => {
      if (!getSellerLiveHostId()) return;
      void endSellerLiveHost('offline');
    };

    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onPageHide);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onPageHide);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return null;
}
