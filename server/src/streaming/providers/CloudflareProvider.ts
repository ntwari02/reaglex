import { StubProvider } from './StubProvider';

export class CloudflareProvider extends StubProvider {
  constructor() {
    super('cloudflare', 'Cloudflare Stream');
  }
}
