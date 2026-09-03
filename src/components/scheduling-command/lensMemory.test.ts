import { describe, expect, it } from 'vitest';
import { recallLens, rememberLens } from './lensMemory';

describe('the last lens is remembered per person', () => {
  it('defaults to the board, remembers what each person last used, and ignores junk', () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } };
    expect(recallLens('R. Calloway', storage)).toBe('board');
    rememberLens('R. Calloway', 'queue', storage);
    rememberLens('J. Doe', 'horizon', storage);
    expect(recallLens('R. Calloway', storage)).toBe('queue');
    expect(recallLens('J. Doe', storage)).toBe('horizon');
    mem.set('scheduling:lens:R. Calloway', 'calendar');
    expect(recallLens('R. Calloway', storage)).toBe('board');
    expect(recallLens('anyone', null)).toBe('board');
  });
});
