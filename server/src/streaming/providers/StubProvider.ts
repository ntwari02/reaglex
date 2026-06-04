import type { StreamCreateOptions, StreamCreateResult, StreamProvider, StreamProviderType } from '../types';

/** Placeholder for future professional streaming integrations. */
export class StubProvider implements StreamProvider {
  constructor(
    readonly type: StreamProviderType,
    private readonly label: string
  ) {}

  async createStream(_options?: StreamCreateOptions): Promise<StreamCreateResult> {
    throw new Error(
      `${this.label} is not enabled yet. Use YouTube for MVP or contact admin to enable ${this.type}.`
    );
  }

  async endStream(_streamId: string): Promise<void> {
    throw new Error(`${this.label} endStream not implemented`);
  }

  async getPlaybackUrl(_streamId: string): Promise<string> {
    throw new Error(`${this.label} playback not implemented`);
  }
}
