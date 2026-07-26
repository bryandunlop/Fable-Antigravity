import { describe, it, expect } from 'vitest';
import {
  DURABLE_ACTIONS, isDurableAction, loadPersistedState, persistState, memoryStorage,
  STORAGE_KEY, VERSION_KEY, DATA_VERSION,
} from './persistence';
import type { TechLogAction, TechLogState } from './types';

/** A tiny stand-in for the reducer's state — persistence is shape-agnostic by design. */
const stateWith = (signatureIds: string[]): TechLogState =>
  ({ signatures: signatureIds.map(id => ({ id })), personnel: [], currentUserOid: 'p-1' } as unknown as TechLogState);

const seed = (): TechLogState => stateWith([]);

describe('isDurableAction — which dispatches must reach storage in the same commit', () => {
  it('classifies every signature-bearing action as durable', () => {
    // CLAUDE.md: "ALWAYS persist a signed record to durable storage the instant it is signed,
    // before attempting sync." A 300 ms debounce on a signature is a deliberate durability gap.
    const signing: TechLogAction['type'][] = [
      'ADD_SIGNATURE', 'ADD_RELEASE', 'ADD_DEFERRAL', 'SUPERSEDE_DEFERRAL',
      'ADD_DEFECT', 'SUPERSEDE_DEFECT', 'ADD_FLIGHTLOG', 'SUPERSEDE_FLIGHTLOG',
      'ADD_POSTFLIGHT', 'SUPERSEDE_POSTFLIGHT', 'EDIT_BRIEFING', 'ADD_AUDIT',
    ];
    for (const t of signing) expect(isDurableAction(t), t).toBe(true);
  });

  it('leaves chatty UI-ish state on the debounce', () => {
    expect(isDurableAction('SET_PERSONA')).toBe(false);
  });

  it('never lets a durable action be dropped from the set by accident', () => {
    // The set is the contract; this pins its size so silently deleting an entry fails loudly.
    expect(DURABLE_ACTIONS.size).toBeGreaterThanOrEqual(12);
  });
});

describe('persistState / loadPersistedState', () => {
  it('writes synchronously — the value is readable immediately, with no timer to elapse', () => {
    const s = memoryStorage();
    persistState(s, stateWith(['sig-1']));
    expect(JSON.parse(s.getItem(STORAGE_KEY)!).signatures).toEqual([{ id: 'sig-1' }]);
  });

  it('reseeds and stamps the version when the stored data version does not match', () => {
    const s = memoryStorage();
    s.setItem(VERSION_KEY, 'ancient');
    s.setItem(STORAGE_KEY, JSON.stringify(stateWith(['stale'])));
    const loaded = loadPersistedState(s, seed);
    expect(loaded.signatures).toEqual([]);
    expect(s.getItem(VERSION_KEY)).toBe(DATA_VERSION);
    expect(s.getItem(STORAGE_KEY)).toBeNull();
  });

  it('falls back to the seed rather than throwing on unparseable storage', () => {
    const s = memoryStorage();
    s.setItem(VERSION_KEY, DATA_VERSION);
    s.setItem(STORAGE_KEY, '{not json');
    expect(loadPersistedState(s, seed).signatures).toEqual([]);
  });

  it('swallows a failing write rather than crashing the signing flow', () => {
    const throwing = { ...memoryStorage(), setItem: () => { throw new Error('QuotaExceeded'); } };
    expect(() => persistState(throwing, stateWith(['sig-1']))).not.toThrow();
  });
});

describe('TL-26 — the drop and the clobber, as a sequence', () => {
  /**
   * The original mechanism, reproduced against the real persistence primitives:
   *   1. a provider signs a record; the write is scheduled on a 300 ms debounce;
   *   2. the user navigates to a sibling route inside that window, so the outgoing provider
   *      unmounts and its cleanup CANCELS the pending write;
   *   3. the incoming provider's loadInitialState runs during RENDER — before the outgoing
   *      cleanup runs in the commit phase — and reads the stale blob;
   *   4. its mount-time SET_PERSONA dirties state, and 300 ms later it writes the stale
   *      snapshot back, turning a delayed write into a permanent overwrite.
   * Step 4 is not a rare race: SET_PERSONA returns a new object unconditionally, so EVERY
   * provider mount arms that write — including read-only ramp mode on a second device.
   */
  it('a debounced signature that never fires is invisible to the next provider (the old bug)', () => {
    const s = memoryStorage();
    s.setItem(VERSION_KEY, DATA_VERSION);
    persistState(s, stateWith([]));                       // provider A's state at mount

    const signed = stateWith(['sig-just-signed']);        // A signs...
    // ...and navigates away before the debounce elapses, so the write is cancelled: nothing happens.

    const b = loadPersistedState(s, seed);                // provider B hydrates
    expect(b.signatures).toEqual([]);                     // the signature is gone
    persistState(s, b);                                   // B's mount-time write cements the loss
    expect(JSON.parse(s.getItem(STORAGE_KEY)!).signatures).toEqual([]);
    expect(signed.signatures).toHaveLength(1);            // it only ever existed in memory
  });

  it('persisting durably at the signing dispatch survives the same navigation', () => {
    const s = memoryStorage();
    s.setItem(VERSION_KEY, DATA_VERSION);
    persistState(s, stateWith([]));

    // The fix: a durable action writes in the same commit, with no timer to outrun.
    expect(isDurableAction('ADD_SIGNATURE')).toBe(true);
    persistState(s, stateWith(['sig-just-signed']));

    const b = loadPersistedState(s, seed);                // provider B hydrates, however fast
    expect(b.signatures).toEqual([{ id: 'sig-just-signed' }]);
    persistState(s, b);                                   // and its mount-time write is now a no-op
    expect(JSON.parse(s.getItem(STORAGE_KEY)!).signatures).toEqual([{ id: 'sig-just-signed' }]);
  });
});
