import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { motion } from 'framer-motion';

const MAX_CACHED_ROUTES = 8;
const routeCache = new Map<string, ReactNode>();
const routeOrder: string[] = [];

function touchRoute(key: string) {
  const idx = routeOrder.indexOf(key);
  if (idx >= 0) routeOrder.splice(idx, 1);
  routeOrder.push(key);
  while (routeOrder.length > MAX_CACHED_ROUTES) {
    const evict = routeOrder.shift();
    if (evict) routeCache.delete(evict);
  }
}

/**
 * Keeps recent buyer routes mounted (hidden) so back navigation is instant
 * and scroll/DOM state is preserved without refetching skeletons.
 */
export default function SpaBuyerShell() {
  const location = useLocation();
  const outlet = useOutlet();
  const activeKey = location.key;
  const prevKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (outlet) {
      routeCache.set(activeKey, outlet);
      touchRoute(activeKey);
    }
    prevKeyRef.current = activeKey;
  }, [activeKey, outlet]);

  const keys = routeOrder.includes(activeKey)
    ? routeOrder
    : [...routeOrder, activeKey];

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <>
      {keys.map((key) => {
        const node = routeCache.get(key) ?? (key === activeKey ? outlet : null);
        if (!node) return null;
        const isActive = key === activeKey;

        if (reducedMotion) {
          return (
            <motion.div
              key={key}
              style={{ display: isActive ? 'block' : 'none' }}
              aria-hidden={!isActive}
            >
              {node}
            </motion.div>
          );
        }

        return (
          <motion.div
            key={key}
            initial={isActive ? { opacity: 0.97 } : false}
            animate={{ opacity: isActive ? 1 : 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
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
