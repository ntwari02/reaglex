import { useScrollChromeSync } from '../../hooks/useScrollChrome';

/** Scroll chrome sync only — search opens via double-tap on the navbar bar. */
export default function BuyerGestureShell({ children }) {
  useScrollChromeSync(56);
  return children;
}
