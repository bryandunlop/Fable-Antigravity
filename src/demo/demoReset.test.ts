import { describe, it, expect } from 'vitest';
import { clearDemoData } from './demoReset';

// In-memory Storage stand-in — vitest runs in the node environment, which has no
// global localStorage, so the reset takes its store by injection.
function fakeStorage(seed: Record<string, string> = {}): Storage {
  const m = new Map<string, string>(Object.entries(seed));
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, String(v)); },
    removeItem: (k: string) => { m.delete(k); },
    key: (i: number) => Array.from(m.keys())[i] ?? null,
  } as Storage;
}

describe('clearDemoData', () => {
  it('empties every persisted demo key back to a blank slate', () => {
    const store = fakeStorage({
      'quick-links-org': '[]',
      'quick-links-personal': '[]',
      'tech-log:scenario': '{}',
      'vacation-requests': '[]',
    });
    expect(store.length).toBe(4);

    clearDemoData(store);

    expect(store.length).toBe(0);
  });

  it('preserves the demo-password unlock so a reset stays past the gate', () => {
    const store = fakeStorage({
      'mygfo_demo_unlocked': 'true',
      'quick-links-org': '[]',
      'vacation-requests': '[]',
    });

    clearDemoData(store);

    expect(store.getItem('mygfo_demo_unlocked')).toBe('true');
    expect(store.getItem('quick-links-org')).toBeNull();
    expect(store.length).toBe(1);
  });

  it('is a safe no-op when storage is unavailable (SSR / node)', () => {
    expect(() => clearDemoData(undefined)).not.toThrow();
  });
});
