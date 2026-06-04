import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Plus, Trash2, Save } from 'lucide-react';
import { adminLogisticsAPI } from '@/lib/api';
import { pageTransition } from './logisticsAnimations';
import { Link } from 'react-router-dom';

const emptyForm = {
  countryCode: 'RW',
  countryName: 'Rwanda',
  city: '',
  region: '',
  displayLabel: '',
  extraEtaDays: 0,
  etaDaysMin: '',
  etaDaysMax: '',
  isActive: true,
  isDefault: false,
  sortOrder: 0,
};

export default function DeliveryDestinations() {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminLogisticsAPI.getDestinations();
      setDestinations(res.destinations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (d) => {
    setEditingId(d.id);
    setForm({
      countryCode: d.countryCode,
      countryName: d.countryName,
      city: d.city,
      region: d.region || '',
      displayLabel: d.displayLabel,
      extraEtaDays: d.extraEtaDays ?? 0,
      etaDaysMin: d.etaDaysMin ?? '',
      etaDaysMax: d.etaDaysMax ?? '',
      isActive: d.isActive !== false,
      isDefault: Boolean(d.isDefault),
      sortOrder: d.sortOrder ?? 0,
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        ...form,
        etaDaysMin: form.etaDaysMin === '' ? undefined : Number(form.etaDaysMin),
        etaDaysMax: form.etaDaysMax === '' ? undefined : Number(form.etaDaysMax),
        extraEtaDays: Number(form.extraEtaDays) || 0,
        sortOrder: Number(form.sortOrder) || 0,
        displayLabel:
          form.displayLabel.trim() ||
          `${form.city.trim()}, ${form.countryName.trim()}`,
      };
      if (editingId) {
        await adminLogisticsAPI.updateDestination(editingId, body);
      } else {
        await adminLogisticsAPI.createDestination(body);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this delivery destination?')) return;
    try {
      await adminLogisticsAPI.deleteDestination(id);
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <motion.div className="space-y-6" {...pageTransition}>
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Delivery destinations</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Cities and countries shown in the header “Deliver to …” picker. ETA overrides apply on top of seller warehouse rates and{' '}
          <Link to="/admin/logistics?tab=zones" className="font-semibold text-emerald-700 hover:underline">
            platform zones
          </Link>
          . Fee limits and allowed methods are set under{' '}
          <Link to="/admin/logistics?tab=platform" className="font-semibold text-emerald-700 hover:underline">
            Rwanda Policy
          </Link>
          .
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </p>
      )}

      <form
        onSubmit={handleSave}
        className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-2 lg:grid-cols-3"
      >
        <label className="text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">Country code</span>
          <input
            required
            value={form.countryCode}
            onChange={(e) => setForm((f) => ({ ...f, countryCode: e.target.value.toUpperCase() }))}
            className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">Country name</span>
          <input
            required
            value={form.countryName}
            onChange={(e) => setForm((f) => ({ ...f, countryName: e.target.value }))}
            className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">City / district</span>
          <input
            required
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            placeholder="Muhanga"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">Display label</span>
          <input
            value={form.displayLabel}
            onChange={(e) => setForm((f) => ({ ...f, displayLabel: e.target.value }))}
            className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            placeholder="Muhanga, Rwanda"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">Extra ETA days</span>
          <input
            type="number"
            min={0}
            value={form.extraEtaDays}
            onChange={(e) => setForm((f) => ({ ...f, extraEtaDays: e.target.value }))}
            className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">ETA min–max (optional)</span>
          <div className="mt-1 flex gap-2">
            <input
              type="number"
              min={0}
              value={form.etaDaysMin}
              onChange={(e) => setForm((f) => ({ ...f, etaDaysMin: e.target.value }))}
              className="w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              placeholder="Min"
            />
            <input
              type="number"
              min={0}
              value={form.etaDaysMax}
              onChange={(e) => setForm((f) => ({ ...f, etaDaysMax: e.target.value }))}
              className="w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              placeholder="Max"
            />
          </div>
        </label>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
          />
          Default for new visitors
        </label>
        <div className="flex gap-2 md:col-span-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <Save className="h-4 w-4" />
            {editingId ? 'Update' : 'Add destination'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="rounded-xl border px-4 py-2 text-sm">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-gray-500">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-left">
              <tr>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">ETA</th>
                <th className="px-4 py-3">Default</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {destinations.map((d) => (
                <tr key={d.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-emerald-600" />
                      <span className="font-medium">{d.displayLabel}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {d.etaDaysMin != null ? `${d.etaDaysMin}–${d.etaDaysMax}d` : `+${d.extraEtaDays}d`}
                  </td>
                  <td className="px-4 py-3">{d.isDefault ? '✓' : '—'}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button type="button" onClick={() => startEdit(d)} className="text-emerald-600 font-medium">
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(d.id)} className="text-red-600">
                      <Trash2 className="h-4 w-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}
