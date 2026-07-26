import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { TechLogProvider, useTechLog, STORAGE_KEY } from './TechLogContext';
import type { Signature, TechLogAction, TechLogState } from './types';

/**
 * TL-26 — the durability guarantee, driven through the real provider rather than the primitives.
 *
 * The bug: persistence was a single 300 ms debounced write whose cleanup CANCELLED the pending
 * write, and four provider instances mounted on sibling route subtrees, so signing a record and
 * navigating inside that window dropped it — then the next provider wrote the stale snapshot back.
 */

let dispatch!: (a: TechLogAction) => void;
let state!: TechLogState;

function Probe() {
  const ctx = useTechLog();
  dispatch = ctx.dispatch;
  state = ctx.state;
  return null;
}

const SIG: Signature = {
  id: 'sig-tl26', signedEntity: 'CRS', signedEntityId: 'rel-tl26',
  signerOid: 'USR008', signerName: 'Tom Parker', signerRole: 'MAINTENANCE',
  certNumber: 'A&P 3312445', intentStatement: 'test', amr: ['pwd', 'mfa'],
  authTimeUtc: '2026-07-26T12:00:00Z', signedAtUtc: '2026-07-26T12:00:00Z', mockContentHash: 'deadbeef',
};

const storedSignatureIds = (): string[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw).signatures as Signature[]).map(s => s.id) : [];
};

/**
 * Own storage rather than jsdom's: two node-environment test files
 * (`utils/quickLinks.test.ts`, `documents/loadInitialState.test.ts`) assign a partial stub onto
 * `globalThis.localStorage` and never restore it, and Vitest shares the global between files in a
 * worker — so jsdom's real Storage is not reliably present here. Installing our own keeps this file
 * deterministic regardless of execution order.
 */
class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  get length() { return this.m.size; }
}

describe('TechLogProvider persistence', () => {
  const original = (globalThis as { localStorage?: unknown }).localStorage;
  beforeEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    (globalThis as { localStorage?: unknown }).localStorage = original;
  });

  it('persists a signature in the same commit — no timer has to elapse', () => {
    const view = render(<TechLogProvider userRole="maintenance"><Probe /></TechLogProvider>);

    act(() => { dispatch({ type: 'ADD_SIGNATURE', payload: SIG }); });

    // Deliberately NOT advancing timers, and unmounting immediately: this is the "sign, then tap a
    // sibling route within 300 ms" sequence that used to lose the record entirely.
    expect(storedSignatureIds()).toContain('sig-tl26');
    view.unmount();
    expect(storedSignatureIds()).toContain('sig-tl26');
  });

  it('a fresh provider mounting on that storage sees the signature and does not clobber it', () => {
    const a = render(<TechLogProvider userRole="maintenance"><Probe /></TechLogProvider>);
    act(() => { dispatch({ type: 'ADD_SIGNATURE', payload: SIG }); });
    a.unmount();

    // The incoming provider's initialiser runs during RENDER, before any outgoing cleanup — the
    // ordering that made "flush on unmount" an insufficient fix on its own.
    render(<TechLogProvider userRole="maintenance"><Probe /></TechLogProvider>);
    expect(state.signatures.map(s => s.id)).toContain('sig-tl26');

    // Its mount-time SET_PERSONA still arms a whole-blob write; it must now be a no-op, not a
    // rewind. (SET_PERSONA returns a new object unconditionally, so EVERY mount does this.)
    act(() => { vi.advanceTimersByTime(400); });
    expect(storedSignatureIds()).toContain('sig-tl26');
  });

  it('still debounces non-regulated state, so a keystroke does not stringify the whole store', () => {
    render(<TechLogProvider userRole="maintenance"><Probe /></TechLogProvider>);
    act(() => { vi.advanceTimersByTime(400); });          // let the mount write settle
    localStorage.removeItem(STORAGE_KEY);

    act(() => { dispatch({ type: 'SET_PERSONA', payload: 'USR002' }); });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull(); // debounced — nothing written yet
    act(() => { vi.advanceTimersByTime(400); });
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('flushes a pending debounced write on unmount instead of cancelling it', () => {
    const view = render(<TechLogProvider userRole="maintenance"><Probe /></TechLogProvider>);
    act(() => { vi.advanceTimersByTime(400); });
    localStorage.removeItem(STORAGE_KEY);

    act(() => { dispatch({ type: 'SET_PERSONA', payload: 'USR002' }); });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    view.unmount();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).currentUserOid).toBe('USR002');
  });
});
