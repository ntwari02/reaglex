import type { RefObject } from 'react';
import { useScrollMemory } from './useScrollMemory';

/**
 * @deprecated Use useScrollMemory — re-exported for compatibility.
 */
export function useScrollContainer(
  containerId: string,
  ref: RefObject<HTMLElement | null>,
  enabled = true,
) {
  useScrollMemory(containerId, ref, { enabled });
}
