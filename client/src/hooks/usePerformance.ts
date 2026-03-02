import { useEffect } from 'react';

export function usePerformanceOptimization() {
  useEffect(() => {
    // Preload critical resources
    const preloadLinks = [
      { href: '/logo.jpg', as: 'image' },
    ];

    preloadLinks.forEach((link) => {
      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.href = link.href;
      preloadLink.as = link.as;
      document.head.appendChild(preloadLink);
    });

    // Prefetch next likely pages
    const prefetchPages = ['/products', '/collections', '/deals'];
    prefetchPages.forEach((page) => {
      const prefetchLink = document.createElement('link');
      prefetchLink.rel = 'prefetch';
      prefetchLink.href = page;
      document.head.appendChild(prefetchLink);
    });

    // Optimize images loading
    if ('loading' in HTMLImageElement.prototype) {
      // Native lazy loading supported
      const images = document.querySelectorAll('img[data-src]');
      images.forEach((img) => {
        (img as HTMLImageElement).loading = 'lazy';
      });
    }
  }, []);
}

