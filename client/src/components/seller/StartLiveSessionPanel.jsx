import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Radio } from 'lucide-react';
import { liveCommerceApi } from '../../services/liveCommerceApi';

const MODES = [
  { id: 'showcase', label: 'Product showcase' },
  { id: 'auction', label: 'Live auction' },
  { id: 'flash_deal', label: 'Flash deal live' },
  { id: 'private', label: 'Private sale' },
];

export default function StartLiveSessionPanel() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState('showcase');
  const [error, setError] = useState('');

  const startMutation = useMutation({
    mutationFn: async (payload) => {
      try {
        await liveCommerceApi.endStaleSellerLive();
      } catch {
        /* best-effort */
      }
      return liveCommerceApi.startSession({
        ...payload,
        streamProvider: 'webrtc',
      });
    },
    onMutate: () => setError(''),
    onSuccess: (res) => {
      if (res?.session?.id) navigate(`/live/${res.session.id}`);
      else setError('Session started but no session id was returned');
    },
    onError: (err) => {
      const detail = err?.response?.data?.error;
      const msg = err?.response?.data?.message;
      setError(detail && detail !== msg ? `${msg}: ${detail}` : msg || 'Could not start live session');
    },
  });

  return (
    <section className="rounded-2xl border p-4" style={{ borderColor: 'var(--border-card)', background: 'var(--card-bg)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Radio size={18} style={{ color: 'var(--brand-primary)' }} />
        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          Start live session
        </h3>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        Showcase products, run auctions, or flash deals — escrow protected.
      </p>
      <input
        className="w-full rounded-xl border px-3 py-2 text-sm mb-2"
        style={{ borderColor: 'var(--border-card)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        placeholder="Session title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="flex flex-wrap gap-2 mb-3">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className="rounded-full px-3 py-1 text-[11px] font-semibold"
            style={{
              background: mode === m.id ? 'var(--brand-tint)' : 'var(--bg-secondary)',
              color: mode === m.id ? 'var(--brand-primary)' : 'var(--text-muted)',
              border: `1px solid ${mode === m.id ? 'var(--brand-border-subtle)' : 'var(--border-card)'}`,
            }}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
      {error && (
        <p className="text-[11px] mb-2" style={{ color: 'var(--badge-danger-text, #dc2626)' }}>
          {error}
        </p>
      )}
      <button
        type="button"
        className={`go-live-btn w-full rounded-full py-2.5 text-sm font-semibold text-white${startMutation.isPending ? ' go-live-btn--loading' : ''}`}
        style={{ background: 'var(--brand-primary)' }}
        disabled={!title.trim() || startMutation.isPending}
        onClick={() =>
          startMutation.mutate({
            title: title.trim(),
            mode,
            features: { chat: true, reactions: true, instantBuy: true, bidding: mode === 'auction' },
          })
        }
      >
        {startMutation.isPending ? (
          <>
            <Loader2 className="go-live-btn__spinner" aria-hidden />
            Starting live…
          </>
        ) : (
          'Go live'
        )}
      </button>
    </section>
  );
}
