import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { adminIntelligenceSearchApi } from '@/services/adminIntelligenceSearchApi';
import { useToastStore } from '@/stores/toastStore';

export default function AdminIntelligencePlatformSettings() {
  const showToast = useToastStore((s) => s.showToast);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [platformAiEnabled, setPlatformAiEnabled] = useState(true);

  useEffect(() => {
    adminIntelligenceSearchApi
      .getConfig()
      .then((cfg) => {
        setGeminiConfigured(cfg.geminiConfigured);
        setPlatformAiEnabled(cfg.platformAiEnabled !== false);
      })
      .catch(() => showToast('Could not load intelligence settings', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const onTogglePlatform = async () => {
    if (!geminiConfigured || saving) return;
    setSaving(true);
    try {
      const next = !platformAiEnabled;
      const cfg = await adminIntelligenceSearchApi.setPlatformAi(next);
      setPlatformAiEnabled(cfg.platformAiEnabled !== false);
      showToast(next ? 'Gemini assist enabled platform-wide' : 'Gemini assist disabled platform-wide', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm py-4" style={{ color: 'var(--text-secondary)' }}>
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading intelligence settings…
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-5 mb-6"
      style={{ borderColor: 'var(--border-card)', background: 'var(--bg-card, transparent)' }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Sparkles className="w-5 h-5 text-violet-500" />
            Smart search (Gemini)
          </h2>
          <p className="text-sm mt-1 max-w-xl" style={{ color: 'var(--text-secondary)' }}>
            Platform master switch for optional Gemini assist in admin intelligence search (Ctrl+K). Each admin can
            still opt in individually when this is on.
          </p>
        </div>
        <button
          type="button"
          disabled={!geminiConfigured || saving}
          onClick={() => void onTogglePlatform()}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            platformAiEnabled
              ? 'bg-violet-600 text-white hover:bg-violet-500'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          } disabled:opacity-50`}
        >
          {saving ? 'Saving…' : platformAiEnabled ? 'Platform AI: On' : 'Platform AI: Off'}
        </button>
      </div>
      {!geminiConfigured && (
        <p className="text-sm mt-3 text-amber-600 dark:text-amber-400">
          Set <code className="text-xs">GEMINI_API_KEY</code> on the server to enable Gemini assist.
        </p>
      )}
      <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
        Rule-based registry search always runs first — fast, audited, and works without AI.
      </p>
    </div>
  );
}
