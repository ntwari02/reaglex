import type { StreamProviderType } from './types';
import { getLiveCommerceSettings } from '../models/LiveCommerceSettings';

export const ALL_STREAM_PROVIDERS: StreamProviderType[] = [
  'webrtc',
  'youtube',
  'livekit',
  'agora',
  'mux',
  'aws-ivs',
  'cloudflare',
  'vimeo',
  'selfhosted',
];

export const PROVIDER_LABELS: Record<StreamProviderType, string> = {
  webrtc: 'WebRTC Ultra Low Latency',
  youtube: 'YouTube Live',
  livekit: 'LiveKit',
  agora: 'Agora',
  mux: 'Mux',
  'aws-ivs': 'AWS IVS',
  cloudflare: 'Cloudflare Stream',
  vimeo: 'Vimeo Live',
  selfhosted: 'Self-hosted RTMP/HLS',
};

export type ProviderFlags = Record<StreamProviderType, { enabled: boolean }>;

const DEFAULT_FLAGS: ProviderFlags = {
  webrtc: { enabled: true },
  youtube: { enabled: true },
  livekit: { enabled: false },
  agora: { enabled: false },
  mux: { enabled: false },
  'aws-ivs': { enabled: false },
  cloudflare: { enabled: false },
  vimeo: { enabled: false },
  selfhosted: { enabled: false },
};

export async function getStreamingConfig() {
  const settings = await getLiveCommerceSettings();
  const rawProviders = settings.streaming?.providers as Record<string, { enabled?: boolean }> | undefined;
  const flags = { ...DEFAULT_FLAGS };
  for (const p of ALL_STREAM_PROVIDERS) {
    flags[p] = { enabled: Boolean(rawProviders?.[p]?.enabled ?? DEFAULT_FLAGS[p].enabled) };
  }
  const defaultProvider =
    (settings.streaming?.defaultProvider as StreamProviderType) || 'webrtc';
  const webrtcMaxViewers = settings.streaming?.webrtcMaxViewers ?? 10;

  const enabledProviders = ALL_STREAM_PROVIDERS.filter((p) => flags[p]?.enabled);

  return {
    defaultProvider: enabledProviders.includes(defaultProvider)
      ? defaultProvider
      : enabledProviders[0] || 'webrtc',
    enabledProviders,
    providerFlags: flags,
    webrtcMaxViewers,
  };
}

export async function assertProviderAllowed(providerType: string) {
  const { enabledProviders } = await getStreamingConfig();
  const key = providerType as StreamProviderType;
  if (!enabledProviders.includes(key)) {
    throw new Error(`Streaming provider "${providerType}" is not enabled`);
  }
}
