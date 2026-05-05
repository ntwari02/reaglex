import { resolveAssetUrl } from '../lib/config';

export function resolveImageUrl(src: string | undefined, fallback: string): string {
  if (!src) return fallback;
  if (src.startsWith('http')) return src;
  return resolveAssetUrl(src);
}
