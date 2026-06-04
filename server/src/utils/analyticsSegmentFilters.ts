export type BuyerGroupFilter = 'all' | 'enterprise' | 'smb' | 'long_tail';
export type PaymentTermsFilter = 'all' | 'prepaid' | 'net30' | 'net60';
export type SalesRepFilter = 'all' | 'team_north' | 'team_south' | 'team_inbound';

const ENTERPRISE_GMV = 5000;
const SMB_GMV = 500;

export type CommercialProfiles = {
  gmv: Map<string, number>;
  orderCount: Map<string, number>;
};

export function buildBuyerCommercialProfiles(allOrders: Array<{ buyerId?: { toString(): string }; total?: number }>): CommercialProfiles {
  const gmv = new Map<string, number>();
  const orderCount = new Map<string, number>();
  for (const o of allOrders) {
    const bid = o.buyerId?.toString();
    if (!bid) continue;
    gmv.set(bid, (gmv.get(bid) || 0) + (o.total || 0));
    orderCount.set(bid, (orderCount.get(bid) || 0) + 1);
  }
  return { gmv, orderCount };
}

export function classifyBuyerGroup(
  buyerId: string,
  gmv: Map<string, number>,
): Exclude<BuyerGroupFilter, 'all'> {
  const total = gmv.get(buyerId) || 0;
  if (total >= ENTERPRISE_GMV) return 'enterprise';
  if (total >= SMB_GMV) return 'smb';
  return 'long_tail';
}

export function classifyPaymentTerms(order: {
  paymentMethod?: string;
  payment?: { method?: string };
  total?: number;
}): Exclude<PaymentTermsFilter, 'all'> {
  const method = `${order.paymentMethod || ''} ${order.payment?.method || ''}`.toLowerCase();
  if (method.includes('net60') || method.includes('net 60')) return 'net60';
  if (
    method.includes('net30') ||
    method.includes('net 30') ||
    method.includes('wire') ||
    method.includes('ach') ||
    method.includes('bank transfer')
  ) {
    return 'net30';
  }
  return 'prepaid';
}

export function classifySalesRep(
  buyerId: string,
  orderCount: Map<string, number>,
): Exclude<SalesRepFilter, 'all'> {
  const count = orderCount.get(buyerId) || 0;
  if (count <= 1) return 'team_inbound';
  const hash = buyerId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return hash % 2 === 0 ? 'team_north' : 'team_south';
}

export function orderMatchesSegmentFilters(
  order: { buyerId?: { toString(): string }; paymentMethod?: string; payment?: { method?: string }; total?: number },
  filters: {
    buyerGroup: BuyerGroupFilter;
    paymentTerms: PaymentTermsFilter;
    salesRep: SalesRepFilter;
  },
  profiles: CommercialProfiles,
): boolean {
  const bid = order.buyerId?.toString();
  if (!bid) return false;
  if (filters.buyerGroup !== 'all' && classifyBuyerGroup(bid, profiles.gmv) !== filters.buyerGroup) {
    return false;
  }
  if (filters.paymentTerms !== 'all' && classifyPaymentTerms(order) !== filters.paymentTerms) {
    return false;
  }
  if (filters.salesRep !== 'all' && classifySalesRep(bid, profiles.orderCount) !== filters.salesRep) {
    return false;
  }
  return true;
}
