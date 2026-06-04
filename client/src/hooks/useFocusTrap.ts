import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Trap Tab focus inside a modal container. Does not affect page-level /auth routes.
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
) {
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    previousFocus.current = document.activeElement as HTMLElement | null;

    const root = containerRef.current;
    if (!root) return;

    const getFocusables = () =>
      Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
      );

    const focusFirst = () => {
      const list = getFocusables();
      const preferred = root.querySelector<HTMLElement>('[data-autofocus]') || list[0];
      preferred?.focus();
    };

    const t = window.setTimeout(focusFirst, 50);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape?.();
        return;
      }
      if (e.key !== 'Tab') return;

      const list = getFocusables();
      if (!list.length) return;

      const first = list[0];
      const last = list[list.length - 1];
      const current = document.activeElement as HTMLElement;

      if (e.shiftKey && current === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };

    root.addEventListener('keydown', onKeyDown);

    return () => {
      clearTimeout(t);
      root.removeEventListener('keydown', onKeyDown);
      previousFocus.current?.focus?.();
    };
  }, [active, containerRef, onEscape]);
}
