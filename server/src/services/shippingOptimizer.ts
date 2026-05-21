export function optimizeShippingChoice(input: { options: Array<{ cost: number; etaDays: number }> }) {
  if (!input.options.length) return null;
  const scored = input.options.map((o, i) => ({ idx: i, score: (1 / Math.max(1, o.cost)) * 0.6 + (1 / Math.max(1, o.etaDays)) * 0.4 }));
  scored.sort((a, b) => b.score - a.score);
  return input.options[scored[0].idx];
}
