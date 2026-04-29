import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname, search, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // Preserve browser history behavior on back/forward (POP) so we do not
    // unexpectedly override the user's expected restored scroll position.
    if (navigationType === 'POP') return;

    // If a hash exists we let native anchor behavior work.
    if (hash) return;

    // On route pushes/replaces we want an immediate reset so the next page
    // always starts at the true top (below fixed headers via layout padding).
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname, search, hash, navigationType]);

  return null;
}

