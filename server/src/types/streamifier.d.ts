declare module 'streamifier' {
  import type { Readable } from 'stream';
  export function createReadStream(buffer: Buffer): Readable;
  const _default: { createReadStream: typeof createReadStream };
  export default _default;
}

