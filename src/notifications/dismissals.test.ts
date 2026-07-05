import { describe, it, expect, vi } from 'vitest';
import { createDismissalStore } from './dismissals';
import { memoryStorage } from './storage';

describe('dismissal store', () => {
  it('dismisses and restores per user', () => {
    const store = createDismissalStore(memoryStorage());
    store.dismiss('USR001', 'audit-due:A1');
    store.dismiss('USR001', 'audit-due:A1'); // idempotent
    expect(store.listDismissed('USR001')).toEqual(['audit-due:A1']);
    expect(store.listDismissed('USR002')).toEqual([]); // per-user isolation
    store.restore('USR001', 'audit-due:A1');
    expect(store.listDismissed('USR001')).toEqual([]);
  });

  it('notifies subscribers', () => {
    const store = createDismissalStore(memoryStorage());
    const fn = vi.fn();
    store.subscribe(fn);
    store.dismiss('USR001', 'x');
    store.restore('USR001', 'x');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
