import React, { useEffect, useState } from 'react';
import { Truck, Plus, Trash2, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sellerShippingAPI } from '@/services/api';
import { useToastStore } from '@/stores/toastStore';

type Warehouse = {
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
};

type MethodRule = {
  key: 'standard' | 'express' | 'pickup';
  enabled: boolean;
  label?: string;
  etaDaysMin: number;
  etaDaysMax: number;
  baseFee?: number;
  ratePerKm?: number;
  handlingFee?: number;
  minShippingFee?: number;
  freeShippingThreshold?: number;
  expressDistanceMultiplier?: number;
  pickupFee?: number;
};

type Zone = { id: string; name: string; countryCodes: string[]; surcharge: number };

type SettingsShape = {
  enabled: boolean;
  currency: string;
  warehouses: Warehouse[];
  defaults: {
    baseFee: number;
    ratePerKm: number;
    handlingFee: number;
    minShippingFee: number;
    freeShippingThreshold?: number;
  };
  zones: Zone[];
  methods: MethodRule[];
};

const emptySettings = (): SettingsShape => ({
  enabled: true,
  currency: 'USD',
  warehouses: [
    {
      warehouseId: 'default',
      label: 'Main warehouse',
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
  methods: [
    { key: 'standard', enabled: true, label: 'Standard', etaDaysMin: 3, etaDaysMax: 7 },
    { key: 'express', enabled: true, label: 'Express', etaDaysMin: 1, etaDaysMax: 3, expressDistanceMultiplier: 1.2 },
    { key: 'pickup', enabled: false, label: 'Pickup', etaDaysMin: 0, etaDaysMax: 2, pickupFee: 0 },
  ],
});

const inp =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white';

const SellerShippingSettings: React.FC = () => {
  const { showToast } = useToastStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsShape>(emptySettings);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await sellerShippingAPI.get();
        if (cancelled) return;
        if (data?.settings) {
          const base = emptySettings();
          const incoming = data.settings as SettingsShape;
          const merged: SettingsShape = {
            ...base,
            ...incoming,
            warehouses: incoming.warehouses?.length ? incoming.warehouses : base.warehouses,
            methods: incoming.methods?.length ? incoming.methods : base.methods,
            zones: Array.isArray(incoming.zones) ? incoming.zones : [],
            defaults: { ...base.defaults, ...incoming.defaults },
          };
          setSettings(merged);
        }
      } catch {
        if (!cancelled) showToast('Could not load shipping settings.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateWarehouse = (idx: number, patch: Partial<Warehouse>) => {
    setSettings((s) => {
      const warehouses = [...(s.warehouses || [])];
      warehouses[idx] = { ...warehouses[idx], ...patch };
      return { ...s, warehouses };
    });
  };

  const addWarehouse = () => {
    setSettings((s) => ({
      ...s,
      warehouses: [
        ...s.warehouses,
        {
          warehouseId: `wh_${Date.now().toString(36)}`,
          label: 'Warehouse',
          lat: -1.9441,
          lng: 30.0619,
          pickupAvailable: false,
        },
      ],
    }));
  };

  const removeWarehouse = (idx: number) => {
    setSettings((s) => ({
      ...s,
      warehouses: s.warehouses.filter((_, i) => i !== idx),
    }));
  };

  const updateMethod = (key: MethodRule['key'], patch: Partial<MethodRule>) => {
    setSettings((s) => ({
      ...s,
      methods: s.methods.map((m) => (m.key === key ? { ...m, ...patch } : m)),
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await sellerShippingAPI.put(settings);
      showToast('Shipping settings saved.', 'success');
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 pb-24 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
          <Truck className="h-7 w-7 text-[var(--brand-primary)]" />
          Reaglex shipping
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Set origin coordinates for each warehouse, default fees, and optional zones. Buyer checkout uses{' '}
          <strong>OpenRouteService</strong> when <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">OPENROUTESERVICE_API_KEY</code> is set on
          the server; otherwise a road-like estimate from straight-line distance is used.
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
          Platform-wide free shipping: set env <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">REAGLEX_PLATFORM_FREE_SHIPPING_THRESHOLD</code>{' '}
          (order subtotal in the same currency as product prices).
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/60">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Default fees</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Base fee
            <input
              type="number"
              className={inp}
              value={settings.defaults.baseFee}
              onChange={(e) =>
                setSettings((s) => ({ ...s, defaults: { ...s.defaults, baseFee: Number(e.target.value) || 0 } }))
              }
            />
          </label>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Rate per km
            <input
              type="number"
              step="0.01"
              className={inp}
              value={settings.defaults.ratePerKm}
              onChange={(e) =>
                setSettings((s) => ({ ...s, defaults: { ...s.defaults, ratePerKm: Number(e.target.value) || 0 } }))
              }
            />
          </label>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Handling fee
            <input
              type="number"
              className={inp}
              value={settings.defaults.handlingFee}
              onChange={(e) =>
                setSettings((s) => ({ ...s, defaults: { ...s.defaults, handlingFee: Number(e.target.value) || 0 } }))
              }
            />
          </label>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Minimum shipping
            <input
              type="number"
              className={inp}
              value={settings.defaults.minShippingFee}
              onChange={(e) =>
                setSettings((s) => ({ ...s, defaults: { ...s.defaults, minShippingFee: Number(e.target.value) || 0 } }))
              }
            />
          </label>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300 sm:col-span-2">
            Free shipping over (seller-wide, optional)
            <input
              type="number"
              className={inp}
              placeholder="Leave empty to disable"
              value={settings.defaults.freeShippingThreshold ?? ''}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  defaults: {
                    ...s.defaults,
                    freeShippingThreshold: e.target.value === '' ? undefined : Number(e.target.value),
                  },
                }))
              }
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/60">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Warehouses / origins</h2>
          <Button type="button" variant="outline" size="sm" onClick={addWarehouse}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
        <div className="space-y-4">
          {settings.warehouses.map((w, idx) => (
            <div key={w.warehouseId + idx} className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
              <div className="mb-2 flex justify-end">
                {settings.warehouses.length > 1 && (
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => removeWarehouse(idx)}
                    aria-label="Remove warehouse"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-gray-600 dark:text-gray-300">
                  Warehouse ID
                  <input className={inp} value={w.warehouseId} onChange={(e) => updateWarehouse(idx, { warehouseId: e.target.value })} />
                </label>
                <label className="text-xs text-gray-600 dark:text-gray-300">
                  Label
                  <input className={inp} value={w.label} onChange={(e) => updateWarehouse(idx, { label: e.target.value })} />
                </label>
                <label className="text-xs text-gray-600 dark:text-gray-300">
                  Latitude
                  <input
                    type="number"
                    step="any"
                    className={inp}
                    value={w.lat}
                    onChange={(e) => updateWarehouse(idx, { lat: Number(e.target.value) })}
                  />
                </label>
                <label className="text-xs text-gray-600 dark:text-gray-300">
                  Longitude
                  <input
                    type="number"
                    step="any"
                    className={inp}
                    value={w.lng}
                    onChange={(e) => updateWarehouse(idx, { lng: Number(e.target.value) })}
                  />
                </label>
                <label className="text-xs text-gray-600 dark:text-gray-300 sm:col-span-2">
                  Country
                  <input className={inp} value={w.country || ''} onChange={(e) => updateWarehouse(idx, { country: e.target.value })} />
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={Boolean(w.pickupAvailable)}
                    onChange={(e) => updateWarehouse(idx, { pickupAvailable: e.target.checked })}
                  />
                  Pickup available at this location
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/60">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Shipping methods</h2>
        <div className="space-y-3">
          {settings.methods.map((m) => (
            <div key={m.key} className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-800">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={m.enabled} onChange={(e) => updateMethod(m.key, { enabled: e.target.checked })} />
                {m.label || m.key}
              </label>
              {m.key === 'express' && (
                <label className="text-xs text-gray-600 dark:text-gray-300">
                  Distance multiplier
                  <input
                    type="number"
                    step="0.05"
                    className={`${inp} w-24`}
                    value={m.expressDistanceMultiplier ?? 1.2}
                    onChange={(e) => updateMethod(m.key, { expressDistanceMultiplier: Number(e.target.value) || 1 })}
                  />
                </label>
              )}
              {m.key === 'pickup' && (
                <label className="text-xs text-gray-600 dark:text-gray-300">
                  Pickup fee
                  <input
                    type="number"
                    step="0.01"
                    className={`${inp} w-24`}
                    value={m.pickupFee ?? 0}
                    onChange={(e) => updateMethod(m.key, { pickupFee: Number(e.target.value) || 0 })}
                  />
                </label>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/60">
        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Delivery zones (optional)</h2>
        <p className="mb-3 text-xs text-gray-500">Match buyer country (ISO-2) and add a flat surcharge to the computed shipment.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mb-3"
          onClick={() =>
            setSettings((s) => ({
              ...s,
              zones: [...s.zones, { id: `z_${Date.now()}`, name: 'Zone', countryCodes: ['RW'], surcharge: 0 }],
            }))
          }
        >
          <Plus className="mr-1 h-4 w-4" /> Add zone
        </Button>
        <div className="space-y-2">
          {settings.zones.map((z, zi) => (
            <div key={z.id} className="flex flex-wrap items-end gap-2">
              <label className="text-xs text-gray-600 dark:text-gray-300">
                Name
                <input
                  className={inp}
                  value={z.name}
                  onChange={(e) => {
                    const zones = [...settings.zones];
                    zones[zi] = { ...z, name: e.target.value };
                    setSettings((s) => ({ ...s, zones }));
                  }}
                />
              </label>
              <label className="text-xs text-gray-600 dark:text-gray-300">
                Countries (comma, ISO2)
                <input
                  className={`${inp} min-w-[140px]`}
                  value={z.countryCodes.join(',')}
                  onChange={(e) => {
                    const zones = [...settings.zones];
                    zones[zi] = {
                      ...z,
                      countryCodes: e.target.value
                        .split(',')
                        .map((c) => c.trim().toUpperCase())
                        .filter(Boolean),
                    };
                    setSettings((s) => ({ ...s, zones }));
                  }}
                />
              </label>
              <label className="text-xs text-gray-600 dark:text-gray-300">
                Surcharge
                <input
                  type="number"
                  className={`${inp} w-24`}
                  value={z.surcharge}
                  onChange={(e) => {
                    const zones = [...settings.zones];
                    zones[zi] = { ...z, surcharge: Number(e.target.value) || 0 };
                    setSettings((s) => ({ ...s, zones }));
                  }}
                />
              </label>
              <button
                type="button"
                className="mb-0.5 text-red-500"
                onClick={() => setSettings((s) => ({ ...s, zones: s.zones.filter((_, i) => i !== zi) }))}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={saving}
          className="rounded-full bg-gradient-to-r from-red-500 to-[var(--brand-primary)] px-8"
          onClick={save}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save settings
        </Button>
      </div>
    </div>
  );
};

export default SellerShippingSettings;
