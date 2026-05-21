export function estimateLiveSessionScore(input: { clips: number; viewers?: number; productsTagged?: number }) {
  const viewers = Math.max(0, Number(input.viewers || 0));
  const score = Math.round(input.clips * 5 + viewers * 0.02 + Number(input.productsTagged || 0) * 3);
  return { score };
}
