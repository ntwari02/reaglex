export function suggestPickPath(input: { skuCount: number; aisles?: number }) {
  const aisles = Math.max(1, Number(input.aisles || 5));
  return {
    estimatedPickMinutes: Math.max(2, Math.round((input.skuCount * 1.2) + aisles * 0.5)),
  };
}
