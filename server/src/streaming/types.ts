export type StreamProviderType =
  | 'webrtc'
  | 'youtube'
  | 'mux'
  | 'aws-ivs'
  | 'cloudflare'
  | 'agora'
  | 'livekit'
  | 'vimeo'
  | 'selfhosted';

export interface StreamCreateResult {
  streamId: string;
  playbackUrl: string;
  streamKey?: string;
  ingestUrl?: string;
  provider: StreamProviderType;
}

export interface StreamCreateOptions {
  title?: string;
  sessionId?: string;
  /** YouTube video ID or full URL (MVP) */
  youtubeVideoId?: string;
  youtubeUrl?: string;
  scheduledAt?: Date;
}

export interface StreamProvider {
  readonly type: StreamProviderType;
  createStream(options?: StreamCreateOptions): Promise<StreamCreateResult>;
  endStream(streamId: string): Promise<void>;
  getPlaybackUrl(streamId: string, options?: { isLive?: boolean }): Promise<string>;
}
