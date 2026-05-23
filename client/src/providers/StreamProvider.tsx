import { useEffect, type ReactNode } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import FloatingLivePlayer from '../components/live/FloatingLivePlayer';
import SellerLiveHostGuard from '../components/live/SellerLiveHostGuard';
import { useLiveStreamStore } from '../stores/liveStreamStore';

type StreamProviderProps = {
  children: ReactNode;
};

/**
 * Global buyer live stream shell — keeps floating mini-player across routes.
 */
export default function StreamProvider({ children }: StreamProviderProps) {
  const location = useLocation();
  const active = useLiveStreamStore((s) => s.active);
  const sessionId = useLiveStreamStore((s) => s.sessionId);
  const setMinimized = useLiveStreamStore((s) => s.setMinimized);

  useEffect(() => {
    if (!active || !sessionId) return;

    const match = matchPath({ path: '/live/:sessionId', end: true }, location.pathname);
    const onLivePage = match?.params?.sessionId === sessionId;
    setMinimized(!onLivePage);
    useLiveStreamStore.getState().setViewMode(onLivePage ? 'inline' : 'floating');
  }, [location.pathname, active, sessionId, setMinimized]);

  return (
    <>
      {children}
      <SellerLiveHostGuard />
      <FloatingLivePlayer />
    </>
  );
}
