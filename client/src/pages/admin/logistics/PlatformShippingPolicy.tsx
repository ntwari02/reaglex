import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Save, MapPin, Truck } from 'lucide-react';
import { adminLogisticsAPI } from '@/lib/api';
import { pageTransition } from './logisticsAnimations';
import { Link } from 'react-router-dom';

export default function PlatformShippingPolicyPage() {
  const [policy, setPolicy] = useState<any>(null);
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminLogisticsAPI.getPlatformPolicy();
      setPolicy(res.policy);
      setContext(res.context);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await adminLogisticsAPI.updatePlatformPolicy(policy);
      setPolicy(res.policy);
      setContext(res.context);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const setLimit = (key: string, side: 'min' | 'max', val: string) => {
    setPolicy((p: any) => ({
      ...p,
      feeLimits: {
        ...p.feeLimits,
        [key]: { ...p.feeLimits[key], [side]: Number(val) || 0 },
      },
    }));
  };

  if (loading || !policy) {
    return <p className="p-8 text-center text-gray-500">Loading Rwanda platform policy…</p>;
  }

  return (
    <motion.div className="space-y-6" {...pageTransition}>
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Globe className="h-5 w-5 text-emerald-600" />
          Rwanda platform shipping policy
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          One rulebook for admin + sellers. Buyers pick a city in the header; quotes merge your zones, cities, and each seller&apos;s warehouse rates.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
          <h3 className="font-semibold text-emerald-900 dark:text-emerald-200 mb-2">Admin controls</h3>
          <ul className="text-sm space-y-1 text-emerald-800 dark:text-emerald-300 list-disc pl-4">
            {(context?.roles?.admin || []).map((r: string) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Link to="/admin/logistics?tab=destinations" className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 font-semibold border">
              <MapPin className="h-3.5 w-3.5" /> Deliver-to cities
            </Link>
            <Link to="/admin/logistics?tab=zones" className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 font-semibold border">
              <Truck className="h-3.5 w-3.5" /> Shipping zones
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-900 dark:bg-blue-950/20">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Seller controls (within your limits)</h3>
          <ul className="text-sm space-y-1 text-blue-800 dark:text-blue-300 list-disc pl-4">
            {(context?.roles?.seller || []).map((r: string) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-blue-700 dark:text-blue-400">
            {context?.destinations?.length || 0} delivery cities · {context?.zones?.length || 0} platform zones active
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm">
            Market
            <input
              value={policy.marketName}
              onChange={(e) => setPolicy({ ...policy, marketName: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            />
          </label>
          <label className="text-sm">
            Currency
            <input
              value={policy.currency}
              onChange={(e) => setPolicy({ ...policy, currency: e.target.value.toUpperCase() })}
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            />
          </label>
          <label className="text-sm">
            Free shipping threshold
            <input
              type="number"
              value={policy.platformFreeShippingThreshold ?? ''}
              onChange={(e) =>
                setPolicy({ ...policy, platformFreeShippingThreshold: Number(e.target.value) || 0 })
              }
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!policy.sellerCanDefineZones}
            onChange={(e) => setPolicy({ ...policy, sellerCanDefineZones: !e.target.checked })}
          />
          Platform manages zones (recommended — sellers use admin zones only)
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={policy.codEnabled !== false}
            onChange={(e) => setPolicy({ ...policy, codEnabled: e.target.checked })}
          />
          Allow cash on delivery (COD) at checkout for Rwanda
        </label>

        <div>
          <h4 className="text-sm font-semibold mb-2">Seller fee limits ({policy.currency})</h4>
          <div className="grid gap-3 md:grid-cols-2">
            {(['baseFee', 'ratePerKm', 'handlingFee', 'minShippingFee'] as const).map((key) => (
              <div key={key} className="flex gap-2 items-end">
                <label className="text-xs flex-1">
                  {key} min
                  <input
                    type="number"
                    value={policy.feeLimits[key].min}
                    onChange={(e) => setLimit(key, 'min', e.target.value)}
                    className="mt-1 w-full rounded-lg border px-2 py-1.5 dark:border-gray-700 dark:bg-gray-800"
                  />
                </label>
                <label className="text-xs flex-1">
                  max
                  <input
                    type="number"
                    value={policy.feeLimits[key].max}
                    onChange={(e) => setLimit(key, 'max', e.target.value)}
                    className="mt-1 w-full rounded-lg border px-2 py-1.5 dark:border-gray-700 dark:bg-gray-800"
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 items-end">
          <label className="text-sm">
            ETA min (days)
            <input
              type="number"
              value={policy.etaLimits.min}
              onChange={(e) =>
                setPolicy({
                  ...policy,
                  etaLimits: { ...policy.etaLimits, min: Number(e.target.value) || 1 },
                })
              }
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            />
          </label>
          <label className="text-sm">
            ETA max (days)
            <input
              type="number"
              value={policy.etaLimits.max}
              onChange={(e) =>
                setPolicy({
                  ...policy,
                  etaLimits: { ...policy.etaLimits, max: Number(e.target.value) || 7 },
                })
              }
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            />
          </label>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Allowed seller delivery methods</h4>
          <div className="flex flex-wrap gap-3">
            {(['standard', 'express', 'pickup', 'overnight', 'flat_rate', 'local_delivery'] as const).map((key) => {
              const enabled = (policy.enabledMethods || []).includes(key);
              return (
                <label key={key} className="flex items-center gap-2 text-sm capitalize">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => {
                      const current = policy.enabledMethods || [];
                      const next = enabled ? current.filter((m: string) => m !== key) : [...current, key];
                      setPolicy({ ...policy, enabledMethods: next });
                    }}
                  />
                  {key.replace('_', ' ')}
                </label>
              );
            })}
          </div>
        </div>

        <label className="text-sm block max-w-xs">
          Sales tax / VAT rate (checkout preview)
          <input
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={policy.salesTaxRate ?? 0.18}
            onChange={(e) => setPolicy({ ...policy, salesTaxRate: Number(e.target.value) || 0 })}
            className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
          />
          <span className="text-xs text-gray-500">0.18 = 18% (Rwanda VAT)</span>
        </label>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save platform policy'}
        </button>
      </div>
    </motion.div>
  );
}
