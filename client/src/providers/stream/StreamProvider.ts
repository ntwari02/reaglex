/**
 * Client-side stream provider contract (mirrors server abstraction).
 * UI uses LivePlayer + hooks; providers encapsulate transport setup.
 */
export interface StreamProvider {
  readonly type: string;
  startStream(options?: Record<string, unknown>): Promise<void>;
  stopStream(): Promise<void>;
  getPlaybackUrl(): Promise<string>;
}
