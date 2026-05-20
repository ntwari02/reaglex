import { useRef } from 'react';
import { useHorizontalScrollMemory } from './useHorizontalScrollMemory';

/**
 * Wrapper for horizontal rails that persists scrollLeft per route.
 */
export default function HorizontalScrollRail({
  railId,
  className = '',
  style,
  children,
  enabled = true,
  as: Tag = 'div',
  ...rest
}) {
  const ref = useRef(null);
  useHorizontalScrollMemory(railId, ref, enabled);

  return (
    <Tag ref={ref} className={className} style={style} {...rest}>
      {children}
    </Tag>
  );
}
