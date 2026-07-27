// Guards the DOM-environment half of the localStorage setup. This is a .tsx so
// it runs under jsdom (see environmentMatchGlobs in vitest.config.ts) — which
// is exactly the environment where Node's own bare `localStorage` global used
// to win and make `localStorage.clear()` throw "is not a function".
import { describe, it, expect } from 'vitest';

describe('localStorage in a jsdom test', () => {
  it('exposes the whole Storage surface, not a partial stub', () => {
    for (const method of ['getItem', 'setItem', 'removeItem', 'clear', 'key'] as const) {
      expect(typeof localStorage[method]).toBe('function');
    }
    expect(typeof localStorage.length).toBe('number');
  });

  it('supports clear() — the call that used to blow up', () => {
    localStorage.setItem('a', '1');
    localStorage.setItem('b', '2');
    expect(localStorage.length).toBe(2);

    localStorage.clear();

    expect(localStorage.length).toBe(0);
    expect(localStorage.getItem('a')).toBeNull();
  });

  it('round-trips values and enumerates keys', () => {
    localStorage.setItem('tail', 'N650GP');
    expect(localStorage.getItem('tail')).toBe('N650GP');
    expect(localStorage.key(0)).toBe('tail');
    expect(localStorage.key(99)).toBeNull();

    localStorage.removeItem('tail');
    expect(localStorage.getItem('tail')).toBeNull();
  });

  it('starts each test case empty, so cases cannot see each other', () => {
    expect(localStorage.length).toBe(0);
  });
});
