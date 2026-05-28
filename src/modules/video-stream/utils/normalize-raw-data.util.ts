import type { RawData } from 'ws';

export function normalizeRawData(raw: RawData): string {
  if (typeof raw === 'string') {
    return raw;
  }

  if (raw instanceof Buffer) {
    return raw.toString('utf8');
  }

  if (raw instanceof ArrayBuffer) {
    return Buffer.from(raw).toString('utf8');
  }

  if (Array.isArray(raw)) {
    return Buffer.concat(raw).toString('utf8');
  }

  throw new TypeError('Unsupported websocket message type');
}
