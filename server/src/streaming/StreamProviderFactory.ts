import type { StreamProvider, StreamProviderType } from './types';
import { YouTubeProvider } from './providers/YouTubeProvider';
import { MuxProvider } from './providers/MuxProvider';
import { AwsIVSProvider } from './providers/AwsIVSProvider';
import { CloudflareProvider } from './providers/CloudflareProvider';
import { AgoraProvider } from './providers/AgoraProvider';
import { LiveKitProvider } from './providers/LiveKitProvider';
import { VimeoProvider } from './providers/VimeoProvider';
import { SelfHostedProvider } from './providers/SelfHostedProvider';

import { WebRTCProvider } from './providers/WebRTCProvider';

const DEFAULT_PROVIDER: StreamProviderType =
  (process.env.DEFAULT_STREAM_PROVIDER as StreamProviderType) || 'webrtc';

export class StreamProviderFactory {
  static create(type?: string): StreamProvider {
    const key = (type || DEFAULT_PROVIDER).toLowerCase() as StreamProviderType;
    switch (key) {
      case 'webrtc':
        return new WebRTCProvider();
      case 'youtube':
        return new YouTubeProvider();
      case 'mux':
        return new MuxProvider();
      case 'aws-ivs':
        return new AwsIVSProvider();
      case 'cloudflare':
        return new CloudflareProvider();
      case 'agora':
        return new AgoraProvider();
      case 'livekit':
        return new LiveKitProvider();
      case 'vimeo':
        return new VimeoProvider();
      case 'selfhosted':
        return new SelfHostedProvider();
      default:
        return new WebRTCProvider();
    }
  }

  static supportedProviders(): StreamProviderType[] {
    return [
      'webrtc',
      'youtube',
      'mux',
      'aws-ivs',
      'cloudflare',
      'agora',
      'livekit',
      'vimeo',
      'selfhosted',
    ];
  }
}
