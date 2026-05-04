import React, { useEffect, useMemo, useState } from 'react';
import { Truck, Plus, Trash2, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sellerShippingAPI } from '@/services/api';
import { useToastStore } from '@/stores/toastStore';
import AddressSearchInput from '@/components/seller/AddressSearchInput';

type Warehouse = {
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
};

type MethodRule = {
  key: 'standard' | 'express' | 'overnight' | 'pickup' | 'free' | 'flat_rate' | 'local_delivery';
  enabled: boolean;
  name: string;
  description: string;
  fields: Array<{ key: string; label: string; type: 'number'; default: number; help?: string }>;
  distanceMultiplier?: number;
  flatFee?: number;
  pickupFee?: number;
  minOrderValue?: number;
  maxRadiusKm?: number;
  estimatedDays?: number;
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
  methods: [],
});

const DEFAULT_METHODS: MethodRule[] = [
  {
    key: 'standard',
    name: 'Standard Delivery',
    description: 'Regular delivery, distance-based pricing',
    enabled: true,
    distanceMultiplier: 1.0,
    estimatedDays: 3,
    fields: [
      { key: 'distanceMultiplier', label: 'Distance multiplier', type: 'number', default: 1.0, help: 'Multiplier applied to the base rate per km' },
      { key: 'estimatedDays', label: 'Estimated delivery (days)', type: 'number', default: 3 },
    ],
  },
  {
    key: 'express',
    name: 'Express Delivery',
    description: 'Faster delivery at a higher rate',
    enabled: true,
    distanceMultiplier: 1.2,
    estimatedDays: 1,
    fields: [
      { key: 'distanceMultiplier', label: 'Distance multiplier', type: 'number', default: 1.2, help: '1.2 means 20% more expensive than standard' },
      { key: 'estimatedDays', label: 'Estimated delivery (days)', type: 'number', default: 1 },
    ],
  },
  {
    key: 'overnight',
    name: 'Overnight Delivery',
    description: 'Next-morning delivery, highest priority',
    enabled: false,
    flatFee: 0,
    fields: [{ key: 'flatFee', label: 'Flat overnight fee', type: 'number', default: 0, help: 'Fixed fee added on top of distance-based cost' }],
  },
  {
    key: 'pickup',
    name: 'Pickup at seller',
    description: 'Buyer collects from your warehouse',
    enabled: true,
    pickupFee: 0,
    fields: [{ key: 'pickupFee', label: 'Pickup fee', type: 'number', default: 0, help: 'Set to 0 for free pickup' }],
  },
  {
    key: 'free',
    name: 'Free Shipping',
    description: 'Offer free shipping on orders above a minimum value',
    enabled: false,
    minOrderValue: 0,
    fields: [{ key: 'minOrderValue', label: 'Free shipping on orders above', type: 'number', default: 0, help: 'e.g. 10000 RWF - leave 0 to always be free' }],
  },
  {
    key: 'flat_rate',
    name: 'Flat Rate Shipping',
    description: 'Charge a fixed fee regardless of distance or weight',
    enabled: false,
    flatFee: 0,
    fields: [{ key: 'flatFee', label: 'Flat rate fee', type: 'number', default: 0 }],
  },
  {
    key: 'local_delivery',
    name: 'Local Delivery',
    description: 'Available only within a limited radius (km)',
    enabled: false,
    maxRadiusKm: 20,
    flatFee: 0,
    fields: [
      { key: 'maxRadiusKm', label: 'Maximum delivery radius (km)', type: 'number', default: 20 },
      { key: 'flatFee', label: 'Delivery fee', type: 'number', default: 0 },
    ],
  },
];

const inp =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white';

const SellerShippingSettings: React.FC = () => {
  const { showToast } = useToastStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsShape>(emptySettings);
  const loadMethods = useMemo(
    () => (savedMethods?: MethodRule[]) =>
      DEFAULT_METHODS.map((def) => {
        const saved = savedMethods?.find((m) => m.key === def.key);
        return saved ? { ...def, ...saved } : def;
      }),
    []
  );

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
            methods: loadMethods(incoming.methods),
            zones: Array.isArray(incoming.zones) ? incoming.zones : [],
            defaults: { ...base.defaults, ...incoming.defaults },
          };
          setSettings(merged);
        } else {
          setSettings((prev) => ({ ...prev, methods: loadMethods() }));
        }
      } catch {
        if (!cancelled) showToast('Could not load shipping settings.', 'error');
      } finally {
        if (!cancelled) {
          setSettings((prev) => (prev.methods?.length ? prev : { ...prev, methods: loadMethods() }));
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMethods]);

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

  const toggleMethod = (key: MethodRule['key']) => {
    setSettings((s) => ({
      ...s,
      methods: s.methods.map((m) => (m.key === key ? { ...m, enabled: !m.enabled } : m)),
    }));
  };

  const updateMethod = (methodKey: MethodRule['key'], fieldKey: string, value: number | string) => {
    setSettings((s) => ({
      ...s,
      methods: s.methods.map((m) => (m.key === methodKey ? { ...m, [fieldKey]: value } : m)),
    }));
  };

  const save = async () => {
    const invalidWarehouse = settings.warehouses.find((w) => !Number(w.lat) || !Number(w.lng));
    if (invalidWarehouse) {
      showToast(`Please select a valid location for warehouse: "${invalidWarehouse.label || invalidWarehouse.warehouseId}"`, 'error');
      return;
    }
    setSaving(true);
    try {
      await sellerShippingAPI.put({
        ...settings,
        warehouses: settings.warehouses.map((w) => ({
          ...w,
          lat: parseFloat(String(w.lat)) || 0,
          lng: parseFloat(String(w.lng)) || 0,
          address: w.address || '',
          country: w.country || '',
          pickup: Boolean(w.pickupAvailable),
        })),
        methods: settings.methods.map((m) => ({
          key: m.key,
          enabled: Boolean(m.enabled),
          label: m.name,
          description: m.description,
          distanceMultiplier: Number(m.distanceMultiplier) || 0,
          flatFee: Number(m.flatFee) || 0,
          pickupFee: Number(m.pickupFee) || 0,
          minOrderValue: Number(m.minOrderValue) || 0,
          maxRadiusKm: Number(m.maxRadiusKm) || 0,
          estimatedDays: Number(m.estimatedDays) || 0,
        })),
      });
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
          Shipping
        </h1>
        <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, marginTop: 8 }}>
          Configure your warehouse locations, shipping fees, and delivery methods.
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
                <div className="text-xs text-gray-600 dark:text-gray-300 sm:col-span-2" style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 6, fontWeight: 500 }}>Warehouse location</label>
                  <AddressSearchInput
                    value={{ lat: w.lat, lng: w.lng, address: w.address || '', country: w.country || '' }}
                    onChange={({ lat, lng, address, country }) => {
                      updateWarehouse(idx, { lat: Number(lat) || 0, lng: Number(lng) || 0, address, country });
                    }}
                    required
                  />
                  {w.lat && w.lng && (
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                      Coordinates: {Number(w.lat).toFixed(4)}, {Number(w.lng).toFixed(4)}
                    </div>
                  )}
                </div>
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
            <div
              key={m.key}
              style={{
                border: '1px solid',
                borderColor: m.enabled ? 'rgba(255,107,0,0.2)' : '#E5E7EB',
                borderRadius: 10,
                padding: '14px 16px',
                marginBottom: 10,
                background: m.enabled ? '#FFF9F5' : '#FAFAFA',
                transition: 'all 200ms',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: m.enabled ? 14 : 0 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: m.enabled ? '#111827' : '#6B7280' }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{m.description}</div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: 42, height: 24, flexShrink: 0, cursor: 'pointer' }}>
                  <input type="checkbox" checked={m.enabled} onChange={() => toggleMethod(m.key)} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{ position: 'absolute', inset: 0, borderRadius: 99, transition: '.3s', background: m.enabled ? '#FF6B00' : '#D1D5DB' }}>
                    <span
                      style={{
                        position: 'absolute',
                        height: 18,
                        width: 18,
                        borderRadius: '50%',
                        left: m.enabled ? 20 : 3,
                        top: 3,
                        background: 'white',
                        transition: '.3s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </span>
                </label>
              </div>
              {m.enabled && (
                <div style={{ display: 'grid', gridTemplateColumns: m.fields.length > 1 ? '1fr 1fr' : '1fr', gap: 12 }}>
                  {m.fields.map((field) => (
                    <div key={field.key}>
                      <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 5, fontWeight: 500 }}>{field.label}</label>
                      <input
                        type={field.type}
                        value={Number((m as any)[field.key] ?? field.default)}
                        onChange={(e) => updateMethod(m.key, field.key, parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, color: '#111827', outline: 'none' }}
                      />
                      {field.help && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{field.help}</div>}
                    </div>
                  ))}
                </div>
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
