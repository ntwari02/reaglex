export function buildAICounterOffer(input: { targetPrice: number; quantity: number; listUnitPrice?: number }) {
  const list = Math.max(0.01, Number(input.listUnitPrice || input.targetPrice / Math.max(1, input.quantity)));
  const buyerUnit = Number(input.targetPrice || 0) / Math.max(1, Number(input.quantity || 1));
  const midpoint = (list + buyerUnit) / 2;
  const counterUnit = Math.max(list * 0.85, midpoint);
  const counterTotal = Math.round(counterUnit * Math.max(1, input.quantity) * 100) / 100;
  return {
    counterTotal,
    message:
      counterTotal <= input.targetPrice
        ? 'Offer accepted by rule threshold.'
        : `AI counter-offer: ${counterTotal}. Includes volume pricing adjustment.`,
  };
}
