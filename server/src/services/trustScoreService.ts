export function computeUniversalTrustScore(input: {
  deliveryRate: number;
  disputeRate: number;
  reviewScore: number;
  kyc: boolean;
}) {
  const base =
    input.deliveryRate * 0.4 +
    (100 - input.disputeRate) * 0.2 +
    input.reviewScore * 20 * 0.25 +
    (input.kyc ? 15 : 0);
  return Math.max(0, Math.min(100, Math.round(base)));
}
