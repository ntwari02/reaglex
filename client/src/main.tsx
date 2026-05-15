import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './lib/webPush';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register the PWA service worker on idle so it doesn't compete with the
// initial render. The worker also handles incoming Web Push notifications.
if (typeof window !== 'undefined') {
  const boot = () => {
    void registerServiceWorker();
  };
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(boot, { timeout: 4000 });
  } else {
    window.setTimeout(boot, 1500);
  }
}
