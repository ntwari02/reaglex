import React, { useEffect, useState } from 'react';
import {
  Image,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Eye,
  EyeOff,
  Calendar,
  Video,
} from 'lucide-react';
import { adminSiteContentAPI } from '@/lib/api';

export interface HeroCarouselSlide {
  eyebrow: string;
  line1: string;
  line2: string;
  detail: string;
  cta: string;
  href: string;
  imageUrl: string;
  videoUrl?: string;
  imgPosition: string;
  enabled: boolean;
  sortOrder: number;
  scheduledFrom?: string | null;
  scheduledTo?: string | null;
}

const EMPTY_SLIDE = (): HeroCarouselSlide => ({
  eyebrow: '',
  line1: 'New campaign',
  line2: '',
  detail: '',
  cta: 'Shop now',
  href: '/search',
  imageUrl: '',
  videoUrl: '',
  imgPosition: 'center center',
  enabled: true,
  sortOrder: 0,
});

export default function HeroCarouselManager() {
  const [slides, setSlides] = useState<HeroCarouselSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminSiteContentAPI
      .getHeroCarousel()
      .then((res) => setSlides(res.slides || []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const updateSlide = (index: number, patch: Partial<HeroCarouselSlide>) => {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    setSaved(false);
  };

  const moveSlide = (from: number, to: number) => {
    if (to < 0 || to >= slides.length) return;
    setSlides((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((s, i) => ({ ...s, sortOrder: i }));
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = slides.map((s, i) => ({ ...s, sortOrder: i }));
      const res = await adminSiteContentAPI.putHeroCarousel(payload);
      setSlides(res.slides);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Hero Carousel Manager</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Control home hero slides — images, video, CTAs, scheduling, and order.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setSlides((prev) => [...prev, { ...EMPTY_SLIDE(), sortOrder: prev.length }]);
              setSaved(false);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <Plus className="h-4 w-4" /> Add slide
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save carousel'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200">
          Carousel saved. Changes appear on the storefront immediately.
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">Loading slides…</p>
        </div>
      ) : (
        <div className="space-y-4">
          {slides.map((slide, index) => (
            <article
              key={`slide-${index}`}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  <GripVertical className="h-4 w-4 text-gray-400" />
                  Slide {index + 1}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveSlide(index, index - 1)}
                    className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSlide(index, index + 1)}
                    className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSlide(index, { enabled: !slide.enabled })}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                    title={slide.enabled ? 'Deactivate' : 'Activate'}
                  >
                    {slide.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlides((prev) => prev.filter((_, i) => i !== index))}
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Eyebrow
                  <input
                    value={slide.eyebrow}
                    onChange={(e) => updateSlide(index, { eyebrow: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </label>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                  CTA label
                  <input
                    value={slide.cta}
                    onChange={(e) => updateSlide(index, { cta: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </label>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Headline line 1
                  <input
                    value={slide.line1}
                    onChange={(e) => updateSlide(index, { line1: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </label>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Headline line 2 (accent)
                  <input
                    value={slide.line2}
                    onChange={(e) => updateSlide(index, { line2: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </label>
                <label className="md:col-span-2 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Subtitle
                  <textarea
                    value={slide.detail}
                    onChange={(e) => updateSlide(index, { detail: e.target.value })}
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </label>
                <label className="md:col-span-2 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  <Image className="mr-1 inline h-3.5 w-3.5" /> Image URL
                  <input
                    value={slide.imageUrl}
                    onChange={(e) => updateSlide(index, { imageUrl: e.target.value })}
                    placeholder="https://…"
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </label>
                <label className="md:col-span-2 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  <Video className="mr-1 inline h-3.5 w-3.5" /> Video URL (optional)
                  <input
                    value={slide.videoUrl || ''}
                    onChange={(e) => updateSlide(index, { videoUrl: e.target.value })}
                    placeholder="https://…mp4"
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </label>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Link (href)
                  <input
                    value={slide.href}
                    onChange={(e) => updateSlide(index, { href: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </label>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Image position
                  <input
                    value={slide.imgPosition}
                    onChange={(e) => updateSlide(index, { imgPosition: e.target.value })}
                    placeholder="center center"
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </label>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                  <Calendar className="mr-1 inline h-3.5 w-3.5" /> Schedule from
                  <input
                    type="datetime-local"
                    value={slide.scheduledFrom ? slide.scheduledFrom.slice(0, 16) : ''}
                    onChange={(e) =>
                      updateSlide(index, {
                        scheduledFrom: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </label>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Schedule to
                  <input
                    type="datetime-local"
                    value={slide.scheduledTo ? slide.scheduledTo.slice(0, 16) : ''}
                    onChange={(e) =>
                      updateSlide(index, {
                        scheduledTo: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </label>
              </div>

              {slide.imageUrl && (
                <div
                  className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
                  style={{ maxHeight: 140 }}
                >
                  <img src={slide.imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
