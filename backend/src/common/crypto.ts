import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export function sha256Hex(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

export function hmacHex(secret: string, input: string): string {
  return createHmac('sha256', secret).update(input).digest('hex');
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function randomNumericCode(digits = 6): string {
  // randomInt is uniformly distributed and cryptographically secure
  const max = 10 ** digits;
  return randomInt(0, max).toString().padStart(digits, '0');
}

export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ba.length !== bb.length || ba.length === 0) return false;
  return timingSafeEqual(ba, bb);
}

/** Normalize a contact destination before hashing (prevents duplicate accounts). */
export function normalizeDestination(channel: 'phone' | 'email', raw: string): string {
  const v = raw.trim();
  if (channel === 'email') return v.toLowerCase();
  let digits = v.replace(/[^\d+]/g, '');
  if (digits.startsWith('00')) digits = '+' + digits.slice(2);
  if (!digits.startsWith('+')) {
    // Kyrgyzstan national format: 0XXX XXX XXX → +996 XXX XXX XXX
    if (digits.startsWith('0') && digits.length === 10) digits = '+996' + digits.slice(1);
    else if (digits.length === 9) digits = '+996' + digits;
    else digits = '+' + digits;
  }
  return digits;
}

export function isValidDestination(channel: 'phone' | 'email', normalized: string): boolean {
  if (channel === 'email')
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized) && normalized.length <= 254;
  return /^\+\d{9,15}$/.test(normalized);
}

/** Simple base32 for TOTP secrets (RFC 4648, no padding). */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** RFC 6238 TOTP (SHA-1, 6 digits, 30s). Accepts ±1 step drift. */
export function totpCode(secretB32: string, time = Date.now(), step = 30): string {
  const counter = Math.floor(time / 1000 / step);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = createHmac('sha1', base32Decode(secretB32)).update(buf).digest();
  const offset = h[h.length - 1] & 0xf;
  const code =
    ((h[offset] & 0x7f) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | h[offset + 3];
  return (code % 1_000_000).toString().padStart(6, '0');
}
export function totpVerify(secretB32: string, code: string, time = Date.now()): boolean {
  for (const drift of [-1, 0, 1]) {
    if (totpCode(secretB32, time + drift * 30_000) === code) return true;
  }
  return false;
}
