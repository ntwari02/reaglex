import { useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { useMutation, useQuery } from '@tanstack/react-query';

import { Copy, Loader2, Radio, Square } from 'lucide-react';

import { liveCommerceApi } from '../../services/liveCommerceApi';
import { useSystemFeatures } from '../../hooks/useSystemFeatures';



const MODES = [

  { id: 'showcase', label: 'Showcase' },

  { id: 'auction', label: 'Auction' },

  { id: 'flash_deal', label: 'Flash deal' },

  { id: 'private', label: 'Private' },

];



const PROVIDER_HINTS = {

  webrtc: 'Ultra low latency · best for 2–10 viewers · browser camera only',

  youtube: 'Scalable · paste live URL or stream via OBS to YouTube',

  selfhosted: 'RTMP ingest · HLS playback URL',

};



function copyText(text, setMsg) {

  if (!text) return;

  navigator.clipboard?.writeText(text).then(() => setMsg('Copied'));

  setTimeout(() => setMsg(''), 2000);

}



export default function SellerLiveDashboard() {
  const { isEnabled, loading: featuresLoading } = useSystemFeatures();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');

  const [mode, setMode] = useState('showcase');

  const [provider, setProvider] = useState('webrtc');

  const [youtubeInput, setYoutubeInput] = useState('');

  const [activeSessionId, setActiveSessionId] = useState(null);

  const [copyMsg, setCopyMsg] = useState('');

  const [error, setError] = useState('');



  const { data: providersMeta } = useQuery({

    queryKey: ['live-commerce', 'providers'],

    queryFn: () => liveCommerceApi.getProviders(),

  });

  const { data: liveStatus } = useQuery({

    queryKey: ['live-commerce', 'seller-live-status'],

    queryFn: () => liveCommerceApi.getSellerLiveStatus(),

  });



  const enabledProviders = providersMeta?.providers || [];



  useEffect(() => {

    if (providersMeta?.defaultProvider) {

      setProvider(providersMeta.defaultProvider);

    }

  }, [providersMeta?.defaultProvider]);

  useEffect(() => {
    const id = liveStatus?.activeSession?.id;
    if (id && liveStatus?.activeSession?.status === 'live') {
      setActiveSessionId(id);
    } else if (!id) {
      setActiveSessionId(null);
    }
  }, [liveStatus?.activeSession?.id, liveStatus?.activeSession?.status]);



  const { data: credentials, refetch: refetchCreds } = useQuery({

    queryKey: ['live-commerce', 'credentials', activeSessionId],

    queryFn: () => liveCommerceApi.getStreamCredentials(activeSessionId),

    enabled: Boolean(activeSessionId),

  });



  const startMutation = useMutation({

    mutationFn: async (payload) => {
      try {
        await liveCommerceApi.endStaleSellerLive();
      } catch {
        /* stale cleanup is best-effort */
      }
      const enabledIds = enabledProviders.map((p) => p.id);
      const streamProvider = enabledIds.includes(provider)
        ? provider
        : providersMeta?.defaultProvider || enabledIds[0] || 'webrtc';
      return liveCommerceApi.startSession({ ...payload, streamProvider });
    },

    onMutate: () => {
      setError('');
    },

    onSuccess: (res) => {

      const id = res?.session?.id;

      if (id) {

        setActiveSessionId(id);

        refetchCreds();

        navigate(`/live/${id}`);

      } else {
        setError('Session started but no session id was returned');
      }

    },

    onError: (err) => {
      const existingId = err?.response?.data?.sessionId;
      if (err?.response?.status === 409 && existingId) {
        setActiveSessionId(existingId);
        navigate(`/live/${existingId}`);
        return;
      }
      const detail = err?.response?.data?.error;
      const msg = err?.response?.data?.message;
      setError(detail && detail !== msg ? `${msg}: ${detail}` : msg || 'Could not start live');
    },

  });



  const endMutation = useMutation({

    mutationFn: () => liveCommerceApi.endStream(activeSessionId),

    onSuccess: () => {

      setActiveSessionId(null);

    },

  });

  if (!featuresLoading && !isEnabled('live_commerce')) {
    return (
      <section
        className="rounded-2xl border p-4"
        style={{ borderColor: 'var(--border-card)', background: 'var(--card-bg)' }}
      >
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Live selling is temporarily disabled platform-wide. Your existing orders and products are unaffected.
        </p>
      </section>
    );
  }

  const auctionsOn = featuresLoading || isEnabled('live_commerce_auctions');
  const visibleModes = MODES.filter(
    (m) => auctionsOn || (m.id !== 'auction' && m.id !== 'flash_deal'),
  );

  return (

    <section

      className="rounded-2xl border p-4 space-y-4"

      style={{ borderColor: 'var(--border-card)', background: 'var(--card-bg)' }}

    >

      <div className="flex items-center justify-between gap-2">

        <div className="flex items-center gap-2">

          <Radio size={18} style={{ color: 'var(--brand-primary)' }} />

          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>

            Live streaming

          </h3>

        </div>

        <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>

          Default: {providersMeta?.defaultProvider || 'webrtc'}

        </span>

      </div>

      {liveStatus && !liveStatus.canGoLive && (

        <div

          className="rounded-xl px-3 py-2.5 text-xs"

          style={{

            background: 'color-mix(in srgb, #f59e0b 12%, var(--card-bg))',

            border: '1px solid color-mix(in srgb, #f59e0b 35%, transparent)',

            color: 'var(--text-primary)',

          }}

        >

          <p className="font-semibold mb-0.5">Cannot go live yet</p>

          <p style={{ color: 'var(--text-muted)' }}>{liveStatus.reason}</p>

          {liveStatus.permissionMode === 'allowlist' && !liveStatus.liveCommerceApproved && (

            <p className="mt-1" style={{ color: 'var(--text-muted)' }}>

              Admin approves your store once — you will not need approval for each live session.

            </p>

          )}

        </div>

      )}

      {liveStatus?.canGoLive && liveStatus.permissionMode === 'allowlist' && liveStatus.liveCommerceApproved && (

        <p className="text-[11px] font-medium" style={{ color: '#16a34a' }}>

          Live access approved for your store (all sessions).

        </p>

      )}



      <input

        className="w-full rounded-xl border px-3 py-2 text-sm"

        style={{ borderColor: 'var(--border-card)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}

        placeholder="Session title"

        value={title}

        onChange={(e) => setTitle(e.target.value)}

      />



      <div>

        <p className="text-[10px] font-semibold uppercase mb-1.5" style={{ color: 'var(--text-muted)' }}>

          Mode

        </p>

        <div className="flex flex-wrap gap-2">

          {visibleModes.map((m) => (

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

      </div>



      <div>

        <p className="text-[10px] font-semibold uppercase mb-1.5" style={{ color: 'var(--text-muted)' }}>

          Choose streaming mode

        </p>

        <div className="flex flex-col gap-2">

          {enabledProviders.length === 0 && (

            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>

              No streaming providers enabled. Contact admin.

            </p>

          )}

          {enabledProviders.map((p) => (

            <button

              key={p.id}

              type="button"

              className="rounded-xl border px-3 py-2.5 text-left"

              style={{

                borderColor: provider === p.id ? 'var(--brand-primary)' : 'var(--border-card)',

                background: provider === p.id ? 'var(--brand-tint)' : 'var(--bg-secondary)',

              }}

              onClick={() => setProvider(p.id)}

            >

              <span className="text-[12px] font-semibold block" style={{ color: 'var(--text-primary)' }}>

                {p.label}

              </span>

              {PROVIDER_HINTS[p.id] && (

                <span className="text-[10px] block mt-0.5" style={{ color: 'var(--text-muted)' }}>

                  {PROVIDER_HINTS[p.id]}

                </span>

              )}

            </button>

          ))}

        </div>

      </div>



      {provider === 'youtube' && (

        <input

          className="w-full rounded-xl border px-3 py-2 text-sm"

          style={{ borderColor: 'var(--border-card)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}

          placeholder="YouTube live URL or video ID"

          value={youtubeInput}

          onChange={(e) => setYoutubeInput(e.target.value)}

        />

      )}



      {provider === 'webrtc' && (

        <p className="text-[11px] rounded-lg px-3 py-2" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>

          Allow camera access on the live page. Viewers connect peer-to-peer (max{' '}

          {providersMeta?.webrtcMaxViewers ?? 10} viewers).

        </p>

      )}



      {error && (

        <p className="text-[11px]" style={{ color: 'var(--badge-danger-text, #dc2626)' }}>

          {error}

        </p>

      )}



      <div className="flex gap-2">

        <button

          type="button"

          className={`go-live-btn flex-1 rounded-full py-2.5 text-sm font-semibold text-white${startMutation.isPending ? ' go-live-btn--loading' : ''}`}

          style={{ background: 'var(--brand-primary)' }}

          disabled={
            !title.trim() ||
            startMutation.isPending ||
            enabledProviders.length === 0 ||
            liveStatus?.canGoLive === false
          }

          onClick={() =>

            startMutation.mutate({

              title: title.trim(),

              mode,

              youtubeVideoId: youtubeInput,

              youtubeUrl: youtubeInput,

              features: {

                chat: true,

                reactions: true,

                instantBuy: true,

                replay: true,

                bidding: mode === 'auction',

              },

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

        {activeSessionId && (

          <button

            type="button"

            className="rounded-full px-4 py-2.5 text-sm font-semibold border"

            style={{ borderColor: 'var(--border-card)', color: 'var(--text-primary)' }}

            disabled={endMutation.isPending}

            onClick={() => endMutation.mutate()}

          >

            <Square size={14} className="inline mr-1" />

            End

          </button>

        )}

      </div>



      {credentials && provider !== 'webrtc' && (

        <div className="rounded-xl border p-3 space-y-2 text-[11px]" style={{ borderColor: 'var(--border-card)' }}>

          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>

            Stream credentials

          </p>

          {credentials.ingestUrl && (

            <div className="flex items-center justify-between gap-2">

              <span className="truncate" style={{ color: 'var(--text-muted)' }}>

                Ingest: {credentials.ingestUrl}

              </span>

              <button type="button" onClick={() => copyText(credentials.ingestUrl, setCopyMsg)}>

                <Copy size={12} />

              </button>

            </div>

          )}

          {credentials.streamKey && (

            <div className="flex items-center justify-between gap-2">

              <span className="truncate" style={{ color: 'var(--text-muted)' }}>

                Key: ••••{String(credentials.streamKey).slice(-6)}

              </span>

              <button type="button" onClick={() => copyText(credentials.streamKey, setCopyMsg)}>

                <Copy size={12} />

              </button>

            </div>

          )}

          {copyMsg && <span style={{ color: 'var(--brand-primary)' }}>{copyMsg}</span>}

        </div>

      )}

    </section>

  );

}

