import type { StreamCreateOptions, StreamCreateResult, StreamProvider } from '../types';

/**
 * WebRTC — signaling-only on server; media flows peer-to-peer via STUN.
 * playbackUrl is empty; clients use Socket.IO + RTCPeerConnection.
 */
export class WebRTCProvider implements StreamProvider {
  readonly type = 'webrtc' as const;

  async createStream(options?: StreamCreateOptions): Promise<StreamCreateResult> {
    const roomId = options?.sessionId || `webrtc-${Date.now()}`;
    return {
      streamId: roomId,
      playbackUrl: '',
      provider: 'webrtc',
      ingestUrl: '',
      streamKey: '',
    };
  }

  async endStream(_streamId: string): Promise<void> {
    /* Room torn down when session ends */
  }

  async getPlaybackUrl(_streamId: string): Promise<string> {
    return '';
  }
}
