import { clampLimit, decodeCursor, encodeCursor } from './pagination';

describe('cursor pagination', () => {
  it('round-trips cursors and rejects garbage', () => {
    const c = { ts: '2026-01-01T00:00:00.000Z', id: 'abc' };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
    expect(decodeCursor('not-base64!!')).toBeNull();
    expect(decodeCursor(Buffer.from('{"x":1}').toString('base64url'))).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
  });

  it('clamps limits', () => {
    expect(clampLimit(undefined)).toBe(20);
    expect(clampLimit('500')).toBe(50);
    expect(clampLimit('-3')).toBe(20);
    expect(clampLimit('7')).toBe(7);
  });
});
