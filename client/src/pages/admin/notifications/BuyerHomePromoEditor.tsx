import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { adminSiteContentAPI } from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

type Banner = {
  title: string;
  sub: string;
  cta: string;
  href: string;
  bg: string;
  emoji: string;
  enabled: boolean;
  sortOrder: number;
};

export default function BuyerHomePromoEditor() {
  const showToast = useToastStore((s) => s.showToast);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminSiteContentAPI
      .getHomePromoBanners()
      .then((r) => setBanners(Array.isArray(r.banners) ? r.banners : []))
      .catch(() => showToast('Could not load buyer home promos', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const update = (i: number, patch: Partial<Banner>) => {
    setBanners((prev) => prev.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  };

  const addRow = () => {
    setBanners((prev) => [
      ...prev,
      {
        title: 'New promo',
        sub: 'Description',
        cta: 'Shop',
        href: '/search',
        bg: 'linear-gradient(135deg,#6c63ff 0%,#4f46e5 100%)',
        emoji: '✨',
        enabled: true,
        sortOrder: prev.length,
      },
    ]);
  };

  const removeRow = (i: number) => setBanners((prev) => prev.filter((_, j) => j !== i));

  const save = async () => {
    setSaving(true);
    try {
      await adminSiteContentAPI.putHomePromoBanners(banners);
      showToast('Buyer home banners saved', 'success');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Buyer home page promos</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Controls the rotating hero promos on the public storefront (e.g. Free shipping, Mega sale). Up to 20
          slides.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200"
        >
          <Plus className="h-4 w-4" />
          Add slide
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      <div className="space-y-4">
        {banners.map((b, i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 grid gap-3 md:grid-cols-2"
          >
            <label className="flex items-center gap-2 text-sm col-span-2">
              <input
                type="checkbox"
                checked={b.enabled}
                onChange={(e) => update(i, { enabled: e.target.checked })}
              />
              <span className="text-gray-700 dark:text-gray-300">Enabled</span>
            </label>
            <div>
              <label className="text-xs font-semibold text-gray-500">Title</label>
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                value={b.title}
                onChange={(e) => update(i, { title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Emoji</label>
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                value={b.emoji}
                onChange={(e) => update(i, { emoji: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-500">Subtitle</label>
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                value={b.sub}
                onChange={(e) => update(i, { sub: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">CTA label</label>
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                value={b.cta}
                onChange={(e) => update(i, { cta: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Link (href)</label>
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                value={b.href}
                onChange={(e) => update(i, { href: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-500">Background (CSS gradient)</label>
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-xs font-mono"
                value={b.bg}
                onChange={(e) => update(i, { bg: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
