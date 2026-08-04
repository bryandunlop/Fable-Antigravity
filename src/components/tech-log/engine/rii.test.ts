import { describe, it, expect } from 'vitest';
import { riiRequiredFor, riiSatisfied, legacyStepRii, releaseHasInspector } from './rii';
import { validateRii } from './signing';
import type { Personnel, WorkCard } from '../types';

const card = (p: Partial<WorkCard> = {}) => ({ riiRequired: false, ...p }) as WorkCard;

const inspector = (p: Partial<Personnel> = {}): Personnel => ({
  oid: 'INS1', displayName: 'Ins Pector', role: 'MAINTENANCE', apCertificateNumber: 'AP-1',
  riiAuthorized: true, riiAuthorizedAta: ['32'], active: true, ...p,
});

describe('card-level RII gate (D68)', () => {
  it('a card that needs no RII is trivially satisfied, signature or not', () => {
    expect(riiRequiredFor(card())).toBe(false);
    expect(riiSatisfied(card(), undefined)).toBe(true);
    expect(riiSatisfied(card(), 'sig-1')).toBe(true);
  });

  it('a card that needs RII is NOT satisfied without an inspector signature', () => {
    expect(riiRequiredFor(card({ riiRequired: true }))).toBe(true);
    expect(riiSatisfied(card({ riiRequired: true }), undefined)).toBe(false);
    expect(riiSatisfied(card({ riiRequired: true }), '')).toBe(false);
  });

  it('one independent inspector signature opens the gate', () => {
    expect(riiSatisfied(card({ riiRequired: true }), 'sig-rii')).toBe(true);
  });
});

/**
 * The NEVER rule, asserted here rather than only inside the ceremony. Before D68 the separation was
 * reachable through the per-step path too; with steps gone `validateRii` is the single place it
 * lives, and a test that names it is what stops it being refactored away quietly.
 */
describe('performer and RII inspector are never the same person', () => {
  it('rejects the performer inspecting their own work', () => {
    const r = validateRii('INS1', inspector({ oid: 'INS1' }), '32');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/differ from the performer/i);
  });

  it('rejects an inspector not RII-authorized for the card’s ATA', () => {
    expect(validateRii('TECH1', inspector({ riiAuthorizedAta: ['24'] }), '32').ok).toBe(false);
    expect(validateRii('TECH1', inspector({ riiAuthorized: false }), '32').ok).toBe(false);
  });

  it('accepts an independent, authorized inspector', () => {
    expect(validateRii('TECH1', inspector(), '32').ok).toBe(true);
  });
});

/**
 * Pre-D68 records are immutable and keep the old shape. A signed release points at its card by
 * `linkedWorkCardId`, so where the card's stored steps are the only record of who inspected, that
 * has to keep reading — the gate is new, the history is not.
 */
describe('releases signed under the old per-step model still read', () => {
  const legacy = {
    id: 'wc-old', riiRequired: true,
    steps: [
      { id: 'st1', seq: 1, text: 'a', done: true },
      { id: 'st2', seq: 2, text: 'b', done: true, riiRequired: true, riiSignatureId: 'sig-9', riiInspectorOid: 'INS7' },
    ],
  };

  it('recovers the inspector who actually signed a legacy card', () => {
    expect(legacyStepRii(legacy)).toEqual({ riiInspectorOid: 'INS7', riiSignatureId: 'sig-9' });
  });

  it('returns null for shapes that carry no signed RII step — including the post-D68 card', () => {
    expect(legacyStepRii(card({ riiRequired: true }))).toBeNull();
    expect(legacyStepRii({ steps: [{ id: 'st1', riiRequired: true }] })).toBeNull(); // flagged, never signed
    expect(legacyStepRii(undefined)).toBeNull();
  });

  it('a legacy step signature does NOT open the gate for new work', () => {
    // The gate reads the ceremony signature only. Recovering an old attribution is a rendering
    // concern; letting it satisfy a new completion would let a stale signature certify new work.
    expect(riiSatisfied(legacy as unknown as WorkCard, undefined)).toBe(false);
  });

  it('renders a release as inspector-complete only when it recorded one', () => {
    expect(releaseHasInspector({ riiRequired: true, riiSignatureId: 'sig-9' })).toBe(true);
    expect(releaseHasInspector({ riiRequired: true, riiSignatureId: undefined })).toBe(false);
    expect(releaseHasInspector({ riiRequired: false, riiSignatureId: undefined })).toBe(true);
  });
});
