import { useEffect, useRef, useState } from 'react';

interface UseLazyLoadOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number;
}

export function useLazyLoad<T extends HTMLElement>(
  options: UseLazyLoadOptions = {}
): [React.RefObject<T>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      {
        root: options.root || null,
        rootMargin: options.rootMargin || '50px',
        threshold: options.threshold || 0.1,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options.root, options.rootMargin, options.threshold]);

  return [ref, isIntersecting];
}

