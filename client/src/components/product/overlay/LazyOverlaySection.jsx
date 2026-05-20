import { useEffect, useRef, useState } from 'react';

/**
 * Renders children only when the section nears the viewport.
 * Placeholder uses subtle shimmer — no page spinners.
 */
export default function LazyOverlaySection({
  children,
  className = '',
  minHeight = 140,
  rootMargin = '140px 0px',
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { root: el.closest('.pvo-scroll'), rootMargin, threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <section ref={ref} className={className} style={{ minHeight: visible ? undefined : minHeight }}>
      {visible ? children : <div className="pvo-shimmer" style={{ minHeight }} aria-hidden />}
    </section>
  );
}
