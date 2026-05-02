export type ReaglexShippingMethodKey = 'standard' | 'express' | 'pickup';

export interface ReaglexWarehouse {
  warehouseId: string;
  label: string;
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
  etaDaysMin: number;
  etaDaysMax: number;
  baseFee?: number;
  ratePerKm?: number;
  handlingFee?: number;
  minShippingFee?: number;
  /** If set, free shipping when group subtotal >= this (same currency as product prices). */
  freeShippingThreshold?: number;
  /** Multiplier applied to distance * rate component for express. */
  expressDistanceMultiplier?: number;
  /** Flat fee for pickup (usually 0). */
  pickupFee?: number;
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
    label: 'Standard',
    etaDaysMin: 3,
    etaDaysMax: 7,
    expressDistanceMultiplier: 1,
    pickupFee: 0,
  },
  {
    key: 'express',
    enabled: true,
    label: 'Express',
    etaDaysMin: 1,
    etaDaysMax: 3,
    expressDistanceMultiplier: 1.2,
    pickupFee: 0,
  },
  {
    key: 'pickup',
    enabled: false,
    label: 'Pickup at seller',
    etaDaysMin: 0,
    etaDaysMax: 2,
    expressDistanceMultiplier: 1,
    pickupFee: 0,
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
