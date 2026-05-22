import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Radio, Shield, Settings2, Video, Users, Save, Search } from 'lucide-react';
import { liveCommerceApi } from '@/services/liveCommerceApi';

const STREAM_PROVIDERS: { id: string; label: string; hint?: string }[] = [
  { id: 'webrtc', label: 'WebRTC (P2P)', hint: 'Browser camera · 2–10 viewers' },
  { id: 'youtube', label: 'YouTube Live', hint: 'Scalable embed / OBS' },
  { id: 'selfhosted', label: 'Self-hosted RTMP/HLS' },
];

const STUB_PROVIDERS = [
  { id: 'livekit', label: 'LiveKit (stub)' },
  { id: 'agora', label: 'Agora (stub)' },
  { id: 'mux', label: 'Mux (stub)' },
  { id: 'aws-ivs', label: 'AWS IVS (stub)' },
  { id: 'cloudflare', label: 'Cloudflare (stub)' },
  { id: 'vimeo', label: 'Vimeo (stub)' },
];

const PERMISSION_MODES = [
  {
    id: 'allowlist',
    title: 'Allowlist (recommended)',
    desc: 'Only sellers you approve once can go live. Approval is per seller account — not per session.',
  },
  {
    id: 'verified_sellers',
    title: 'All verified sellers',
    desc: 'Any seller with completed verification can go live without individual approval.',
  },
];

const FEATURE_LABELS: Record<string, string> = {
  auctions: 'Auctions',
  instantBuy: 'Instant buy',
  reactions: 'Reactions',
  tipping: 'Tipping',
  aiInsights: 'AI insights',
  chat: 'Chat',
  replay: 'Replay',
  recording: 'Recording',
  autoBidding: 'Auto bidding',
};

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="lc-toggle-row">
      <div>
        <p className="lc-toggle-label">{label}</p>
        {hint && <p className="lc-toggle-hint">{hint}</p>}
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export default function LiveCommerceControl() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['live-commerce', 'admin-settings'],
    queryFn: () => liveCommerceApi.getAdminSettings(),
  });

  const { data: sessionsData } = useQuery({
    queryKey: ['live-commerce', 'admin-sessions'],
    queryFn: () => liveCommerceApi.getAdminSessions(),
  });

  const [sellerSearch, setSellerSearch] = useState('');
  const [draft, setDraft] = useState<any>(null);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    if (data?.settings) {
      const s = data.settings;
      setDraft({
        ...s,
        livePermissionMode:
          s.livePermissionMode || (s.requireSellerApproval === false ? 'verified_sellers' : 'allowlist'),
      });
    }
  }, [data]);

  const { data: sellersData, refetch: refetchSellers } = useQuery({
    queryKey: ['live-commerce', 'admin-seller-permissions', sellerSearch],
    queryFn: () => liveCommerceApi.getAdminSellerLivePermissions({ q: sellerSearch || undefined }),
    enabled: draft?.livePermissionMode === 'allowlist',
  });

  const saveMutation = useMutation({
    mutationFn: (payload: unknown) => liveCommerceApi.updateAdminSettings(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['live-commerce', 'admin-settings'] });
      setSaveMsg('Settings saved');
      setTimeout(() => setSaveMsg(''), 3000);
    },
  });

  const patchSession = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) =>
      liveCommerceApi.patchAdminSession(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['live-commerce', 'admin-sessions'] }),
  });

  const permissionMutation = useMutation({
    mutationFn: ({ sellerId, approved }: { sellerId: string; approved: boolean }) =>
      liveCommerceApi.setSellerLivePermission(sellerId, approved),
    onSuccess: () => refetchSellers(),
  });

  if (isLoading || !draft) {
    return <p className="text-sm text-gray-500">Loading live commerce controls…</p>;
  }

  const features = draft.features || {};
  const streaming = draft.streaming || {
    defaultProvider: 'webrtc',
    webrtcMaxViewers: 10,
    providers: {},
  };
  const providerFlags = streaming.providers || {};
  const permissionMode = draft.livePermissionMode || 'allowlist';

  const setProviderEnabled = (id: string, enabled: boolean) => {
    setDraft({
      ...draft,
      streaming: {
        ...streaming,
        providers: { ...providerFlags, [id]: { enabled } },
      },
    });
  };

  const enabledForDefault = [...STREAM_PROVIDERS, ...STUB_PROVIDERS].filter(
    (p) => providerFlags[p.id]?.enabled
  );

  const persistDraft = () => {
    const payload = {
      ...draft,
      requireSellerApproval: permissionMode === 'allowlist',
      livePermissionMode: permissionMode,
    };
    saveMutation.mutate(payload);
  };

  return (
    <div className="lc-admin max-w-5xl space-y-6 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Radio className="text-orange-500" />
            Live Commerce Control
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Platform live settings, seller permissions, streaming providers, and active sessions.
          </p>
        </div>
        <button
          type="button"
          className="lc-save-btn"
          disabled={saveMutation.isPending}
          onClick={persistDraft}
        >
          <Save size={16} />
          {saveMutation.isPending ? 'Saving…' : 'Save all settings'}
        </button>
        {saveMsg && <span className="text-sm text-emerald-600 font-medium">{saveMsg}</span>}
      </div>

      {/* Platform */}
      <section className="lc-panel">
        <h2 className="lc-panel-title">Platform</h2>
        <ToggleRow
          label="Enable LIVE globally"
          hint="When off, live is hidden and no seller can start a session."
          checked={Boolean(draft.globallyEnabled)}
          onChange={(v) => setDraft({ ...draft, globallyEnabled: v })}
        />
        <label className="block text-sm mt-4">
          <span className="text-gray-600 dark:text-gray-400">Max session duration (minutes)</span>
          <input
            type="number"
            min={15}
            max={480}
            className="lc-input mt-1 w-full max-w-xs"
            value={draft.maxDurationMinutes}
            onChange={(e) =>
              setDraft({ ...draft, maxDurationMinutes: Number(e.target.value) || 180 })
            }
          />
        </label>
      </section>

      {/* Who can go live */}
      <section className="lc-panel">
        <h2 className="lc-panel-title flex items-center gap-2">
          <Users size={18} />
          Who can go live
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Not every user can stream. Sellers still need verification and email confirmed. Live approval
          is one-time per seller — not repeated for each session.
        </p>
        <div className="space-y-3">
          {PERMISSION_MODES.map((mode) => (
            <label
              key={mode.id}
              className={`lc-radio-card${permissionMode === mode.id ? ' is-selected' : ''}`}
            >
              <input
                type="radio"
                name="livePermissionMode"
                checked={permissionMode === mode.id}
                onChange={() =>
                  setDraft({
                    ...draft,
                    livePermissionMode: mode.id,
                    requireSellerApproval: mode.id === 'allowlist',
                  })
                }
              />
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{mode.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{mode.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {permissionMode === 'allowlist' && (
          <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-5">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Approved sellers (allowlist)
            </p>
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="search"
                  placeholder="Search store or email…"
                  className="lc-input w-full pl-9"
                  value={sellerSearch}
                  onChange={(e) => setSellerSearch(e.target.value)}
                />
              </div>
            </div>
            <ul className="lc-seller-list">
              {(sellersData?.sellers || []).map((s: any) => (
                <li key={s.id} className="lc-seller-row">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{s.storeName || s.email}</p>
                    <p className="text-xs text-gray-500 truncate">{s.email}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      KYC: {s.sellerVerificationStatus || 'unknown'}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium shrink-0">
                    <input
                      type="checkbox"
                      checked={Boolean(s.liveCommerceApproved)}
                      disabled={permissionMutation.isPending}
                      onChange={(e) =>
                        permissionMutation.mutate({ sellerId: s.id, approved: e.target.checked })
                      }
                    />
                    Can go live
                  </label>
                </li>
              ))}
              {!(sellersData?.sellers || []).length && (
                <li className="text-sm text-gray-500 py-4 text-center">No sellers match your search.</li>
              )}
            </ul>
          </div>
        )}
      </section>

      {/* Streaming */}
      <section className="lc-panel">
        <h2 className="lc-panel-title flex items-center gap-2">
          <Video size={18} />
          Streaming providers
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Enable what sellers can pick. WebRTC + YouTube are production-ready; others are stubs.
        </p>
        <div className="grid sm:grid-cols-2 gap-2 mb-4">
          {STREAM_PROVIDERS.map((p) => (
            <label key={p.id} className="lc-check-card">
              <input
                type="checkbox"
                checked={Boolean(providerFlags[p.id]?.enabled)}
                onChange={(e) => setProviderEnabled(p.id, e.target.checked)}
              />
              <div>
                <span className="font-medium text-sm">{p.label}</span>
                {p.hint && <span className="block text-[10px] text-gray-500">{p.hint}</span>}
              </div>
            </label>
          ))}
        </div>
        <details className="text-sm mb-4">
          <summary className="cursor-pointer text-gray-500">Experimental / stub providers</summary>
          <div className="grid sm:grid-cols-2 gap-2 mt-2">
            {STUB_PROVIDERS.map((p) => (
              <label key={p.id} className="lc-check-card opacity-80">
                <input
                  type="checkbox"
                  checked={Boolean(providerFlags[p.id]?.enabled)}
                  onChange={(e) => setProviderEnabled(p.id, e.target.checked)}
                />
                <span>{p.label}</span>
              </label>
            ))}
          </div>
        </details>

        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Default provider for new sessions</p>
        <div className="flex flex-wrap gap-2">
          {enabledForDefault.map((p) => (
            <label key={p.id} className="lc-radio-pill">
              <input
                type="radio"
                name="defaultProvider"
                checked={streaming.defaultProvider === p.id}
                onChange={() =>
                  setDraft({
                    ...draft,
                    streaming: { ...streaming, defaultProvider: p.id },
                  })
                }
              />
              {p.label}
            </label>
          ))}
        </div>

        <label className="block text-sm mt-4">
          <span className="text-gray-600 dark:text-gray-400">WebRTC max viewers (P2P)</span>
          <input
            type="number"
            min={2}
            max={20}
            className="lc-input mt-1 w-28"
            value={streaming.webrtcMaxViewers ?? 10}
            onChange={(e) =>
              setDraft({
                ...draft,
                streaming: {
                  ...streaming,
                  webrtcMaxViewers: Math.min(20, Math.max(2, Number(e.target.value) || 10)),
                },
              })
            }
          />
        </label>
      </section>

      {/* Features */}
      <section className="lc-panel">
        <h2 className="lc-panel-title flex items-center gap-2">
          <Settings2 size={18} />
          Live features
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.keys(features).map((key) => (
            <label key={key} className="lc-check-card">
              <input
                type="checkbox"
                checked={Boolean(features[key])}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    features: { ...features, [key]: e.target.checked },
                  })
                }
              />
              <span className="text-sm">{FEATURE_LABELS[key] || key}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Active sessions */}
      <section className="lc-panel">
        <h2 className="lc-panel-title flex items-center gap-2">
          <Shield size={18} />
          Active sessions
        </h2>
        <ul className="space-y-2">
          {(sessionsData?.sessions || []).map((s: any) => (
            <li key={s._id} className="lc-session-row">
              <div>
                <p className="font-medium text-sm">{s.title}</p>
                <p className="text-xs text-gray-500">
                  {s.status} · {s.mode} · {s.streamProvider || 'webrtc'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="lc-btn-outline"
                  onClick={() =>
                    patchSession.mutate({
                      id: s._id,
                      payload: { adminFrozen: !s.adminFrozen },
                    })
                  }
                >
                  {s.adminFrozen ? 'Unfreeze' : 'Freeze'}
                </button>
                <button
                  type="button"
                  className="lc-btn-danger"
                  onClick={() => patchSession.mutate({ id: s._id, payload: { status: 'ended' } })}
                >
                  End
                </button>
              </div>
            </li>
          ))}
          {!(sessionsData?.sessions || []).length && (
            <p className="text-sm text-gray-500">No recent sessions.</p>
          )}
        </ul>
      </section>

      <div className="lc-sticky-save">
        <button type="button" className="lc-save-btn" disabled={saveMutation.isPending} onClick={persistDraft}>
          <Save size={16} />
          Save all settings
        </button>
      </div>

      <style>{`
        .lc-panel {
          border-radius: 16px;
          border: 1px solid var(--border-card, #e5e7eb);
          background: var(--card-bg, #fff);
          padding: 1.25rem 1.5rem;
        }
        html[data-theme='dark'] .lc-panel { background: #111827; border-color: #374151; }
        .lc-panel-title { font-weight: 600; font-size: 1rem; margin-bottom: 0.75rem; color: var(--text-primary, #111); }
        .lc-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.5rem 0; }
        .lc-toggle-label { font-weight: 600; font-size: 0.875rem; }
        .lc-toggle-hint { font-size: 0.7rem; color: #6b7280; margin-top: 2px; }
        .lc-input {
          border-radius: 10px;
          border: 1px solid #d1d5db;
          padding: 0.5rem 0.75rem;
          background: var(--bg-input, #fff);
        }
        html[data-theme='dark'] .lc-input { background: #1f2937; border-color: #4b5563; color: #f9fafb; }
        .lc-radio-card {
          display: flex;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          cursor: pointer;
        }
        .lc-radio-card.is-selected {
          border-color: #f97316;
          background: color-mix(in srgb, #f97316 8%, transparent);
        }
        .lc-check-card {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.625rem 0.75rem;
          border-radius: 10px;
          border: 1px solid #f3f4f6;
          cursor: pointer;
        }
        .lc-radio-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.75rem;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          font-size: 0.8rem;
          cursor: pointer;
        }
        .lc-seller-list { max-height: 320px; overflow-y: auto; border-radius: 12px; border: 1px solid #f3f4f6; }
        .lc-seller-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #f3f4f6;
        }
        .lc-session-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          border: 1px solid #f3f4f6;
        }
        .lc-save-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          border-radius: 12px;
          background: #f97316;
          color: #fff;
          font-weight: 600;
          font-size: 0.875rem;
          border: none;
        }
        .lc-save-btn:disabled { opacity: 0.6; }
        .lc-btn-outline {
          font-size: 0.75rem;
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          border: 1px solid #d1d5db;
        }
        .lc-btn-danger {
          font-size: 0.75rem;
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          border: 1px solid #fecaca;
          color: #dc2626;
        }
        .lc-sticky-save {
          position: sticky;
          bottom: 1rem;
          display: flex;
          justify-content: flex-end;
          padding: 0.5rem;
          background: color-mix(in srgb, var(--bg-page, #fff) 92%, transparent);
          backdrop-filter: blur(8px);
        }
      `}</style>
    </div>
  );
}
