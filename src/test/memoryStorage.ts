// A complete in-memory `Storage` for tests, plus a save/restore installer.
//
// Two separate problems make this necessary:
//
// 1. Node >= 24 ships a global `localStorage` (the Web Storage API). Unless the
//    process was started with a valid `--localstorage-file`, that global is a
//    bare object with none of the Storage methods on it. Vitest's jsdom
//    environment only copies a window key onto the global if the global does
//    not already have it, so jsdom's real `Storage` never lands and every
//    jsdom test sees `localStorage.clear is not a function`. `src/test/setup.ts`
//    installs one of these for DOM environments so that cannot happen.
//
// 2. Node-environment tests that exercise persistence need *some* localStorage.
//    Hand-rolled stubs in individual test files kept drifting: they implemented
//    only the three or four methods that file happened to call, so the next
//    caller hit the same "not a function" failure from a different direction.
//
// The implementation covers the full `Storage` method surface. It does not
// emulate Storage's exotic named-property access (`storage.foo`) or its quota
// errors — no test in this repo relies on either.

class MemoryStorage implements Storage {
  private readonly entries = new Map<string, string>();

  get length(): number {
    return this.entries.size;
  }

  key(index: number): string | null {
    return Array.from(this.entries.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    const k = String(key);
    return this.entries.has(k) ? (this.entries.get(k) as string) : null;
  }

  setItem(key: string, value: string): void {
    this.entries.set(String(key), String(value));
  }

  removeItem(key: string): void {
    this.entries.delete(String(key));
  }

  clear(): void {
    this.entries.clear();
  }
}

/** A fresh, empty `Storage` backed by a Map. */
export function createMemoryStorage(): Storage {
  return new MemoryStorage();
}

/**
 * Install a fresh in-memory `localStorage` on `globalThis` and return a
 * function that puts back whatever was there before.
 *
 * Uses `defineProperty` rather than assignment on purpose: on Node >= 24 the
 * global `localStorage` is an accessor, so a plain `globalThis.localStorage =`
 * runs Node's setter instead of creating an own property, and the matching
 * `delete` then removes the built-in accessor outright rather than restoring
 * it. Capturing and re-applying the descriptor leaves the global exactly as it
 * was found.
 */
export function installMemoryStorage(): () => void {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

  Object.defineProperty(globalThis, 'localStorage', {
    value: createMemoryStorage(),
    writable: true,
    configurable: true,
    enumerable: true,
  });

  return () => {
    if (previous) {
      Object.defineProperty(globalThis, 'localStorage', previous);
    } else {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  };
}
