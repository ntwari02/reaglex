import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutGrid,
  Monitor,
  Smartphone,
  RotateCcw,
  Save,
  ChevronDown,
  Info,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToastStore } from '@/stores/toastStore';
import { adminSystemFeaturesApi } from '@/services/adminSystemFeaturesApi';
import { useInvalidateHomeLayout } from '@/hooks/useHomeLayoutConfig';
import HomeLayoutPreview from '@/components/admin/home-layout/HomeLayoutPreview';
import {
  DEFAULT_HOME_LAYOUT,
  HOME_LAYOUT_MODE_OPTIONS,
  HOME_LAYOUT_SECTION_META,
  HOME_CARD_DENSITY_OPTIONS,
  PUBLISH_LAYOUT_ACK,
  buildResolvedHomeLayout,
} from '@/constants/buyerHomeLayoutDefaults';
import '@/styles/home-layout-cards.css';

type Viewport = 'mobile' | 'desktop';
type SectionId = keyof typeof DEFAULT_HOME_LAYOUT;
type LayoutMode = 'grid' | 'trending_rail' | 'horizontal_carousel' | 'ai_hero';
type CardDensity = 'standard' | 'compact' | 'compact_expandable';

type LayoutSettings = {
  mode: LayoutMode;
  railCount?: number;
  gridColumns?: 2 | 3 | 4;
  autoScroll?: boolean;
  autoScrollStep?: number;
  duplicateLoop?: boolean;
  cardDensity?: CardDensity;
};

type Draft = Partial<Record<SectionId, { mobile?: LayoutSettings; desktop?: LayoutSettings }>>;

const SECTION_IDS = Object.keys(DEFAULT_HOME_LAYOUT) as SectionId[];

export default function HomeLayoutDangerPanel() {
  const showToast = useToastStore((s) => s.showToast);
  const invalidate = useInvalidateHomeLayout();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewport, setViewport] = useState<Viewport>('mobile');
  const [activeSection, setActiveSection] = useState<SectionId>('trending');
  const [draft, setDraft] = useState<Draft>({});
  const [published, setPublished] = useState<Draft>({});
  const [hasUnpublished, setHasUnpublished] = useState(false);
  const [expandedHelp, setExpandedHelp] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishPassword, setPublishPassword] = useState('');
  const [publishAck, setPublishAck] = useState(false);
  const [publishPhrase, setPublishPhrase] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminSystemFeaturesApi.getHomeLayout();
      setDraft((data?.draftOverrides as Draft) || {});
      setPublished((data?.publishedOverrides as Draft) || {});
      setHasUnpublished(Boolean(data?.hasUnpublishedChanges));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to load layouts', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const previewDraft = useMemo(() => buildResolvedHomeLayout(draft), [draft]);
  const previewPublished = useMemo(() => buildResolvedHomeLayout(published), [published]);

  const currentSettings = useMemo(() => {
    const patch = draft[activeSection]?.[viewport];
    const def = DEFAULT_HOME_LAYOUT[activeSection][viewport];
    return { ...def, ...patch } as LayoutSettings;
  }, [draft, activeSection, viewport]);

  const setDraftField = (patch: Partial<LayoutSettings>) => {
    setDraft((prev) => ({
      ...prev,
      [activeSection]: {
        ...prev[activeSection],
        [viewport]: {
          ...(prev[activeSection]?.[viewport] || {}),
          ...patch,
        },
      },
    }));
    setHasUnpublished(true);
  };

  const applyMode = (mode: LayoutMode) => {
    const def = DEFAULT_HOME_LAYOUT[activeSection][viewport];
    if (mode === def.mode && (def.cardDensity || 'standard') === (currentSettings.cardDensity || 'standard')) {
      setDraft((prev) => {
        const next = { ...prev };
        const entry = { ...next[activeSection] };
        if (entry[viewport]) {
          const { [viewport]: _, ...rest } = entry;
          if (Object.keys(rest).length) next[activeSection] = rest as typeof entry;
          else delete next[activeSection];
        }
        return next;
      });
      return;
    }
    setDraftField({ mode });
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      const data = await adminSystemFeaturesApi.saveHomeLayoutDraft(draft);
      setDraft((data?.draftOverrides as Draft) || draft);
      setPublished((data?.publishedOverrides as Draft) || published);
      setHasUnpublished(Boolean(data?.hasUnpublishedChanges));
      showToast('Draft saved (not live yet)', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const publishLive = async () => {
    if (!publishAck) {
      showToast('Accept the publish statement', 'error');
      return;
    }
    if (publishPhrase.trim().toUpperCase() !== 'PUBLISH') {
      showToast('Type PUBLISH', 'error');
      return;
    }
    setSaving(true);
    try {
      await adminSystemFeaturesApi.saveHomeLayoutDraft(draft);
      const data = await adminSystemFeaturesApi.publishHomeLayout({
        superAdminPassword: publishPassword,
        acknowledgment: PUBLISH_LAYOUT_ACK,
        confirmPhrase: publishPhrase,
      });
      setDraft((data?.draftOverrides as Draft) || {});
      setPublished((data?.publishedOverrides as Draft) || {});
      setHasUnpublished(false);
      invalidate();
      setPublishOpen(false);
      setPublishPassword('');
      setPublishPhrase('');
      showToast('Published to live website', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Publish failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetAll = async () => {
    if (!window.confirm('Reset ALL homepage layouts to factory defaults and publish immediately?')) return;
    setSaving(true);
    try {
      const data = await adminSystemFeaturesApi.resetHomeLayout();
      setDraft({});
      setPublished({});
      setHasUnpublished(false);
      invalidate();
      showToast('Reset to factory defaults', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Reset failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm py-8" style={{ color: 'var(--text-muted)' }}>Loading layouts…</p>;
  }

  return (
    <div className="home-layout-danger-panel space-y-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Homepage cards & layout
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Adjust phone/PC product sections and card size. Preview shows your <strong>draft</strong> before
            publish. Live buyers only see changes after you publish. Factory default = current site.
          </p>
          {hasUnpublished && (
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mt-2">
              Unpublished draft changes — not visible on the storefront yet.
            </p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border ${
                viewport === 'mobile' ? 'bg-red-700 text-white border-red-700' : ''
              }`}
            >
              <Smartphone className="w-4 h-4" /> Phone
            </button>
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border ${
                viewport === 'desktop' ? 'bg-red-700 text-white border-red-700' : ''
              }`}
            >
              <Monitor className="w-4 h-4" /> PC
            </button>
            <button
              type="button"
              onClick={() => setShowLivePreview((v) => !v)}
              className="text-xs font-semibold underline ml-auto"
              style={{ color: 'var(--text-muted)' }}
            >
              {showLivePreview ? 'Hide live comparison' : 'Compare to live'}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SECTION_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                  activeSection === id ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : ''
                }`}
              >
                {HOME_LAYOUT_SECTION_META[id].label}
              </button>
            ))}
          </div>

          <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--border-card)' }}>
            <h3 className="font-bold text-sm">
              {HOME_LAYOUT_SECTION_META[activeSection].label} · {viewport === 'mobile' ? 'Phone' : 'PC'}
            </h3>

            <button
              type="button"
              className="flex items-center gap-2 text-xs font-semibold"
              onClick={() => setExpandedHelp((v) => !v)}
            >
              <Info className="w-3.5 h-3.5" /> How modes work
              <ChevronDown className={`w-3.5 h-3.5 transition ${expandedHelp ? 'rotate-180' : ''}`} />
            </button>
            {expandedHelp && (
              <ul className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                {HOME_LAYOUT_MODE_OPTIONS.map((o) => (
                  <li key={o.value}>
                    <strong>{o.label}:</strong> {o.hint}
                  </li>
                ))}
              </ul>
            )}

            <fieldset className="space-y-2">
              <legend className="text-xs font-bold uppercase tracking-wide">Layout</legend>
              {HOME_LAYOUT_MODE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex gap-2 p-2 rounded-lg border cursor-pointer text-sm ${
                    currentSettings.mode === opt.value ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name={`mode-${activeSection}-${viewport}`}
                    checked={currentSettings.mode === opt.value}
                    onChange={() => applyMode(opt.value as LayoutMode)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-xs font-bold uppercase tracking-wide">Card style</legend>
              {HOME_CARD_DENSITY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex gap-2 p-2 rounded-lg border cursor-pointer text-sm ${
                    (currentSettings.cardDensity || 'standard') === opt.value
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name={`density-${activeSection}-${viewport}`}
                    checked={(currentSettings.cardDensity || 'standard') === opt.value}
                    onChange={() => setDraftField({ cardDensity: opt.value as CardDensity })}
                  />
                  <span>
                    <span className="font-semibold block">{opt.label}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {opt.hint}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>

            {currentSettings.mode === 'trending_rail' && (
              <label className="block text-sm">
                Horizontal cards
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={currentSettings.railCount ?? 4}
                  onChange={(e) => setDraftField({ railCount: Number(e.target.value) })}
                  className="mt-1 w-20 rounded border px-2 py-1 dark:bg-gray-800"
                />
              </label>
            )}

            {['grid', 'trending_rail', 'ai_hero'].includes(currentSettings.mode) && (
              <label className="block text-sm">
                Grid columns
                <select
                  value={currentSettings.gridColumns ?? (viewport === 'mobile' ? 2 : 4)}
                  onChange={(e) =>
                    setDraftField({ gridColumns: Number(e.target.value) as 2 | 3 | 4 })
                  }
                  className="mt-1 block rounded border px-2 py-1 dark:bg-gray-800"
                >
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </label>
            )}

            {currentSettings.mode === 'horizontal_carousel' && (
              <div className="space-y-2 text-sm border rounded-lg p-2">
                <label className="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    checked={currentSettings.autoScroll ?? true}
                    onChange={(e) => setDraftField({ autoScroll: e.target.checked })}
                  />
                  Auto-scroll
                </label>
                <label className="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    checked={currentSettings.duplicateLoop ?? true}
                    onChange={(e) => setDraftField({ duplicateLoop: e.target.checked })}
                  />
                  Seamless loop
                </label>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void saveDraft()} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />
              Save draft
            </Button>
            <Button onClick={() => setPublishOpen(true)} disabled={saving}>
              <Upload className="w-4 h-4 mr-1" />
              Publish live
            </Button>
            <Button variant="outline" onClick={() => void resetAll()} disabled={saving}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Factory reset
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <HomeLayoutPreview
            viewport={viewport}
            sectionId={activeSection}
            draftOverrides={draft}
            comparingLive={false}
          />
          {showLivePreview && (
            <HomeLayoutPreview
              viewport={viewport}
              sectionId={activeSection}
              draftOverrides={published}
              comparingLive
            />
          )}
        </div>
      </div>

      {publishOpen && (
        <div className="system-features-modal-backdrop">
          <div className="system-features-modal" role="dialog">
            <h3 className="text-lg font-bold text-red-700">Publish to live website</h3>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              Buyers will see these layouts on the homepage immediately.
            </p>
            <input
              type="password"
              placeholder="Super admin password"
              value={publishPassword}
              onChange={(e) => setPublishPassword(e.target.value)}
              className="mt-3 w-full rounded-lg border px-3 py-2 dark:bg-gray-800"
            />
            <input
              placeholder="Type PUBLISH"
              value={publishPhrase}
              onChange={(e) => setPublishPhrase(e.target.value)}
              className="mt-2 w-full rounded-lg border px-3 py-2 font-mono dark:bg-gray-800"
            />
            <label className="flex gap-2 mt-3 text-xs">
              <input type="checkbox" checked={publishAck} onChange={(e) => setPublishAck(e.target.checked)} />
              <span>{PUBLISH_LAYOUT_ACK}</span>
            </label>
            <div className="flex gap-2 mt-4">
              <Button variant="destructive" onClick={() => void publishLive()} disabled={saving}>
                Publish now
              </Button>
              <Button variant="outline" onClick={() => setPublishOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
