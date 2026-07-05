export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Real localStorage when running in a browser; null in node (tests inject memoryStorage). */
export function defaultStorage(): StorageLike | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

export function memoryStorage(): StorageLike {
  const m = new Map<string, string>();
  return {
    getItem: k => m.get(k) ?? null,
    setItem: (k, v) => { m.set(k, v); },
    removeItem: k => { m.delete(k); },
  };
}
