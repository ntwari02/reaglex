import { StubProvider } from './StubProvider';

export class LiveKitProvider extends StubProvider {
  constructor() {
    super('livekit', 'LiveKit');
  }
}
