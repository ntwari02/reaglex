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
type AddressSelection = { lat: number | string; lng: number | string; address: string; country: string };

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

const SellerShippingSettings: React.FC = () => {
  const { showToast } = useToastStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsShape>(emptySettings);
  const [initialSnapshot, setInitialSnapshot] = useState('');
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
          setInitialSnapshot(JSON.stringify(merged));
        } else {
          const fallback = { ...emptySettings(), methods: loadMethods() };
          setSettings(fallback);
          setInitialSnapshot(JSON.stringify(fallback));
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
      setInitialSnapshot(JSON.stringify(settings));
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

  const hasUnsavedChanges = initialSnapshot !== '' && JSON.stringify(settings) !== initialSnapshot;
  const discardChanges = () => {
    if (!initialSnapshot) return;
    try {
      setSettings(JSON.parse(initialSnapshot) as SettingsShape);
      showToast('Changes discarded.', 'success');
    } catch {
      showToast('Could not discard changes.', 'error');
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-3 pb-32 pt-2 sm:px-6">
      <style>{`
        .ship-page { background: #f8fafc; overflow-x: hidden; }
        .ship-header { border-bottom: 1px solid #e5e7eb; padding: 10px 0 16px; margin-bottom: 18px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .ship-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06); margin-bottom: 16px; }
        .ship-card-head { padding: 16px 18px 10px; border-bottom: 1px solid #f1f5f9; }
        .ship-card-body { padding: 16px 18px; }
        .ship-input { width: 100%; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; padding: 10px 12px; font-size: 14px; color: #111827; outline: none; }
        .ship-input:focus { border-color: #ff6b00; box-shadow: 0 0 0 3px rgba(255,107,0,.14); }
        .ship-label { display: block; font-size: 12px; font-weight: 600; color: #4b5563; margin-bottom: 6px; }
        .ship-help { font-size: 11px; color: #9ca3af; margin-top: 4px; }
        .ship-save-sticky { position: fixed; left: 16px; right: 16px; bottom: 16px; z-index: 50; border: 1px solid #e5e7eb; background: rgba(255,255,255,.98); border-radius: 12px; box-shadow: 0 10px 26px rgba(2,6,23,.10); padding: 10px 12px; display: flex; align-items: center; gap: 10px; }
        @media (max-width: 768px) {
          .ship-header { flex-direction: column; align-items: stretch; }
          .ship-save-top-btn { width: 100%; justify-content: center; }
          .ship-grid-2 { grid-template-columns: 1fr !important; }
          .ship-card-head { padding: 14px 14px 9px; }
          .ship-card-body { padding: 14px; }
          .ship-save-sticky { flex-direction: column; align-items: stretch; }
          input, textarea, select { font-size: 16px !important; }
        }
      `}</style>
      <div className="ship-page">
      <div className="ship-header">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
            <Truck className="h-4 w-4" /> Shipping
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Shipping Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure delivery defaults, warehouse origins, methods, and zones in one place.
          </p>
        </div>
        <Button type="button" disabled={saving} onClick={save} className="ship-save-top-btn rounded-lg bg-[var(--brand-primary)] px-5">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save settings
        </Button>
      </div>

      <section className="ship-card">
        <div className="ship-card-head">
          <h2 className="text-lg font-semibold text-gray-900">Default Fees</h2>
          <p className="text-xs text-gray-500">Set your baseline shipping pricing model.</p>
        </div>
        <div className="ship-card-body">
        <div className="ship-grid-2 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="ship-label">Base fee</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">RWF</span>
            Base fee
            <input
              type="number"
              className="ship-input pl-12"
              value={settings.defaults.baseFee}
              onChange={(e) =>
                setSettings((s) => ({ ...s, defaults: { ...s.defaults, baseFee: Number(e.target.value) || 0 } }))
              }
            />
            </div>
            <div className="ship-help">Base cost applied to every shipment.</div>
          </label>
          <label>
            <span className="ship-label">Rate per km</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">RWF</span>
            <input
              type="number"
              step="0.01"
              className="ship-input pl-12"
              value={settings.defaults.ratePerKm}
              onChange={(e) =>
                setSettings((s) => ({ ...s, defaults: { ...s.defaults, ratePerKm: Number(e.target.value) || 0 } }))
              }
            />
            </div>
            <div className="ship-help">Distance multiplier for route-based pricing.</div>
          </label>
          <label>
            <span className="ship-label">Handling fee</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">RWF</span>
            <input
              type="number"
              className="ship-input pl-12"
              value={settings.defaults.handlingFee}
              onChange={(e) =>
                setSettings((s) => ({ ...s, defaults: { ...s.defaults, handlingFee: Number(e.target.value) || 0 } }))
              }
            />
            </div>
            <div className="ship-help">Packaging and processing surcharge.</div>
          </label>
          <label>
            <span className="ship-label">Minimum shipping</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">RWF</span>
            <input
              type="number"
              className="ship-input pl-12"
              value={settings.defaults.minShippingFee}
              onChange={(e) =>
                setSettings((s) => ({ ...s, defaults: { ...s.defaults, minShippingFee: Number(e.target.value) || 0 } }))
              }
            />
            </div>
            <div className="ship-help">Never charge below this amount.</div>
          </label>
          <label className="sm:col-span-2">
            <span className="ship-label">Free shipping over (seller-wide, optional)</span>
            <input
              type="number"
              className="ship-input"
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
            <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
              Orders above this threshold can automatically qualify for free shipping.
            </div>
          </label>
        </div>
        </div>
      </section>

      <section className="ship-card">
        <div className="ship-card-head flex items-center justify-between gap-2">
          <div>
          <h2 className="text-lg font-semibold text-gray-900">Warehouses</h2>
          <p className="text-xs text-gray-500">Set pickup origins and location coordinates.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addWarehouse}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
        <div className="ship-card-body space-y-4">
          {settings.warehouses.map((w, idx) => (
            <div key={w.warehouseId + idx} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-start justify-between">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Truck className="h-4 w-4 text-orange-500" /> Origin #{idx + 1}
                </div>
                {settings.warehouses.length > 1 && (
                  <button
                    type="button"
                    className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    onClick={() => removeWarehouse(idx)}
                    aria-label="Remove warehouse"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="ship-grid-2 grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="ship-label">Warehouse ID</span>
                  <input className="ship-input" value={w.warehouseId} onChange={(e) => updateWarehouse(idx, { warehouseId: e.target.value })} />
                </label>
                <label>
                  <span className="ship-label">Display label</span>
                  <input className="ship-input" value={w.label} onChange={(e) => updateWarehouse(idx, { label: e.target.value })} />
                </label>
                <div className="sm:col-span-2">
                  <label className="ship-label">Warehouse location</label>
                  <AddressSearchInput
                    value={{ lat: w.lat, lng: w.lng, address: w.address || '', country: w.country || '' }}
                    onChange={({ lat, lng, address, country }: AddressSelection) => {
                      updateWarehouse(idx, { lat: Number(lat) || 0, lng: Number(lng) || 0, address, country });
                    }}
                    required
                  />
                  {w.lat && w.lng && (
                    <div className="ship-help">
                      Coordinates: {Number(w.lat).toFixed(4)}, {Number(w.lng).toFixed(4)}
                    </div>
                  )}
                </div>
                <label>
                  <span className="ship-label">Country</span>
                  <input className="ship-input" value={w.country || ''} onChange={(e) => updateWarehouse(idx, { country: e.target.value })} />
                </label>
                <label className="flex items-center gap-2 pt-7 text-sm text-gray-700">
                  <input style={{ accentColor: '#ff6b00' }}
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

      <section className="ship-card">
        <div className="ship-card-head">
          <h2 className="text-lg font-semibold text-gray-900">Shipping Methods</h2>
          <p className="text-xs text-gray-500">Enable methods and configure each one only when needed.</p>
        </div>
        <div className="ship-card-body space-y-3">
          {settings.methods.map((m) => (
            <div
              key={m.key}
              style={{
                border: '1px solid',
                borderColor: m.enabled ? 'rgba(255,107,0,0.25)' : '#E5E7EB',
                borderRadius: 12,
                padding: '14px',
                marginBottom: 10,
                background: m.enabled ? '#fff9f5' : '#fff',
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
                <div className="ship-grid-2" style={{ display: 'grid', gridTemplateColumns: m.fields.length > 1 ? '1fr 1fr' : '1fr', gap: 12 }}>
                  {m.fields.map((field) => (
                    <div key={field.key}>
                      <label className="ship-label">{field.label}</label>
                      <input
                        type={field.type}
                        value={Number((m as any)[field.key] ?? field.default)}
                        onChange={(e) => updateMethod(m.key, field.key, parseFloat(e.target.value) || 0)}
                        className="ship-input"
                      />
                      {field.help && <div className="ship-help">{field.help}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="ship-card">
        <div className="ship-card-head flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Delivery Zones</h2>
            <p className="text-xs text-gray-500">Apply country-based surcharges when needed.</p>
          </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setSettings((s) => ({
              ...s,
              zones: [...s.zones, { id: `z_${Date.now()}`, name: 'Zone', countryCodes: ['RW'], surcharge: 0 }],
            }))
          }
        >
          <Plus className="mr-1 h-4 w-4" /> Add zone
        </Button>
        </div>
        <div className="ship-card-body">
        <div className="space-y-3">
          {settings.zones.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              No delivery zones yet. Add a zone to customize country-level surcharges.
            </div>
          )}
          {settings.zones.map((z, zi) => (
            <div key={z.id} className="ship-grid-2 grid items-end gap-3 rounded-lg border border-gray-100 p-3 sm:grid-cols-[1.1fr_1.3fr_.8fr_auto]">
              <label>
                <span className="ship-label">Zone name</span>
                <input
                  className="ship-input"
                  value={z.name}
                  onChange={(e) => {
                    const zones = [...settings.zones];
                    zones[zi] = { ...z, name: e.target.value };
                    setSettings((s) => ({ ...s, zones }));
                  }}
                />
              </label>
              <label>
                <span className="ship-label">Countries (comma, ISO2)</span>
                <input
                  className="ship-input min-w-[140px]"
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
              <label>
                <span className="ship-label">Surcharge</span>
                <input
                  type="number"
                  className="ship-input w-24"
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
                className="mb-0.5 rounded-md border border-gray-200 px-2 py-2 text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                onClick={() => setSettings((s) => ({ ...s, zones: s.zones.filter((_, i) => i !== zi) }))}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        </div>
      </section>

      {hasUnsavedChanges && (
        <div className="ship-save-sticky">
          <span className="text-sm font-medium text-gray-700">You have unsaved shipping changes.</span>
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" onClick={discardChanges}>
              Discard
            </Button>
            <Button type="button" disabled={saving} className="bg-[var(--brand-primary)]" onClick={save}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default SellerShippingSettings;
