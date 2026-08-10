import { describe, it, expect } from 'vitest';
import { MEL_DEMO_BYTE_LENGTH, MEL_DEMO_SHA256, melDemoBytes } from './demoSeedBlob';
import { sha256Hex } from '../engine/hashing';

describe('the seeded received document', () => {
  // The constant is shown to a user as "SHA-256 computed by myGFO". If it ever
  // stops being the true digest of the bytes it ships with, the demo is making a
  // provenance claim nothing backs — the exact failure this feature must not have.
  it('carries the TRUE digest of the bytes it ships with', async () => {
    expect(await sha256Hex(melDemoBytes())).toBe(MEL_DEMO_SHA256);
  });

  it('reports its real byte length', () => {
    expect(melDemoBytes().byteLength).toBe(MEL_DEMO_BYTE_LENGTH);
  });
});
