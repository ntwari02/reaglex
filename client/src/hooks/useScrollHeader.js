import { useEffect, useState } from 'react';

/**
 * Tracks scroll direction + offset for adaptive floating header (mobile buyer chrome).
 */
export function useScrollHeader(threshold = 48) {
  const [compact, setCompact] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      setCompact(y > threshold);
      if (y > threshold + 80) {
        if (y > lastY + 6) setHidden(true);
        else if (y < lastY - 6) setHidden(false);
      } else {
        setHidden(false);
      }
      lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return { compact, hidden };
}
