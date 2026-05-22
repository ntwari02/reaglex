import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Radio, Shield, Settings2, Video } from 'lucide-react';
import { liveCommerceApi } from '@/services/liveCommerceApi';

const STREAM_PROVIDERS: { id: string; label: string }[] = [
  { id: 'webrtc', label: 'WebRTC (P2P)' },
  { id: 'youtube', label: 'YouTube Live' },
  { id: 'livekit', label: 'LiveKit' },
  { id: 'agora', label: 'Agora' },
  { id: 'selfhosted', label: 'Self-hosted RTMP/HLS' },
  { id: 'mux', label: 'Mux' },
  { id: 'aws-ivs', label: 'AWS IVS' },
  { id: 'cloudflare', label: 'Cloudflare Stream' },
  { id: 'vimeo', label: 'Vimeo' },
];

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

  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (data?.settings) setDraft(data.settings);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload) => liveCommerceApi.updateAdminSettings(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['live-commerce', 'admin-settings'] }),
  });

  const patchSession = useMutation({
    mutationFn: ({ id, payload }) => liveCommerceApi.patchAdminSession(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['live-commerce', 'admin-sessions'] }),
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

  const setProviderEnabled = (id: string, enabled: boolean) => {
    setDraft({
      ...draft,
      streaming: {
        ...streaming,
        providers: {
          ...providerFlags,
          [id]: { enabled },
        },
      },
    });
  };

  const enabledIds = STREAM_PROVIDERS.filter((p) => providerFlags[p.id]?.enabled).map((p) => p.id);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Radio className="text-orange-500" />
          Live Commerce Control
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Global toggle, permissions, and realtime session moderation.
        </p>
      </div>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Enable LIVE globally</p>
            <p className="text-xs text-gray-500">When off, live is hidden and sellers cannot stream.</p>
          </div>
          <input
            type="checkbox"
            checked={Boolean(draft.globallyEnabled)}
            onChange={(e) => setDraft({ ...draft, globallyEnabled: e.target.checked })}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Require admin approval per seller</p>
          </div>
          <input
            type="checkbox"
            checked={Boolean(draft.requireSellerApproval)}
            onChange={(e) => setDraft({ ...draft, requireSellerApproval: e.target.checked })}
          />
        </div>
        <label className="block text-sm">
          <span className="text-gray-600 dark:text-gray-400">Max session duration (minutes)</span>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-800 dark:border-gray-600"
            value={draft.maxDurationMinutes}
            onChange={(e) =>
              setDraft({ ...draft, maxDurationMinutes: Number(e.target.value) || 180 })
            }
          />
        </label>
      </section>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
          <Video size={18} />
          Streaming providers
        </h2>
        <p className="text-xs text-gray-500">
          Enable providers sellers can choose. Set the platform default for new sessions.
        </p>
        <div className="space-y-2">
          {STREAM_PROVIDERS.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(providerFlags[p.id]?.enabled)}
                onChange={(e) => setProviderEnabled(p.id, e.target.checked)}
              />
              {p.label}
            </label>
          ))}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Default provider</p>
          <div className="flex flex-wrap gap-3">
            {STREAM_PROVIDERS.filter((p) => providerFlags[p.id]?.enabled).map((p) => (
              <label key={p.id} className="flex items-center gap-1.5 text-sm">
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
          {enabledIds.length === 0 && (
            <p className="text-xs text-amber-600 mt-2">Enable at least one provider.</p>
          )}
        </div>
        <label className="block text-sm">
          <span className="text-gray-600 dark:text-gray-400">WebRTC max viewers (P2P)</span>
          <input
            type="number"
            min={2}
            max={20}
            className="mt-1 w-32 rounded-lg border px-3 py-2 dark:bg-gray-800 dark:border-gray-600"
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

      <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-white mb-4">
          <Settings2 size={18} />
          Feature permissions
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Object.keys(features).map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm capitalize">
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
              {key.replace(/([A-Z])/g, ' $1')}
            </label>
          ))}
        </div>
        <button
          type="button"
          className="mt-6 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate(draft)}
        >
          Save settings
        </button>
      </section>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-white mb-4">
          <Shield size={18} />
          Active sessions
        </h2>
        <ul className="space-y-3">
          {(sessionsData?.sessions || []).map((s: any) => (
            <li
              key={s._id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3"
            >
              <div>
                <p className="font-medium text-sm text-gray-900 dark:text-white">{s.title}</p>
                <p className="text-xs text-gray-500">
                  {s.status} · {s.mode}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs px-3 py-1.5 rounded-lg border"
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
                  className="text-xs px-3 py-1.5 rounded-lg border text-red-600"
                  onClick={() =>
                    patchSession.mutate({ id: s._id, payload: { status: 'ended' } })
                  }
                >
                  End
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
