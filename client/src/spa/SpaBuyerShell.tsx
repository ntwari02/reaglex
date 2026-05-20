import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { logicalRouteKey } from './logicalRouteKey';

const MAX_CACHED_ROUTES = 10;
/** One mounted tree per logical route (tab memory — scroll/DOM state preserved). */
const logicalCache = new Map<string, ReactNode>();
const logicalOrder: string[] = [];

function touchLogical(key: string) {
  const idx = logicalOrder.indexOf(key);
  if (idx >= 0) logicalOrder.splice(idx, 1);
  logicalOrder.push(key);
  while (logicalOrder.length > MAX_CACHED_ROUTES) {
    const evict = logicalOrder.shift();
    if (evict) logicalCache.delete(evict);
  }
}

/**
 * Keeps buyer routes mounted per logical path (/, /products, …) so tab switches
 * and back navigation restore scroll, lists, and carousels without remounting.
 */
export default function SpaBuyerShell() {
  const location = useLocation();
  const outlet = useOutlet();
  const activeLogical = logicalRouteKey(location.pathname, location.search);
  const prevLogicalRef = useRef<string | null>(null);

  useEffect(() => {
    if (outlet) {
      logicalCache.set(activeLogical, outlet);
      touchLogical(activeLogical);
    }
    prevLogicalRef.current = activeLogical;
  }, [activeLogical, outlet]);

  const keys = logicalOrder.includes(activeLogical)
    ? logicalOrder
    : [...logicalOrder, activeLogical];

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <>
      {keys.map((key) => {
        const node = logicalCache.get(key) ?? (key === activeLogical ? outlet : null);
        if (!node) return null;
        const isActive = key === activeLogical;

        if (reducedMotion) {
          return (
            <div
              key={key}
              data-spa-route={key}
              style={{ display: isActive ? 'block' : 'none' }}
              aria-hidden={!isActive}
            >
              {node}
            </div>
          );
        }

        return (
          <motion.div
            key={key}
            data-spa-route={key}
            initial={false}
            animate={{ opacity: isActive ? 1 : 0 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: isActive ? 'block' : 'none',
              pointerEvents: isActive ? 'auto' : 'none',
            }}
            aria-hidden={!isActive}
          >
            {node}
          </motion.div>
        );
      })}
    </>
  );
}
