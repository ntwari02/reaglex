export interface CloudCartItem {
  id?: string;
  productId?: string;
  title?: string;
  price?: number;
  image?: string;
  quantity?: number;
  [key: string]: unknown;
}

export interface ShippingPreviewLocation {
  country?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export const cartSyncAPI: {
  getCloudCart(): Promise<{ items?: CloudCartItem[]; shippingPreviewLocation?: ShippingPreviewLocation }>;
  syncCart(params: {
    items: CloudCartItem[];
    mergeMode?: 'merge' | 'replace';
    shippingPreviewLocation?: ShippingPreviewLocation;
  }): Promise<unknown>;
};

export function mergeCloudCartOnAuth(
  getState: () => { items: CloudCartItem[]; shippingPreviewLocation?: ShippingPreviewLocation },
  replaceItems: (items: CloudCartItem[], shippingPreviewLocation?: ShippingPreviewLocation) => void
): Promise<void>;
