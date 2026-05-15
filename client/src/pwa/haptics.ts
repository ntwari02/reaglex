/**
 * Cross-platform haptic feedback helper.
 *
 * Mobile Chrome/Android exposes `navigator.vibrate`. iOS Safari ignores it
 * but gracefully — so we just call it and let the platform decide.
 */
export type HapticPattern = 'tap' | 'success' | 'warning' | 'error' | 'selection';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 12,
  selection: 8,
  success: [12, 30, 24],
  warning: [20, 60, 20],
  error: [40, 50, 40, 50, 40],
};

export function haptic(pattern: HapticPattern = 'tap'): void {
  try {
    if (typeof navigator === 'undefined') return;
    if (!('vibrate' in navigator)) return;
    const value = PATTERNS[pattern] ?? PATTERNS.tap;
    (navigator as Navigator).vibrate(value);
  } catch {
    /* ignore */
  }
}
