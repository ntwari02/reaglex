export function suggestOrderActions(input: { cartValue: number; itemCount: number }) {
  return {
    actions: [
      input.cartValue > 200 ? 'offer_insurance' : 'upsell_bundle',
      input.itemCount >= 3 ? 'consolidate_shipments' : 'standard_checkout',
    ],
  };
}
