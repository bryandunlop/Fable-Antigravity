// Guards the node-environment half: installMemoryStorage must leave the global
// exactly as it found it, so a test file that needs localStorage cannot alter
// the global for anything that runs after it.
import { describe, it, expect } from 'vitest';
import { createMemoryStorage, installMemoryStorage } from './memoryStorage';

function descriptorOf() {
  return Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
}

describe('createMemoryStorage', () => {
  it('implements every Storage method', () => {
    const s = createMemoryStorage();
    s.setItem('k', 'v');
    expect(s.getItem('k')).toBe('v');
    expect(s.length).toBe(1);
    expect(s.key(0)).toBe('k');
    s.removeItem('k');
    expect(s.getItem('k')).toBeNull();
    s.setItem('x', 'y');
    s.clear();
    expect(s.length).toBe(0);
  });

  it('coerces keys and values to strings, as the real Storage does', () => {
    const s = createMemoryStorage();
    s.setItem('n', 1 as unknown as string);
    expect(s.getItem('n')).toBe('1');
  });
});

describe('installMemoryStorage', () => {
  it('restores the previous global descriptor exactly', () => {
    const before = descriptorOf();

    const restore = installMemoryStorage();
    expect(typeof localStorage.clear).toBe('function');

    restore();

    expect(descriptorOf()).toEqual(before);
  });

  it('deletes the global again when there was nothing there to begin with', () => {
    const original = descriptorOf();
    delete (globalThis as { localStorage?: unknown }).localStorage;

    try {
      const restore = installMemoryStorage();
      restore();
      expect('localStorage' in globalThis).toBe(false);
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
    }
  });

  it('hands out fresh storage on every install', () => {
    const restoreA = installMemoryStorage();
    localStorage.setItem('leaked', 'yes');
    restoreA();

    const restoreB = installMemoryStorage();
    expect(localStorage.getItem('leaked')).toBeNull();
    restoreB();
  });
});
