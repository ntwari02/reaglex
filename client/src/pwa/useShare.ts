import { useCallback } from 'react';
import { haptic } from './haptics';

export type ShareInput = {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
};

/**
 * `navigator.share` falls back to a clipboard copy when not available so
 * sharing always succeeds (e.g. desktop Firefox).
 */
export function useShare() {
  const share = useCallback(async (input: ShareInput): Promise<'shared' | 'copied' | 'failed'> => {
    if (typeof navigator === 'undefined') return 'failed';
    try {
      if (
        typeof navigator.share === 'function' &&
        (!input.files || (navigator as any).canShare?.({ files: input.files }))
      ) {
        await navigator.share({
          title: input.title,
          text: input.text,
          url: input.url,
          files: input.files,
        } as ShareData);
        haptic('success');
        return 'shared';
      }
      const text = input.url || input.text || input.title || '';
      if (text && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        haptic('selection');
        return 'copied';
      }
      return 'failed';
    } catch (e: any) {
      if (e?.name === 'AbortError') return 'failed';
      return 'failed';
    }
  }, []);

  return { share };
}
