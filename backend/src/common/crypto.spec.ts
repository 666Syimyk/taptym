import {
  base32Decode,
  base32Encode,
  isValidDestination,
  normalizeDestination,
  randomNumericCode,
  safeEqualHex,
  totpCode,
  totpVerify,
} from './crypto';

describe('crypto helpers', () => {
  it('normalizes Kyrgyz phone formats to E.164', () => {
    expect(normalizeDestination('phone', '0700 123 456')).toBe('+996700123456');
    expect(normalizeDestination('phone', '700123456')).toBe('+996700123456');
    expect(normalizeDestination('phone', '+996 (700) 123-456')).toBe('+996700123456');
    expect(normalizeDestination('phone', '00996700123456')).toBe('+996700123456');
    expect(normalizeDestination('email', ' User@Example.COM ')).toBe('user@example.com');
  });

  it('validates destinations', () => {
    expect(isValidDestination('phone', '+996700123456')).toBe(true);
    expect(isValidDestination('phone', '+12')).toBe(false);
    expect(isValidDestination('email', 'a@b.co')).toBe(true);
    expect(isValidDestination('email', 'not-an-email')).toBe(false);
  });

  it('generates zero-padded numeric codes', () => {
    for (let i = 0; i < 50; i++) expect(randomNumericCode(6)).toMatch(/^\d{6}$/);
  });

  it('safeEqualHex rejects different lengths and empty values', () => {
    expect(safeEqualHex('abcd', 'abcd')).toBe(true);
    expect(safeEqualHex('abcd', 'abce')).toBe(false);
    expect(safeEqualHex('abcd', 'ab')).toBe(false);
    expect(safeEqualHex('', '')).toBe(false);
  });

  it('base32 round-trips and TOTP matches RFC 6238 test vector', () => {
    const secret = Buffer.from('12345678901234567890');
    const b32 = base32Encode(secret);
    expect(b32).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(base32Decode(b32).equals(secret)).toBe(true);
    // RFC 6238 Appendix B (SHA-1), T = 59 → 94287082 → 6 digits "287082"
    expect(totpCode(b32, 59_000)).toBe('287082');
    expect(totpVerify(b32, '287082', 59_000)).toBe(true);
    expect(totpVerify(b32, '000000', 59_000)).toBe(false);
  });
});
