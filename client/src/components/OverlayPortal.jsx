import { createPortal } from 'react-dom';

/**
 * Render overlays on document.body so they are not clipped by
 * navbar transform / overflow ancestors.
 */
export default function OverlayPortal({ children, active = true }) {
  if (!active || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
