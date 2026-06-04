import type { StreamCreateOptions, StreamCreateResult, StreamProvider } from '../types';
import {
  extractYouTubeVideoId,
  mockYouTubeLiveVideoId,
  youtubeEmbedUrl,
} from '../youtubeUtils';

/**
 * YouTube Live — default MVP provider (free embed playback).
 * Stream creation is mocked when YOUTUBE_API_KEY is unset; sellers paste a video/live URL.
 */
export class YouTubeProvider implements StreamProvider {
  readonly type = 'youtube' as const;

  async createStream(options?: StreamCreateOptions): Promise<StreamCreateResult> {
    const fromInput =
      extractYouTubeVideoId(options?.youtubeVideoId || '') ||
      extractYouTubeVideoId(options?.youtubeUrl || '');

    const streamId = fromInput || mockYouTubeLiveVideoId();
    const playbackUrl = youtubeEmbedUrl(streamId, { autoplay: true, mute: true });

    return {
      streamId,
      playbackUrl,
      provider: 'youtube',
      ingestUrl: 'https://studio.youtube.com/channel/UC/livestreaming',
      streamKey: process.env.YOUTUBE_STREAM_KEY_MOCK || 'use-youtube-studio-stream-key',
    };
  }

  async endStream(_streamId: string): Promise<void> {
    /* YouTube embed ends when session status changes in commerce layer */
  }

  async getPlaybackUrl(streamId: string): Promise<string> {
    const id = extractYouTubeVideoId(streamId) || streamId;
    return youtubeEmbedUrl(id, { autoplay: true, mute: false });
  }
}
