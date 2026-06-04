import type { StreamCreateOptions, StreamCreateResult, StreamProvider } from '../types';

/**
 * Self-hosted RTMP → HLS (configure ingest/playback via env).
 */
export class SelfHostedProvider implements StreamProvider {
  readonly type = 'selfhosted' as const;

  async createStream(options?: StreamCreateOptions): Promise<StreamCreateResult> {
    const streamId = `rtmp-${Date.now()}`;
    const ingestUrl = process.env.RTMP_INGEST_URL || 'rtmp://localhost/live';
    const playbackUrl =
      process.env.HLS_PLAYBACK_BASE_URL
        ? `${process.env.HLS_PLAYBACK_BASE_URL.replace(/\/$/, '')}/${streamId}.m3u8`
        : '';

    if (!playbackUrl) {
      throw new Error('HLS_PLAYBACK_BASE_URL is required for self-hosted streams');
    }

    return {
      streamId,
      playbackUrl,
      ingestUrl,
      streamKey: process.env.RTMP_STREAM_KEY || `live-${streamId}`,
      provider: 'selfhosted',
    };
  }

  async endStream(_streamId: string): Promise<void> {
    /* Hook CDN/RTMP teardown when wired */
  }

  async getPlaybackUrl(streamId: string): Promise<string> {
    const base = process.env.HLS_PLAYBACK_BASE_URL?.replace(/\/$/, '');
    if (!base) throw new Error('HLS_PLAYBACK_BASE_URL not configured');
    return `${base}/${streamId}.m3u8`;
  }
}
