export type StreamProviderType =
  | 'webrtc'
  | 'youtube'
  | 'livekit'
  | 'agora'
  | 'mux'
  | 'aws-ivs'
  | 'cloudflare'
  | 'vimeo'
  | 'selfhosted';

export interface LiveSessionView {
  id: string;
  title: string;
  status: string;
  mode: string;
  streamProvider?: StreamProviderType;
  playbackUrl?: string;
  streamUrl?: string;
  viewerCount?: number;
  seller?: { id?: string; name?: string };
  sellerId?: string;
  features?: Record<string, boolean>;
}

export interface StreamProviderMeta {
  id: StreamProviderType;
  label: string;
  enabled?: boolean;
}
