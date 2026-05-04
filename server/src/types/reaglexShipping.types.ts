export type ReaglexShippingMethodKey =
  | 'standard'
  | 'express'
  | 'overnight'
  | 'pickup'
  | 'free'
  | 'flat_rate'
  | 'local_delivery';

export interface ReaglexWarehouse {
  warehouseId: string;
  label: string;
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  lat: number;
  lng: number;
  pickupAvailable?: boolean;
}

export interface ReaglexShippingDefaults {
  baseFee: number;
  ratePerKm: number;
  handlingFee: number;
  minShippingFee: number;
  freeShippingThreshold?: number;
}

export interface ReaglexShippingZone {
  id: string;
  name: string;
  countryCodes: string[];
  /** Added to computed shipping (same currency as fees). */
  surcharge: number;
}

export interface ReaglexShippingMethodRule {
  key: ReaglexShippingMethodKey;
  enabled: boolean;
  label?: string;
  description?: string;
  distanceMultiplier?: number;
  estimatedDays?: number;
  flatFee?: number;
  pickupFee?: number;
  minOrderValue?: number;
  maxRadiusKm?: number;
  etaDaysMin?: number;
  etaDaysMax?: number;
  baseFee?: number;
  ratePerKm?: number;
  handlingFee?: number;
  minShippingFee?: number;
  freeShippingThreshold?: number;
  expressDistanceMultiplier?: number;
}

export interface ReaglexSellerShippingConfig {
  enabled: boolean;
  currency: string;
  warehouses: ReaglexWarehouse[];
  defaults: ReaglexShippingDefaults;
  zones: ReaglexShippingZone[];
  methods: ReaglexShippingMethodRule[];
}

export const DEFAULT_REAGLEX_METHODS: ReaglexShippingMethodRule[] = [
  {
    key: 'standard',
    enabled: true,
    label: 'Standard Delivery',
    description: 'Regular delivery, distance-based pricing',
    distanceMultiplier: 1.0,
    estimatedDays: 3,
  },
  {
    key: 'express',
    enabled: true,
    label: 'Express Delivery',
    description: 'Faster delivery at a higher rate',
    distanceMultiplier: 1.2,
    estimatedDays: 1,
  },
  {
    key: 'overnight',
    enabled: false,
    label: 'Overnight Delivery',
    description: 'Next-morning delivery, highest priority',
    flatFee: 0,
  },
  {
    key: 'pickup',
    enabled: true,
    label: 'Pickup at seller',
    description: 'Buyer collects from your warehouse',
    pickupFee: 0,
  },
  {
    key: 'free',
    enabled: false,
    label: 'Free Shipping',
    description: 'Offer free shipping on orders above a minimum value',
    minOrderValue: 0,
  },
  {
    key: 'flat_rate',
    enabled: false,
    label: 'Flat Rate Shipping',
    description: 'Charge a fixed fee regardless of distance or weight',
    flatFee: 0,
  },
  {
    key: 'local_delivery',
    enabled: false,
    label: 'Local Delivery',
    description: 'Available only within a limited radius (km)',
    maxRadiusKm: 20,
    flatFee: 0,
  },
];

export function defaultReaglexSellerShipping(): ReaglexSellerShippingConfig {
  return {
    enabled: true,
    currency: 'USD',
    warehouses: [
      {
        warehouseId: 'default',
        label: 'Main location',
        address: '',
        country: 'Rwanda',
        lat: -1.9441,
        lng: 30.0619,
        pickupAvailable: false,
      },
    ],
    defaults: {
      baseFee: 5,
      ratePerKm: 0.35,
      handlingFee: 0,
      minShippingFee: 3,
      freeShippingThreshold: undefined,
    },
    zones: [],
    methods: DEFAULT_REAGLEX_METHODS,
  };
}
