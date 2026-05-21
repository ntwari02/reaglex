export function buildMarketplacePassport(input: {
  deliveryRate: number;
  disputeRate: number;
  reviews: number;
  kycVerified: boolean;
}) {
  const trustBand =
    input.deliveryRate >= 90 && input.disputeRate <= 5 && input.kycVerified
      ? 'high'
      : input.deliveryRate >= 75
        ? 'medium'
        : 'low';
  return {
    passport: {
      deliveryRate: input.deliveryRate,
      disputeRate: input.disputeRate,
      reviews: input.reviews,
      kyc: input.kycVerified,
      trustBand,
    },
  };
}
