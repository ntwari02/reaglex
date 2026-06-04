/**
 * Chart of accounts — stable identifiers for ledger postings.
 */

export const ACCOUNTS = {
  asset: {
    pspClearing: (provider: string) => `asset.psp.${provider}.clearing`,
  },
  liability: {
    escrowPool: 'liability.escrow.pool',
    escrowOrder: (orderId: string) => `liability.escrow.order.${orderId}`,
    sellerPayable: (sellerId: string) => `liability.seller.payable.${sellerId}`,
    buyerRefundDue: (buyerId: string) => `liability.buyer.refund_due.${buyerId}`,
  },
  revenue: {
    platformCommission: 'revenue.platform.commission',
    platformInsurance: 'revenue.platform.insurance',
  },
  expense: {
    pspProcessingFee: 'expense.psp.processing_fee',
  },
} as const;

export type AccountId = string;
