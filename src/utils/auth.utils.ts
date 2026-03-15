import crypto from 'crypto';

export const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  const encoder = new TextEncoder();

  const encodedA = encoder.encode(a);
  const encodedB = encoder.encode(b);

  if (encodedA.byteLength !== encodedB.byteLength) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(encodedA), Buffer.from(encodedB));
};
