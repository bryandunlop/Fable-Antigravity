import { describe, it, expect } from 'vitest';
import { sha256Hex, shortDigest } from './hashing';

const enc = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;

describe('sha256Hex', () => {
  // Known vectors — if this drifts, every frozen received document's claim
  // about its own bytes is wrong.
  it('matches the published digest for the empty input', async () => {
    expect(await sha256Hex(new ArrayBuffer(0))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('matches the published digest for "abc"', async () => {
    expect(await sha256Hex(enc('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('is 64 lowercase hex characters', async () => {
    expect(await sha256Hex(enc('MEL revision 15'))).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when a single byte changes', async () => {
    expect(await sha256Hex(enc('rev 14'))).not.toBe(await sha256Hex(enc('rev 15')));
  });
});

describe('shortDigest', () => {
  it('takes the leading 12 characters', () => {
    expect(shortDigest('ba7816bf8f01cfea414140de5dae2223')).toBe('ba7816bf8f01');
  });
});
