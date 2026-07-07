# Global Notification Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stored-mailbox global notification system with a derived feed (contributors per module + minimal event stream), per `docs/notifications/2026-07-04-global-notifications-design.md`.

**Architecture:** Pure contributor functions derive `FeedItem[]` from each module's persisted localStorage store; a stored event store holds true occurrences (idempotent by caller-supplied id); one aggregator (`buildFeed`) merges, subtracts per-user dismissal keys, sorts, counts once. A thin `useNotificationFeed` hook adds reactivity. The bell and inventory Alerts UI become pure consumers.

**Tech Stack:** React 18, TypeScript, Vite, vitest (`environment: 'node'` — no jsdom, so all stores take injectable `StorageLike`; hooks/components are verified by type-check + build, not unit tests). lucide-react icons, existing ui/ primitives, date-fns.

## Global Constraints

- Worktree: `~/Antigravity/Fable-global-notifications`, branch `feat/global-notifications`. All paths below are relative to the worktree root.
- vitest runs in `node` environment: **no `localStorage`, no `window` in unit tests.** Every store/contributor accepts a `StorageLike` parameter (defaulting to real localStorage at runtime via a lazy helper).
- Severity taxonomy is exactly `'critical' | 'warn' | 'info'` — never reintroduce `low/medium/high`.
- `publishEvent` is **idempotent by `id`**: publishing an id that already exists is a silent no-op. Producers rely on this instead of sessionStorage/`lastChecked` throttles.
- Derived items never have read state; events never appear in the dismissed view.
- Existing store keys (do not invent new ones): tech-log `'tech-log-state'`/`'tech-log-data-version'` (`DATA_VERSION = '2026-06-22-v7'`, all exported from `src/components/tech-log/TechLogContext.tsx`), audits `'antigravity_audits'`, hazards `'aviation_hazards'`, inventory `'inv-v2-state'`. New keys introduced by this plan: `'notification-events'`, `'notif-dismissed:<userId>'`, `'trip-reminders'`.
- Test command: `npx vitest run <file>` (full suite: `npx vitest run`). Type check: `npm run type-check`. Build: `npm run build`.
- Commit after every task with a conventional-commits message ending in `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Baseline: 320 tests passing at branch point. The suite must never go below green between tasks.

---

### Task 1: Foundation — types, storage abstraction, identity

**Files:**
- Create: `src/notifications/types.ts`
- Create: `src/notifications/storage.ts`
- Create: `src/notifications/identity.ts`
- Test: `src/notifications/identity.test.ts`

**Interfaces:**
- Produces: `FeedSeverity`, `FeedItem`, `NotificationEvent`, `FeedEntry`, `FeedCounts` (types.ts); `StorageLike`, `defaultStorage()`, `memoryStorage()` (storage.ts); `resolveUserId(userRole: string): string` (identity.ts). Every later task consumes these.

- [ ] **Step 1: Write the failing test**

```ts
// src/notifications/identity.test.ts
import { describe, it, expect } from 'vitest';
import { resolveUserId } from './identity';
import { memoryStorage } from './storage';

describe('resolveUserId', () => {
  it('maps a login role to its SYSTEM_USERS id', () => {
    expect(resolveUserId('pilot')).toBe('USR001');       // Captain John Smith
    expect(resolveUserId('maintenance')).toBe('USR002'); // Sarah Wilson
  });

  it('falls back to a role-scoped id for unknown roles', () => {
    expect(resolveUserId('kiosk-nobody')).toBe('role:kiosk-nobody');
  });
});

describe('memoryStorage', () => {
  it('round-trips values and supports removal', () => {
    const s = memoryStorage();
    expect(s.getItem('k')).toBeNull();
    s.setItem('k', 'v');
    expect(s.getItem('k')).toBe('v');
    s.removeItem('k');
    expect(s.getItem('k')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/notifications/identity.test.ts`
Expected: FAIL — cannot resolve `./identity` / `./storage`.

- [ ] **Step 3: Write the implementation**

```ts
// src/notifications/types.ts
export type FeedSeverity = 'critical' | 'warn' | 'info';

/** One item in the notification feed. For derived items `id` is a stable
 * derivation key (same condition ⇒ same id) — it is the dismissal identity. */
export interface FeedItem {
  id: string;
  severity: FeedSeverity;
  title: string;
  detail?: string;
  module: string; // display grouping, e.g. 'Tech Log', 'Inventory'
  link: string;   // route to open
  atUtc?: string;
}

/** A stored point-in-time occurrence. The only stored notification kind. */
export interface NotificationEvent extends FeedItem {
  atUtc: string;
  audienceRoles: string[];
  readBy: string[]; // user ids
}

export type FeedEntry =
  | (FeedItem & { kind: 'derived' })
  | (NotificationEvent & { kind: 'event'; isRead: boolean });

export interface FeedCounts {
  total: number;     // visible entries (undismissed derived + all audience events)
  unread: number;    // unread events
  attention: number; // undismissed derived + unread events (the bell badge)
  critical: number;  // visible critical entries
}
```

```ts
// src/notifications/storage.ts
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
```

```ts
// src/notifications/identity.ts
import { SYSTEM_USERS } from '../lib/mockUsers';

/** The demo has no login identity beyond a role string; SYSTEM_USERS maps
 * roles to a stable user id for read/dismissal bookkeeping. */
export function resolveUserId(userRole: string): string {
  const sys = SYSTEM_USERS.find(u => u.roles?.includes(userRole));
  return sys?.id ?? `role:${userRole}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/notifications/identity.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/notifications
git commit -m "feat(notifications): feed types, storage abstraction, identity resolution

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Event store

**Files:**
- Create: `src/notifications/events.ts`
- Test: `src/notifications/events.test.ts`

**Interfaces:**
- Consumes: `NotificationEvent`, `StorageLike`, `defaultStorage`, `memoryStorage` (Task 1).
- Produces: `createEventStore(storage: StorageLike): EventStore` and singleton `eventStore`. `EventStore` = `{ publish(e), list(), listFor(userRole), markRead(userId, id), markUnread(userId, id), markAllRead(userId, userRole), subscribe(fn): () => void }`. `publish` takes `Omit<NotificationEvent, 'readBy' | 'atUtc'> & { atUtc?: string }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/notifications/events.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createEventStore } from './events';
import { memoryStorage } from './storage';

const base = {
  id: 'hazard:HZ-001',
  severity: 'warn' as const,
  title: 'New hazard reported: High severity',
  module: 'Safety Systems',
  link: '/safety/hazards',
  audienceRoles: ['safety', 'admin'],
};

describe('event store', () => {
  it('publishes an event with a stamped atUtc and empty readBy', () => {
    const store = createEventStore(memoryStorage());
    store.publish(base);
    const all = store.list();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('hazard:HZ-001');
    expect(all[0].readBy).toEqual([]);
    expect(all[0].atUtc).toBeTruthy();
  });

  it('is idempotent by id — re-publishing is a no-op', () => {
    const store = createEventStore(memoryStorage());
    store.publish(base);
    store.publish({ ...base, title: 'changed' });
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0].title).toBe('New hazard reported: High severity');
  });

  it('filters by audience role', () => {
    const store = createEventStore(memoryStorage());
    store.publish(base);
    store.publish({ ...base, id: 'e2', audienceRoles: ['scheduling'] });
    expect(store.listFor('safety').map(e => e.id)).toEqual(['hazard:HZ-001']);
    expect(store.listFor('scheduling').map(e => e.id)).toEqual(['e2']);
    expect(store.listFor('fa')).toEqual([]);
  });

  it('tracks read state per user', () => {
    const store = createEventStore(memoryStorage());
    store.publish(base);
    store.markRead('USR001', 'hazard:HZ-001');
    expect(store.list()[0].readBy).toEqual(['USR001']);
    store.markRead('USR001', 'hazard:HZ-001'); // no duplicate
    expect(store.list()[0].readBy).toEqual(['USR001']);
    store.markUnread('USR001', 'hazard:HZ-001');
    expect(store.list()[0].readBy).toEqual([]);
  });

  it('markAllRead marks only the role-visible events', () => {
    const store = createEventStore(memoryStorage());
    store.publish(base);
    store.publish({ ...base, id: 'e2', audienceRoles: ['scheduling'] });
    store.markAllRead('USR001', 'safety');
    expect(store.list().find(e => e.id === 'hazard:HZ-001')!.readBy).toEqual(['USR001']);
    expect(store.list().find(e => e.id === 'e2')!.readBy).toEqual([]);
  });

  it('caps stored events at 100, dropping the oldest', () => {
    const store = createEventStore(memoryStorage());
    for (let i = 0; i < 105; i++) store.publish({ ...base, id: `e${i}` });
    expect(store.list()).toHaveLength(100);
    expect(store.list().some(e => e.id === 'e0')).toBe(false);
    expect(store.list().some(e => e.id === 'e104')).toBe(true);
  });

  it('notifies subscribers on publish and read-state change', () => {
    const store = createEventStore(memoryStorage());
    const fn = vi.fn();
    const unsub = store.subscribe(fn);
    store.publish(base);
    store.markRead('USR001', 'hazard:HZ-001');
    expect(fn).toHaveBeenCalledTimes(2);
    unsub();
    store.publish({ ...base, id: 'e9' });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('persists across store instances sharing the same storage', () => {
    const storage = memoryStorage();
    createEventStore(storage).publish(base);
    expect(createEventStore(storage).list()).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/notifications/events.test.ts`
Expected: FAIL — cannot resolve `./events`.

- [ ] **Step 3: Write the implementation**

```ts
// src/notifications/events.ts
import type { NotificationEvent } from './types';
import { defaultStorage, memoryStorage, type StorageLike } from './storage';

const KEY = 'notification-events';
const MAX_EVENTS = 100;

export interface EventStore {
  /** Idempotent by id: publishing an existing id is a silent no-op. */
  publish(e: Omit<NotificationEvent, 'readBy' | 'atUtc'> & { atUtc?: string }): void;
  list(): NotificationEvent[];
  listFor(userRole: string): NotificationEvent[];
  markRead(userId: string, eventId: string): void;
  markUnread(userId: string, eventId: string): void;
  markAllRead(userId: string, userRole: string): void;
  subscribe(fn: () => void): () => void;
}

export function createEventStore(storage: StorageLike): EventStore {
  const listeners = new Set<() => void>();

  const load = (): NotificationEvent[] => {
    try {
      const raw = storage.getItem(KEY);
      return raw ? (JSON.parse(raw) as NotificationEvent[]) : [];
    } catch {
      return [];
    }
  };
  const save = (events: NotificationEvent[]) => {
    storage.setItem(KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
    listeners.forEach(fn => fn());
  };

  return {
    publish(e) {
      const events = load();
      if (events.some(x => x.id === e.id)) return;
      save([{ ...e, atUtc: e.atUtc ?? new Date().toISOString(), readBy: [] }, ...events]);
    },
    list: load,
    listFor(userRole) {
      return load().filter(e => e.audienceRoles.includes(userRole));
    },
    markRead(userId, eventId) {
      save(load().map(e =>
        e.id === eventId && !e.readBy.includes(userId) ? { ...e, readBy: [...e.readBy, userId] } : e,
      ));
    },
    markUnread(userId, eventId) {
      save(load().map(e => (e.id === eventId ? { ...e, readBy: e.readBy.filter(u => u !== userId) } : e)));
    },
    markAllRead(userId, userRole) {
      save(load().map(e =>
        e.audienceRoles.includes(userRole) && !e.readBy.includes(userId)
          ? { ...e, readBy: [...e.readBy, userId] }
          : e,
      ));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

/** App-wide singleton (in-memory fallback keeps non-browser environments harmless). */
export const eventStore = createEventStore(defaultStorage() ?? memoryStorage());
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/notifications/events.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/notifications/events.ts src/notifications/events.test.ts
git commit -m "feat(notifications): idempotent stored event stream with per-user read state

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Dismissal store

**Files:**
- Create: `src/notifications/dismissals.ts`
- Test: `src/notifications/dismissals.test.ts`

**Interfaces:**
- Produces: `createDismissalStore(storage): DismissalStore` and singleton `dismissalStore`. `DismissalStore` = `{ dismiss(userId, id), restore(userId, id), listDismissed(userId): string[], subscribe(fn): () => void }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/notifications/dismissals.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/notifications/dismissals.test.ts`
Expected: FAIL — cannot resolve `./dismissals`.

- [ ] **Step 3: Write the implementation**

```ts
// src/notifications/dismissals.ts
import { defaultStorage, memoryStorage, type StorageLike } from './storage';

const keyFor = (userId: string) => `notif-dismissed:${userId}`;

export interface DismissalStore {
  dismiss(userId: string, id: string): void;
  restore(userId: string, id: string): void;
  listDismissed(userId: string): string[];
  subscribe(fn: () => void): () => void;
}

export function createDismissalStore(storage: StorageLike): DismissalStore {
  const listeners = new Set<() => void>();

  const load = (userId: string): string[] => {
    try {
      const raw = storage.getItem(keyFor(userId));
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  };
  const save = (userId: string, ids: string[]) => {
    storage.setItem(keyFor(userId), JSON.stringify(ids));
    listeners.forEach(fn => fn());
  };

  return {
    dismiss(userId, id) {
      const ids = load(userId);
      save(userId, ids.includes(id) ? ids : [...ids, id]);
    },
    restore(userId, id) {
      save(userId, load(userId).filter(x => x !== id));
    },
    listDismissed: load,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export const dismissalStore = createDismissalStore(defaultStorage() ?? memoryStorage());
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/notifications/dismissals.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/notifications/dismissals.ts src/notifications/dismissals.test.ts
git commit -m "feat(notifications): per-user dismissal keys for derived feed items

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Audit contributor

**Files:**
- Create: `src/notifications/contributors/audits.ts`
- Test: `src/notifications/contributors/audits.test.ts`

**Interfaces:**
- Consumes: `FeedItem`, `StorageLike`, `defaultStorage` (Task 1).
- Produces: `buildAuditFeed(userRole: string, nowUtc: string, storage?: StorageLike | null): FeedItem[]`. Reads `'antigravity_audits'` (a JSON `Audit[]` written by `src/contexts/AuditContext.tsx`; relevant fields `{ id, title, expirationDate?, assignedTo? }`). Audience: `maintenance | safety | admin | lead`. Severity: expired → `critical`, ≤7d → `warn`, ≤30d → `info`; ids `audit-expired:<id>` / `audit-due:<id>`.

- [ ] **Step 1: Write the failing test**

```ts
// src/notifications/contributors/audits.test.ts
import { describe, it, expect } from 'vitest';
import { buildAuditFeed } from './audits';
import { memoryStorage } from '../storage';

const NOW = '2026-07-04T12:00:00.000Z';

function seeded(audits: unknown[]) {
  const s = memoryStorage();
  s.setItem('antigravity_audits', JSON.stringify(audits));
  return s;
}

describe('buildAuditFeed', () => {
  it('derives expired (critical), imminent (warn) and upcoming (info) audits', () => {
    const s = seeded([
      { id: 'A1', title: 'Fuel Farm', expirationDate: '2026-07-01', assignedTo: 'Sarah Wilson' },
      { id: 'A2', title: 'Ramp Ops', expirationDate: '2026-07-08' },
      { id: 'A3', title: 'SMS Manual', expirationDate: '2026-07-30' },
      { id: 'A4', title: 'Far Future', expirationDate: '2026-12-01' },
      { id: 'A5', title: 'No Expiry' },
    ]);
    const items = buildAuditFeed('safety', NOW, s);
    expect(items.map(i => [i.id, i.severity])).toEqual([
      ['audit-expired:A1', 'critical'],
      ['audit-due:A2', 'warn'],
      ['audit-due:A3', 'info'],
    ]);
    expect(items[0].module).toBe('Audit Management');
    expect(items[0].link).toBe('/internal-audits');
    expect(items[0].detail).toContain('Sarah Wilson');
  });

  it('self-clears: a renewed audit produces nothing', () => {
    const s = seeded([{ id: 'A1', title: 'Fuel Farm', expirationDate: '2027-01-01' }]);
    expect(buildAuditFeed('safety', NOW, s)).toEqual([]);
  });

  it('returns nothing for roles outside the audience', () => {
    const s = seeded([{ id: 'A1', title: 'Fuel Farm', expirationDate: '2026-07-01' }]);
    expect(buildAuditFeed('fa', NOW, s)).toEqual([]);
  });

  it('is safe on missing or corrupt storage', () => {
    expect(buildAuditFeed('safety', NOW, memoryStorage())).toEqual([]);
    const s = memoryStorage();
    s.setItem('antigravity_audits', '{not json');
    expect(buildAuditFeed('safety', NOW, s)).toEqual([]);
    expect(buildAuditFeed('safety', NOW, null)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/notifications/contributors/audits.test.ts`
Expected: FAIL — cannot resolve `./audits`.

- [ ] **Step 3: Write the implementation**

```ts
// src/notifications/contributors/audits.ts
import type { FeedItem } from '../types';
import { defaultStorage, type StorageLike } from '../storage';

const AUDIENCE = ['maintenance', 'safety', 'admin', 'lead'];
const DAY = 86400000;

interface StoredAudit {
  id: string;
  title: string;
  expirationDate?: string;
  assignedTo?: string;
}

export function buildAuditFeed(
  userRole: string,
  nowUtc: string,
  storage: StorageLike | null = defaultStorage(),
): FeedItem[] {
  if (!AUDIENCE.includes(userRole) || !storage) return [];
  let audits: StoredAudit[];
  try {
    audits = JSON.parse(storage.getItem('antigravity_audits') ?? '[]');
  } catch {
    return [];
  }
  const now = new Date(nowUtc).getTime();
  const out: FeedItem[] = [];
  for (const a of audits) {
    if (!a.expirationDate) continue;
    const daysUntil = Math.ceil((new Date(a.expirationDate).getTime() - now) / DAY);
    const assigned = a.assignedTo ? `Assigned to ${a.assignedTo}.` : undefined;
    if (daysUntil < 0) {
      out.push({
        id: `audit-expired:${a.id}`,
        severity: 'critical',
        title: `Audit expired: ${a.title}`,
        detail: [`Expired ${Math.abs(daysUntil)} day(s) ago.`, assigned].filter(Boolean).join(' '),
        module: 'Audit Management',
        link: '/internal-audits',
      });
    } else if (daysUntil <= 30) {
      out.push({
        id: `audit-due:${a.id}`,
        severity: daysUntil <= 7 ? 'warn' : 'info',
        title: `Audit expiring in ${daysUntil}d: ${a.title}`,
        detail: assigned,
        module: 'Audit Management',
        link: '/internal-audits',
      });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/notifications/contributors/audits.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/notifications/contributors
git commit -m "feat(notifications): derived audit-expiry contributor

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Hazard contributor

**Files:**
- Create: `src/notifications/contributors/hazards.ts`
- Test: `src/notifications/contributors/hazards.test.ts`

**Interfaces:**
- Produces: `buildHazardFeed(userRole, nowUtc, storage?): FeedItem[]`. Reads `'aviation_hazards'` (JSON `Hazard[]` from `src/contexts/HazardContext.tsx`; relevant fields `{ id, title, effectivenessReviewDate? }`). Audience: `safety | admin | lead`. Overdue review → `warn`, due within 7d → `info`; id `hazard-review:<id>`, link `/safety/hazard-workflow/<id>`.

- [ ] **Step 1: Write the failing test**

```ts
// src/notifications/contributors/hazards.test.ts
import { describe, it, expect } from 'vitest';
import { buildHazardFeed } from './hazards';
import { memoryStorage } from '../storage';

const NOW = '2026-07-04T12:00:00.000Z';

function seeded(hazards: unknown[]) {
  const s = memoryStorage();
  s.setItem('aviation_hazards', JSON.stringify(hazards));
  return s;
}

describe('buildHazardFeed', () => {
  it('derives overdue (warn) and upcoming (info) effectiveness reviews', () => {
    const s = seeded([
      { id: 'HZ-001', title: 'FOD on ramp', effectivenessReviewDate: '2026-06-30' },
      { id: 'HZ-002', title: 'Hangar door', effectivenessReviewDate: '2026-07-09' },
      { id: 'HZ-003', title: 'Far future', effectivenessReviewDate: '2026-09-01' },
      { id: 'HZ-004', title: 'No review date' },
    ]);
    const items = buildHazardFeed('safety', NOW, s);
    expect(items.map(i => [i.id, i.severity])).toEqual([
      ['hazard-review:HZ-001', 'warn'],
      ['hazard-review:HZ-002', 'info'],
    ]);
    expect(items[0].link).toBe('/safety/hazard-workflow/HZ-001');
    expect(items[0].title).toContain('overdue');
    expect(items[1].title).toContain('due');
  });

  it('returns nothing for roles outside the audience and on missing storage', () => {
    const s = seeded([{ id: 'HZ-001', title: 'x', effectivenessReviewDate: '2026-06-30' }]);
    expect(buildHazardFeed('pilot', NOW, s)).toEqual([]);
    expect(buildHazardFeed('safety', NOW, memoryStorage())).toEqual([]);
    expect(buildHazardFeed('safety', NOW, null)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/notifications/contributors/hazards.test.ts`
Expected: FAIL — cannot resolve `./hazards`.

- [ ] **Step 3: Write the implementation**

```ts
// src/notifications/contributors/hazards.ts
import type { FeedItem } from '../types';
import { defaultStorage, type StorageLike } from '../storage';

const AUDIENCE = ['safety', 'admin', 'lead'];
const DAY = 86400000;

interface StoredHazard {
  id: string;
  title: string;
  effectivenessReviewDate?: string;
}

export function buildHazardFeed(
  userRole: string,
  nowUtc: string,
  storage: StorageLike | null = defaultStorage(),
): FeedItem[] {
  if (!AUDIENCE.includes(userRole) || !storage) return [];
  let hazards: StoredHazard[];
  try {
    hazards = JSON.parse(storage.getItem('aviation_hazards') ?? '[]');
  } catch {
    return [];
  }
  const now = new Date(nowUtc).getTime();
  const out: FeedItem[] = [];
  for (const h of hazards) {
    if (!h.effectivenessReviewDate) continue;
    const daysUntil = Math.ceil((new Date(h.effectivenessReviewDate).getTime() - now) / DAY);
    if (daysUntil > 7) continue;
    out.push({
      id: `hazard-review:${h.id}`,
      severity: daysUntil < 0 ? 'warn' : 'info',
      title: daysUntil < 0
        ? `Effectiveness review overdue: ${h.title}`
        : `Effectiveness review due${daysUntil === 0 ? ' today' : ` in ${daysUntil}d`}: ${h.title}`,
      detail: '6-month effectiveness review.',
      module: 'Safety Systems',
      link: `/safety/hazard-workflow/${h.id}`,
    });
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/notifications/contributors/hazards.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/notifications/contributors/hazards.ts src/notifications/contributors/hazards.test.ts
git commit -m "feat(notifications): derived hazard-review contributor

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Inventory contributor

**Files:**
- Create: `src/notifications/contributors/inventory.ts`
- Test: `src/notifications/contributors/inventory.test.ts`

**Interfaces:**
- Produces: `buildInventoryFeed(userRole, nowUtc, storage?): FeedItem[]`. Reads `'inv-v2-state'` (the persisted `InventoryV2State`; relevant slices: `stockroomItems: { itemId, stockroomId, qtyOnHand, minimumLevel, parLevel }[]`, `items: { id, itemName }[]`, `inspections: { id, tailNumber, status }[]`, `groceryLists: { id, tailNumber?, generatedBy?, status, items: unknown[] }[]`). Audience: `inflight | fa | lead-fa | commissary-manager | admin | lead`. Level states: at/below `minimumLevel` → `critical` (`inv-min:<stockroomId>:<itemId>`), below `parLevel` → `warn` (`inv-par:<stockroomId>:<itemId>`), inspection `restocking_needed` → `warn` (`inv-inspection:<id>`), grocery list `sent` → `info` (`inv-grocery:<id>`).

- [ ] **Step 1: Write the failing test**

```ts
// src/notifications/contributors/inventory.test.ts
import { describe, it, expect } from 'vitest';
import { buildInventoryFeed } from './inventory';
import { memoryStorage } from '../storage';

const NOW = '2026-07-04T12:00:00.000Z';

function seeded(state: object) {
  const s = memoryStorage();
  s.setItem('inv-v2-state', JSON.stringify(state));
  return s;
}

describe('buildInventoryFeed', () => {
  it('derives below-minimum (critical) and below-par (warn) stock levels', () => {
    const s = seeded({
      items: [{ id: 'IT1', itemName: 'Diet Coke' }, { id: 'IT2', itemName: 'Napkins' }],
      stockroomItems: [
        { itemId: 'IT1', stockroomId: 'SR1', qtyOnHand: 2, minimumLevel: 4, parLevel: 12 },
        { itemId: 'IT2', stockroomId: 'SR1', qtyOnHand: 8, minimumLevel: 4, parLevel: 12 },
      ],
      inspections: [],
      groceryLists: [],
    });
    const items = buildInventoryFeed('commissary-manager', NOW, s);
    expect(items.map(i => [i.id, i.severity])).toEqual([
      ['inv-min:SR1:IT1', 'critical'],
      ['inv-par:SR1:IT2', 'warn'],
    ]);
    expect(items[0].title).toBe('Diet Coke critically low');
    expect(items[0].detail).toBe('2 on hand (minimum: 4)');
    expect(items[0].link).toBe('/inventory-v2/commissary');
    expect(items[1].title).toBe('Napkins below par');
  });

  it('derives restocking-needed inspections and sent grocery lists', () => {
    const s = seeded({
      items: [],
      stockroomItems: [],
      inspections: [
        { id: 'INS1', tailNumber: 'N650PR', status: 'restocking_needed' },
        { id: 'INS2', tailNumber: 'N500GA', status: 'completed' },
      ],
      groceryLists: [
        { id: 'GL1', tailNumber: 'N650PR', generatedBy: 'Mike Johnson', status: 'sent', items: [1, 2, 3] },
        { id: 'GL2', tailNumber: 'N500GA', status: 'fulfilled', items: [] },
      ],
    });
    const items = buildInventoryFeed('fa', NOW, s);
    expect(items.map(i => i.id)).toEqual(['inv-inspection:INS1', 'inv-grocery:GL1']);
    expect(items[0].severity).toBe('warn');
    expect(items[0].link).toBe('/inventory-v2/replenish');
    expect(items[1].severity).toBe('info');
    expect(items[1].detail).toBe('3 items requested');
  });

  it('self-clears when stock is restored', () => {
    const s = seeded({
      items: [{ id: 'IT1', itemName: 'Diet Coke' }],
      stockroomItems: [{ itemId: 'IT1', stockroomId: 'SR1', qtyOnHand: 20, minimumLevel: 4, parLevel: 12 }],
      inspections: [],
      groceryLists: [],
    });
    expect(buildInventoryFeed('fa', NOW, s)).toEqual([]);
  });

  it('returns nothing for roles outside the audience and on missing/corrupt storage', () => {
    expect(buildInventoryFeed('pilot', NOW, seeded({ items: [], stockroomItems: [], inspections: [], groceryLists: [] }))).toEqual([]);
    expect(buildInventoryFeed('fa', NOW, memoryStorage())).toEqual([]);
    const s = memoryStorage();
    s.setItem('inv-v2-state', 'nope');
    expect(buildInventoryFeed('fa', NOW, s)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/notifications/contributors/inventory.test.ts`
Expected: FAIL — cannot resolve `./inventory`.

- [ ] **Step 3: Write the implementation**

```ts
// src/notifications/contributors/inventory.ts
import type { FeedItem } from '../types';
import { defaultStorage, type StorageLike } from '../storage';

const AUDIENCE = ['inflight', 'fa', 'lead-fa', 'commissary-manager', 'admin', 'lead'];

interface StoredInventoryState {
  items?: { id: string; itemName: string }[];
  stockroomItems?: { itemId: string; stockroomId: string; qtyOnHand: number; minimumLevel: number; parLevel: number }[];
  inspections?: { id: string; tailNumber: string; status: string }[];
  groceryLists?: { id: string; tailNumber?: string; generatedBy?: string; status: string; items: unknown[] }[];
}

export function buildInventoryFeed(
  userRole: string,
  _nowUtc: string,
  storage: StorageLike | null = defaultStorage(),
): FeedItem[] {
  if (!AUDIENCE.includes(userRole) || !storage) return [];
  let state: StoredInventoryState;
  try {
    state = JSON.parse(storage.getItem('inv-v2-state') ?? 'null');
  } catch {
    return [];
  }
  if (!state) return [];

  const out: FeedItem[] = [];
  const itemName = (id: string) => state.items?.find(i => i.id === id)?.itemName ?? id;

  for (const si of state.stockroomItems ?? []) {
    if (si.qtyOnHand <= si.minimumLevel) {
      out.push({
        id: `inv-min:${si.stockroomId}:${si.itemId}`,
        severity: 'critical',
        title: `${itemName(si.itemId)} critically low`,
        detail: `${si.qtyOnHand} on hand (minimum: ${si.minimumLevel})`,
        module: 'Inventory',
        link: '/inventory-v2/commissary',
      });
    } else if (si.qtyOnHand < si.parLevel) {
      out.push({
        id: `inv-par:${si.stockroomId}:${si.itemId}`,
        severity: 'warn',
        title: `${itemName(si.itemId)} below par`,
        detail: `${si.qtyOnHand} on hand (par: ${si.parLevel})`,
        module: 'Inventory',
        link: '/inventory-v2/commissary',
      });
    }
  }

  for (const insp of state.inspections ?? []) {
    if (insp.status !== 'restocking_needed') continue;
    out.push({
      id: `inv-inspection:${insp.id}`,
      severity: 'warn',
      title: `Restocking needed on ${insp.tailNumber}`,
      detail: 'Inspection found items below par.',
      module: 'Inventory',
      link: '/inventory-v2/replenish',
    });
  }

  for (const gl of state.groceryLists ?? []) {
    if (gl.status !== 'sent') continue;
    out.push({
      id: `inv-grocery:${gl.id}`,
      severity: 'info',
      title: `Grocery list from ${gl.generatedBy ?? 'FA'}${gl.tailNumber ? ` for ${gl.tailNumber}` : ''}`,
      detail: `${gl.items.length} item${gl.items.length !== 1 ? 's' : ''} requested`,
      module: 'Inventory',
      link: '/inventory-v2/commissary',
    });
  }

  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/notifications/contributors/inventory.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/notifications/contributors/inventory.ts src/notifications/contributors/inventory.test.ts
git commit -m "feat(notifications): derived inventory contributor (levels, inspections, grocery lists)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Trip reminder store + contributor

**Files:**
- Create: `src/notifications/tripReminderStore.ts`
- Create: `src/notifications/contributors/tripReminders.ts`
- Test: `src/notifications/contributors/tripReminders.test.ts`

**Interfaces:**
- Produces: `addTripReminder(r: TripReminder, storage?): void`, `listTripReminders(storage?): TripReminder[]` where `TripReminder = { id, title, detail?, dueAtUtc, tripId }` (key `'trip-reminders'`); `buildTripReminderFeed(userRole, nowUtc, storage?): FeedItem[]`. Audience: `scheduling | admin | lead | admin-assistant`. A reminder appears only once `nowUtc >= dueAtUtc`, severity `warn`, id `trip-reminder:<id>`, link `/trip-coordination`.

- [ ] **Step 1: Write the failing test**

```ts
// src/notifications/contributors/tripReminders.test.ts
import { describe, it, expect } from 'vitest';
import { addTripReminder, listTripReminders } from '../tripReminderStore';
import { buildTripReminderFeed } from './tripReminders';
import { memoryStorage } from '../storage';

const NOW = '2026-07-04T12:00:00.000Z';

describe('trip reminders', () => {
  it('persists reminders and surfaces only the due ones', () => {
    const s = memoryStorage();
    addTripReminder({ id: 'TR1', title: 'File intl flight plans', detail: 'TRP-2026-014', dueAtUtc: '2026-07-04T09:00:00.000Z', tripId: 'TRP-2026-014' }, s);
    addTripReminder({ id: 'TR2', title: 'Catering confirmation', dueAtUtc: '2026-07-05T09:00:00.000Z', tripId: 'TRP-2026-015' }, s);
    expect(listTripReminders(s)).toHaveLength(2);

    const items = buildTripReminderFeed('scheduling', NOW, s);
    expect(items.map(i => i.id)).toEqual(['trip-reminder:TR1']);
    expect(items[0].severity).toBe('warn');
    expect(items[0].module).toBe('Trip Coordination');
    expect(items[0].link).toBe('/trip-coordination');
  });

  it('returns nothing for roles outside the audience and on empty storage', () => {
    const s = memoryStorage();
    addTripReminder({ id: 'TR1', title: 'x', dueAtUtc: '2026-07-01T00:00:00.000Z', tripId: 't' }, s);
    expect(buildTripReminderFeed('pilot', NOW, s)).toEqual([]);
    expect(buildTripReminderFeed('scheduling', NOW, memoryStorage())).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/notifications/contributors/tripReminders.test.ts`
Expected: FAIL — cannot resolve `../tripReminderStore`.

- [ ] **Step 3: Write the implementation**

```ts
// src/notifications/tripReminderStore.ts
import { defaultStorage, type StorageLike } from './storage';

const KEY = 'trip-reminders';

export interface TripReminder {
  id: string;
  title: string;
  detail?: string;
  dueAtUtc: string;
  tripId: string;
}

export function listTripReminders(storage: StorageLike | null = defaultStorage()): TripReminder[] {
  if (!storage) return [];
  try {
    return JSON.parse(storage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function addTripReminder(r: TripReminder, storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  storage.setItem(KEY, JSON.stringify([...listTripReminders(storage), r]));
}
```

```ts
// src/notifications/contributors/tripReminders.ts
import type { FeedItem } from '../types';
import { defaultStorage, type StorageLike } from '../storage';
import { listTripReminders } from '../tripReminderStore';

const AUDIENCE = ['scheduling', 'admin', 'lead', 'admin-assistant'];

export function buildTripReminderFeed(
  userRole: string,
  nowUtc: string,
  storage: StorageLike | null = defaultStorage(),
): FeedItem[] {
  if (!AUDIENCE.includes(userRole) || !storage) return [];
  return listTripReminders(storage)
    .filter(r => r.dueAtUtc <= nowUtc)
    .map(r => ({
      id: `trip-reminder:${r.id}`,
      severity: 'warn' as const,
      title: r.title,
      detail: r.detail,
      module: 'Trip Coordination',
      link: '/trip-coordination',
      atUtc: r.dueAtUtc,
    }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/notifications/contributors/tripReminders.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/notifications/tripReminderStore.ts src/notifications/contributors/tripReminders.ts src/notifications/contributors/tripReminders.test.ts
git commit -m "feat(notifications): persisted trip reminders with derived due-state feed

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Tech-log contributor

**Files:**
- Create: `src/notifications/contributors/techLog.ts`
- Test: `src/notifications/contributors/techLog.test.ts`

**Interfaces:**
- Consumes: `buildNotifications(state, user, nowUtc)` from `src/components/tech-log/engine/notifications.ts`; `STORAGE_KEY`, `VERSION_KEY`, `DATA_VERSION` from `src/components/tech-log/TechLogContext.tsx`; `getDefaultState()` from `src/components/tech-log/mockData/scenarios.ts`; `Personnel` type from `src/components/tech-log/types.ts`; `SYSTEM_USERS` from `src/lib/mockUsers.ts`.
- Produces: `buildTechLogFeed(userRole, nowUtc, storage?): FeedItem[]`. Ids are namespaced `techlog:<engine id>`; module `'Tech Log'`. Roles resolving to maintenance SYSTEM_USERS (roles intersecting `['maintenance','chief-inspector','shift-lead','maintenance-coordinator','dom']`) get the maintenance lens; roles intersecting `['pilot','chief-pilot']` get the pilot lens; anyone else gets `[]`. The engine's own dismissal keys (`state.dismissedNotifications`) remain applied inside `buildNotifications`.

- [ ] **Step 1: Write the failing test**

```ts
// src/notifications/contributors/techLog.test.ts
import { describe, it, expect } from 'vitest';
import { buildTechLogFeed } from './techLog';
import { memoryStorage } from '../storage';
import { STORAGE_KEY, VERSION_KEY, DATA_VERSION } from '../../components/tech-log/TechLogContext';
import { getDefaultState } from '../../components/tech-log/mockData/scenarios';

const NOW = '2026-07-04T12:00:00.000Z';

function seededCurrent() {
  const s = memoryStorage();
  s.setItem(VERSION_KEY, DATA_VERSION);
  s.setItem(STORAGE_KEY, JSON.stringify(getDefaultState()));
  return s;
}

describe('buildTechLogFeed', () => {
  it('produces maintenance-lens items for the maintenance role, namespaced and module-tagged', () => {
    const items = buildTechLogFeed('maintenance', NOW, seededCurrent());
    expect(items.length).toBeGreaterThan(0);
    for (const i of items) {
      expect(i.id.startsWith('techlog:')).toBe(true);
      expect(i.module).toBe('Tech Log');
      expect(['critical', 'warn', 'info']).toContain(i.severity);
    }
  });

  it('gives pilots the pilot lens (no raw new-squawk items)', () => {
    const maint = buildTechLogFeed('maintenance', NOW, seededCurrent());
    const pilot = buildTechLogFeed('pilot', NOW, seededCurrent());
    expect(pilot.some(i => i.id.startsWith('techlog:sq:'))).toBe(false);
    expect(maint.map(i => i.id)).not.toEqual(pilot.map(i => i.id));
  });

  it('returns nothing for roles with no tech-log persona', () => {
    expect(buildTechLogFeed('fa', NOW, seededCurrent())).toEqual([]);
  });

  it('falls back to the default scenario when the stored version is stale', () => {
    const s = memoryStorage();
    s.setItem(VERSION_KEY, 'ancient');
    s.setItem(STORAGE_KEY, '{"garbage":true}');
    expect(buildTechLogFeed('maintenance', NOW, s).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/notifications/contributors/techLog.test.ts`
Expected: FAIL — cannot resolve `./techLog`.

- [ ] **Step 3: Write the implementation**

```ts
// src/notifications/contributors/techLog.ts
import type { FeedItem } from '../types';
import { defaultStorage, type StorageLike } from '../storage';
import { buildNotifications } from '../../components/tech-log/engine/notifications';
import { STORAGE_KEY, VERSION_KEY, DATA_VERSION } from '../../components/tech-log/TechLogContext';
import { getDefaultState } from '../../components/tech-log/mockData/scenarios';
import type { Personnel, TechLogState } from '../../components/tech-log/types';
import { SYSTEM_USERS } from '../../lib/mockUsers';

// Mirrors MAINT_ROLES in TechLogContext.tsx (not exported there).
const MAINT_ROLES = ['maintenance', 'chief-inspector', 'shift-lead', 'maintenance-coordinator', 'dom'];
const PILOT_ROLES = ['pilot', 'chief-pilot'];

function readState(storage: StorageLike): TechLogState {
  // Mirrors loadInitialState() in TechLogContext.tsx, read-only (never writes).
  if (storage.getItem(VERSION_KEY) !== DATA_VERSION) return getDefaultState();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? { ...getDefaultState(), ...JSON.parse(raw) } : getDefaultState();
  } catch {
    return getDefaultState();
  }
}

export function buildTechLogFeed(
  userRole: string,
  nowUtc: string,
  storage: StorageLike | null = defaultStorage(),
): FeedItem[] {
  if (!storage) return [];
  const sys = SYSTEM_USERS.find(u => u.roles?.includes(userRole));
  if (!sys) return [];
  const isMaint = (sys.roles ?? []).some(r => MAINT_ROLES.includes(r));
  const isPilot = (sys.roles ?? []).some(r => PILOT_ROLES.includes(r));
  if (!isMaint && !isPilot) return [];

  const state = readState(storage);
  const persona: Personnel = state.personnel.find(p => p.oid === sys.id) ?? {
    oid: sys.id,
    displayName: (sys as { name?: string }).name ?? sys.id,
    role: isMaint ? 'MAINTENANCE' : 'PILOT',
    riiAuthorized: false,
    riiAuthorizedAta: [],
    active: true,
  };

  return buildNotifications(state, persona, nowUtc).map(n => ({
    id: `techlog:${n.id}`,
    severity: n.severity,
    title: n.title,
    detail: n.detail,
    module: 'Tech Log',
    link: n.link,
    atUtc: n.atUtc,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/notifications/contributors/techLog.test.ts`
Expected: PASS (4 tests). If the default scenario yields zero maintenance items, inspect `getDefaultState()` — it seeds open defects, so items are expected; a failure here means the wrapper is filtering wrongly, not that the test needs weakening.

- [ ] **Step 5: Commit**

```bash
git add src/notifications/contributors/techLog.ts src/notifications/contributors/techLog.test.ts
git commit -m "feat(notifications): tech-log contributor wrapping the derived engine

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Registry + feed builder

**Files:**
- Create: `src/notifications/contributors.ts`
- Create: `src/notifications/feed.ts`
- Test: `src/notifications/feed.test.ts`

**Interfaces:**
- Consumes: all five contributors, `eventStore`/`createEventStore`, `dismissalStore`/`createDismissalStore`, `resolveUserId`.
- Produces: `CONTRIBUTORS: FeedContributor[]` where `FeedContributor = (userRole: string, nowUtc: string) => FeedItem[]`; `buildFeed(userRole, nowUtc, deps?): Feed` with `Feed = { entries: FeedEntry[]; dismissed: FeedEntry[]; counts: FeedCounts }` and `deps = { contributors, events, dismissals }` defaulting to the real registry/singletons. Sort: severity rank (`critical`<`warn`<`info`), then `atUtc` descending (missing `atUtc` sorts last within its severity).

- [ ] **Step 1: Write the failing test**

```ts
// src/notifications/feed.test.ts
import { describe, it, expect } from 'vitest';
import { buildFeed } from './feed';
import { createEventStore } from './events';
import { createDismissalStore } from './dismissals';
import { memoryStorage } from './storage';
import type { FeedItem } from './types';

const NOW = '2026-07-04T12:00:00.000Z';

function deps(items: FeedItem[]) {
  const storage = memoryStorage();
  return {
    contributors: [() => items],
    events: createEventStore(storage),
    dismissals: createDismissalStore(storage),
  };
}

const derived: FeedItem[] = [
  { id: 'd-info', severity: 'info', title: 'info item', module: 'M', link: '/x', atUtc: '2026-07-04T10:00:00.000Z' },
  { id: 'd-crit', severity: 'critical', title: 'critical item', module: 'M', link: '/x' },
  { id: 'd-warn', severity: 'warn', title: 'warn item', module: 'M', link: '/x' },
];

describe('buildFeed', () => {
  it('merges contributors and events, sorted by severity then recency', () => {
    const d = deps(derived);
    d.events.publish({ id: 'ev1', severity: 'warn', title: 'event', module: 'M', link: '/y', audienceRoles: ['pilot'], atUtc: '2026-07-04T11:00:00.000Z' });
    const feed = buildFeed('pilot', NOW, d);
    expect(feed.entries.map(e => e.id)).toEqual(['d-crit', 'ev1', 'd-warn', 'd-info']);
    expect(feed.counts).toEqual({ total: 4, unread: 1, attention: 4, critical: 1 });
  });

  it('excludes events outside the audience', () => {
    const d = deps([]);
    d.events.publish({ id: 'ev1', severity: 'info', title: 'x', module: 'M', link: '/y', audienceRoles: ['scheduling'] });
    expect(buildFeed('pilot', NOW, d).entries).toEqual([]);
  });

  it('moves dismissed derived items to the dismissed list without read-state semantics', () => {
    const d = deps(derived);
    d.dismissals.dismiss('USR001', 'd-crit'); // pilot resolves to USR001
    const feed = buildFeed('pilot', NOW, d);
    expect(feed.entries.map(e => e.id)).toEqual(['d-warn', 'd-info']);
    expect(feed.dismissed.map(e => e.id)).toEqual(['d-crit']);
    expect(feed.counts).toEqual({ total: 2, unread: 0, attention: 2, critical: 0 });
  });

  it('read events lower unread/attention but stay in entries', () => {
    const d = deps([]);
    d.events.publish({ id: 'ev1', severity: 'info', title: 'x', module: 'M', link: '/y', audienceRoles: ['pilot'] });
    d.events.markRead('USR001', 'ev1');
    const feed = buildFeed('pilot', NOW, d);
    expect(feed.entries).toHaveLength(1);
    expect(feed.entries[0].kind === 'event' && feed.entries[0].isRead).toBe(true);
    expect(feed.counts).toEqual({ total: 1, unread: 0, attention: 0, critical: 0 });
  });

  it('a throwing contributor is skipped, not fatal', () => {
    const d = deps([]);
    d.contributors = [() => { throw new Error('boom'); }, () => derived];
    expect(buildFeed('pilot', NOW, d).entries).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/notifications/feed.test.ts`
Expected: FAIL — cannot resolve `./feed`.

- [ ] **Step 3: Write the implementation**

```ts
// src/notifications/contributors.ts
import type { FeedItem } from './types';
import { buildTechLogFeed } from './contributors/techLog';
import { buildAuditFeed } from './contributors/audits';
import { buildHazardFeed } from './contributors/hazards';
import { buildInventoryFeed } from './contributors/inventory';
import { buildTripReminderFeed } from './contributors/tripReminders';

export type FeedContributor = (userRole: string, nowUtc: string) => FeedItem[];

/** Static registry. Each contributor derives from its own module's persisted
 * store and owns its audience filtering — there is no central role→type map. */
export const CONTRIBUTORS: FeedContributor[] = [
  (r, t) => buildTechLogFeed(r, t),
  (r, t) => buildAuditFeed(r, t),
  (r, t) => buildHazardFeed(r, t),
  (r, t) => buildInventoryFeed(r, t),
  (r, t) => buildTripReminderFeed(r, t),
];
```

```ts
// src/notifications/feed.ts
import type { FeedCounts, FeedEntry, FeedSeverity } from './types';
import { CONTRIBUTORS, type FeedContributor } from './contributors';
import { eventStore, type EventStore } from './events';
import { dismissalStore, type DismissalStore } from './dismissals';
import { resolveUserId } from './identity';

const RANK: Record<FeedSeverity, number> = { critical: 0, warn: 1, info: 2 };

export interface Feed {
  entries: FeedEntry[];
  dismissed: FeedEntry[];
  counts: FeedCounts;
}

export interface FeedDeps {
  contributors: FeedContributor[];
  events: EventStore;
  dismissals: DismissalStore;
}

export function buildFeed(
  userRole: string,
  nowUtc: string,
  deps: FeedDeps = { contributors: CONTRIBUTORS, events: eventStore, dismissals: dismissalStore },
): Feed {
  const userId = resolveUserId(userRole);

  const derived = deps.contributors.flatMap(c => {
    try {
      return c(userRole, nowUtc);
    } catch {
      return [];
    }
  });

  const dismissedIds = new Set(deps.dismissals.listDismissed(userId));
  const visibleDerived: FeedEntry[] = derived.filter(d => !dismissedIds.has(d.id)).map(d => ({ ...d, kind: 'derived' as const }));
  const dismissed: FeedEntry[] = derived.filter(d => dismissedIds.has(d.id)).map(d => ({ ...d, kind: 'derived' as const }));

  const events: FeedEntry[] = deps.events
    .listFor(userRole)
    .map(e => ({ ...e, kind: 'event' as const, isRead: e.readBy.includes(userId) }));

  const entries = [...visibleDerived, ...events].sort(
    (a, b) => RANK[a.severity] - RANK[b.severity] || (b.atUtc ?? '').localeCompare(a.atUtc ?? ''),
  );

  const unread = events.filter(e => e.kind === 'event' && !e.isRead).length;
  const counts: FeedCounts = {
    total: entries.length,
    unread,
    attention: visibleDerived.length + unread,
    critical: entries.filter(e => e.severity === 'critical').length,
  };

  return { entries, dismissed, counts };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/notifications/feed.test.ts`
Expected: PASS (5 tests). Then run the whole new suite: `npx vitest run src/notifications` — all green.

- [ ] **Step 5: Commit**

```bash
git add src/notifications/contributors.ts src/notifications/feed.ts src/notifications/feed.test.ts
git commit -m "feat(notifications): contributor registry and aggregating feed builder

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: `useNotificationFeed` hook

**Files:**
- Create: `src/notifications/useNotificationFeed.ts`

**Interfaces:**
- Consumes: `buildFeed`, `eventStore`, `dismissalStore`, `resolveUserId`.
- Produces: `useNotificationFeed(userRole: string)` returning `{ entries, dismissed, counts, userId, refresh(), markRead(id), markUnread(id), markAllRead(), dismiss(id), restore(id) }`. No unit test (node env, no react renderer) — verified by `npm run type-check` here and by the UI tasks.

- [ ] **Step 1: Write the implementation**

```ts
// src/notifications/useNotificationFeed.ts
import { useEffect, useMemo, useState } from 'react';
import { buildFeed } from './feed';
import { eventStore } from './events';
import { dismissalStore } from './dismissals';
import { resolveUserId } from './identity';

/** Reactive wrapper around buildFeed. Recomputes when the event/dismissal
 * stores change, on cross-tab storage events, on window focus, every 30s
 * (module stores like tech-log write localStorage directly and emit nothing),
 * and on demand via refresh(). */
export function useNotificationFeed(userRole: string) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion(v => v + 1);
    const unsubs = [eventStore.subscribe(bump), dismissalStore.subscribe(bump)];
    window.addEventListener('storage', bump);
    window.addEventListener('focus', bump);
    const iv = window.setInterval(bump, 30000);
    return () => {
      unsubs.forEach(u => u());
      window.removeEventListener('storage', bump);
      window.removeEventListener('focus', bump);
      window.clearInterval(iv);
    };
  }, []);

  const userId = resolveUserId(userRole);
  const feed = useMemo(
    () => buildFeed(userRole, new Date().toISOString()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userRole, version],
  );

  return {
    ...feed,
    userId,
    refresh: () => setVersion(v => v + 1),
    markRead: (id: string) => eventStore.markRead(userId, id),
    markUnread: (id: string) => eventStore.markUnread(userId, id),
    markAllRead: () => eventStore.markAllRead(userId, userRole),
    dismiss: (id: string) => dismissalStore.dismiss(userId, id),
    restore: (id: string) => dismissalStore.restore(userId, id),
  };
}
```

- [ ] **Step 2: Verify types**

Run: `npm run type-check`
Expected: clean (same pre-existing errors as baseline, if any — compare against a `npm run type-check` run from before this task; no NEW errors).

- [ ] **Step 3: Commit**

```bash
git add src/notifications/useNotificationFeed.ts
git commit -m "feat(notifications): reactive useNotificationFeed hook

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: Rewrite `NotificationCenter`

**Files:**
- Modify: `src/components/NotificationCenter.tsx` (full replacement)

**Interfaces:**
- Consumes: `useNotificationFeed(userRole)` (Task 10), `FeedEntry`/`FeedSeverity` types.
- Produces: same external contract as before — default export `NotificationCenter({ userRole }: { userRole: string })`, mounted unchanged in `src/components/Navigation.tsx:421`. Badge shows `counts.attention`, pulses red when `counts.critical > 0`. Tabs: All / Unread / Critical. Derived rows get a dismiss (X) action; event rows get read/unread toggles. Footer toggle reveals dismissed items with Restore. No permission banner, no loading/error states, no refetch of stored data.

- [ ] **Step 1: Replace the component**

Replace the entire file content with:

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Shield,
  Wrench,
  Package,
  MapPin,
  FileText,
  RotateCcw,
  X,
} from 'lucide-react';
import { ClearSkiesSVG } from './ui/EmptyStateSVGs';
import { useNotificationFeed } from '../notifications/useNotificationFeed';
import type { FeedEntry, FeedSeverity } from '../notifications/types';

interface NotificationCenterProps {
  userRole: string;
}

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Tech Log': Wrench,
  'Audit Management': Shield,
  'Safety Systems': AlertTriangle,
  'Inventory': Package,
  'Trip Coordination': MapPin,
  'Waiver Approval': FileText,
};

const SEVERITY_TEXT: Record<FeedSeverity, string> = {
  critical: 'text-red-500',
  warn: 'text-amber-500',
  info: 'text-blue-500',
};

const SEVERITY_BORDER: Record<FeedSeverity, string> = {
  critical: 'border-l-4 border-l-red-500',
  warn: 'border-l-4 border-l-amber-400',
  info: '',
};

const SEVERITY_BADGE: Record<FeedSeverity, string> = {
  critical: 'bg-red-500 text-white',
  warn: 'bg-amber-500 text-white',
  info: 'bg-blue-500 text-white',
};

function timeAgo(atUtc?: string): string | null {
  if (!atUtc) return null;
  const diffMin = Math.floor((Date.now() - new Date(atUtc).getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

export default function NotificationCenter({ userRole }: NotificationCenterProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');
  const [showDismissed, setShowDismissed] = useState(false);

  const { entries, dismissed, counts, refresh, markRead, markUnread, markAllRead, dismiss, restore } =
    useNotificationFeed(userRole);

  const visible = entries.filter(e => {
    if (filter === 'unread') return e.kind === 'event' && !e.isRead;
    if (filter === 'critical') return e.severity === 'critical';
    return true;
  });

  const openEntry = (entry: FeedEntry) => {
    if (entry.kind === 'event' && !entry.isRead) markRead(entry.id);
    navigate(entry.link);
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) refresh();
  };

  const renderRow = (entry: FeedEntry, last: boolean, inDismissedView: boolean) => {
    const Icon = MODULE_ICONS[entry.module] ?? Bell;
    const unreadEvent = entry.kind === 'event' && !entry.isRead;
    const ago = timeAgo(entry.atUtc);
    return (
      <div key={entry.id} className="group">
        <div
          className={`p-4 hover:bg-accent/50 cursor-pointer transition-colors ${unreadEvent ? 'bg-blue-50/50' : ''} ${inDismissedView ? 'opacity-60' : SEVERITY_BORDER[entry.severity]}`}
          onClick={() => openEntry(entry)}
        >
          <div className="flex items-start gap-3">
            <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${SEVERITY_TEXT[entry.severity]}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-sm ${unreadEvent ? 'font-medium' : 'font-normal'}`}>{entry.title}</p>
                    {unreadEvent && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                  </div>
                  {entry.detail && <p className="text-sm text-muted-foreground mb-2">{entry.detail}</p>}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-xs ${SEVERITY_BADGE[entry.severity]}`}>{entry.severity}</Badge>
                    <Badge variant="outline" className="text-xs">{entry.module}</Badge>
                    {ago && <span className="text-xs text-muted-foreground">{ago}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {inDismissedView ? (
                    <Button
                      variant="ghost" size="sm" className="p-1 h-auto" title="Restore"
                      onClick={e => { e.stopPropagation(); restore(entry.id); }}
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  ) : entry.kind === 'derived' ? (
                    <Button
                      variant="ghost" size="sm" className="p-1 h-auto" title="Dismiss"
                      onClick={e => { e.stopPropagation(); dismiss(entry.id); }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  ) : entry.isRead ? (
                    <Button
                      variant="ghost" size="sm" className="p-1 h-auto" title="Mark as unread"
                      onClick={e => { e.stopPropagation(); markUnread(entry.id); }}
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost" size="sm" className="p-1 h-auto" title="Mark as read"
                      onClick={e => { e.stopPropagation(); markRead(entry.id); }}
                    >
                      <CheckCircle className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {!last && <Separator />}
      </div>
    );
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2 hover:bg-accent">
          <Bell className="w-5 h-5" />
          {counts.attention > 0 && (
            <Badge
              className={`absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs ${counts.critical > 0 ? 'bg-red-500 animate-pulse' : 'bg-primary'}`}
            >
              {counts.attention > 99 ? '99+' : counts.attention}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0" sideOffset={8}>
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </CardTitle>
              <div className="flex items-center gap-2">
                {counts.unread > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs" title="Mark all events as read">
                    Mark all read
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} title="Close notifications">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {counts.critical > 0 && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {counts.critical} critical item{counts.critical !== 1 ? 's' : ''} requiring attention
                  </span>
                </div>
              </div>
            )}

            <Tabs value={filter} onValueChange={value => setFilter(value as 'all' | 'unread' | 'critical')} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all" className="text-xs">All ({counts.total})</TabsTrigger>
                <TabsTrigger value="unread" className="text-xs">Unread ({counts.unread})</TabsTrigger>
                <TabsTrigger value="critical" className="text-xs">Critical ({counts.critical})</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {showDismissed ? (
                dismissed.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground">
                    <p className="text-sm">Nothing dismissed</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {dismissed.map((e, i) => renderRow(e, i === dismissed.length - 1, true))}
                  </div>
                )
              ) : visible.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground flex flex-col items-center justify-center h-full animate-fade-in">
                  <ClearSkiesSVG size={80} className="mb-4 opacity-70" />
                  <p className="font-medium text-foreground">No notifications to display</p>
                  <p className="text-xs mt-1">
                    {filter === 'unread' ? 'All caught up!' : filter === 'critical' ? 'No critical items' : 'Check back later for updates'}
                  </p>
                </div>
              ) : (
                <div className="space-y-0">
                  {visible.map((e, i) => renderRow(e, i === visible.length - 1, false))}
                </div>
              )}
            </ScrollArea>
            <div className="border-t px-4 py-2">
              <button
                className="text-xs text-muted-foreground underline hover:text-foreground"
                onClick={() => setShowDismissed(v => !v)}
              >
                {showDismissed ? '← Back to feed' : `Dismissed (${dismissed.length})`}
              </button>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Verify types and existing suite**

Run: `npm run type-check && npx vitest run`
Expected: no new type errors; suite green. (`Navigation.tsx` needs no change — props are identical.)

- [ ] **Step 3: Commit**

```bash
git add src/components/NotificationCenter.tsx
git commit -m "feat(notifications): bell consumes the derived feed (severity taxonomy, dismissed view)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 12: Migrate safety producers (SafetyDashboard, FRAT, GRAT)

**Files:**
- Modify: `src/components/SafetyDashboard.tsx` (call site ~line 219)
- Modify: `src/components/StandaloneFRATForm.tsx` (call site ~line 233)
- Modify: `src/components/StandaloneGRATForm.tsx` (call site ~line 236)

**Interfaces:**
- Consumes: `eventStore.publish` (Task 2). Import path from `src/components/`: `import { eventStore } from '../notifications/events';`

- [ ] **Step 1: SafetyDashboard**

Remove the `useNotificationContext` import and the `const { addNotification } = useNotificationContext();` line. Add the `eventStore` import. Replace the `addNotification({...})` block inside `handleNewsletterUpload` with:

```ts
      eventStore.publish({
        id: `newsletter:${title}`,
        severity: 'info',
        title: 'New Safety Newsletter Published',
        detail: `${title} is now available for review.`,
        module: 'Safety Systems',
        link: '/safety',
        audienceRoles: ['pilot', 'safety', 'admin', 'lead'],
      });
```

- [ ] **Step 2: StandaloneFRATForm**

Same import swap. Replace the `addNotification({...})` block in the `Requires Review` branch with:

```ts
        eventStore.publish({
          id: `frat-review:${flightNumber}`,
          severity: 'warn',
          title: 'Submitted FRAT needs approval',
          detail: `Flight ${flightNumber} has a FRAT score of ${totalScore}. Approval required from Scheduling Manager and Chief Pilot or Assistant Chief Pilot.`,
          module: 'Safety Systems',
          link: '/frat/review',
          audienceRoles: ['scheduling', 'safety', 'admin', 'lead'],
        });
```

- [ ] **Step 3: StandaloneGRATForm**

Same import swap. The submission id is currently computed twice (`GRAT_${Date.now()}` at the notification and again for `submission.id`); hoist it once above the status branch:

```ts
    const submissionId = `GRAT_${Date.now()}`;
```

Use `id: submissionId` in the `submission` object, and replace the `addNotification({...})` block with:

```ts
        eventStore.publish({
          id: `grat-review:${submissionId}`,
          severity: 'warn',
          title: 'Submitted GRAT needs approval',
          detail: `Task by ${technicianName} has a GRAT score of ${totalScore}. Approval required from Scheduling Manager and Director of Maintenance or Chief Inspector.`,
          module: 'Safety Systems',
          link: '/grat/review',
          audienceRoles: ['maintenance', 'safety', 'admin', 'lead'],
        });
```

(GRAT gains `maintenance` in the audience — the approvers named in the message are maintenance leadership; the old role→type map wrongly hid `safety`-type notifications from them.)

- [ ] **Step 4: Verify**

Run: `npm run type-check && npx vitest run`
Expected: green. `grep -n "useNotificationContext\|useNotifications" src/components/SafetyDashboard.tsx src/components/StandaloneFRATForm.tsx src/components/StandaloneGRATForm.tsx` returns nothing.

- [ ] **Step 5: Commit**

```bash
git add src/components/SafetyDashboard.tsx src/components/StandaloneFRATForm.tsx src/components/StandaloneGRATForm.tsx
git commit -m "refactor(notifications): safety producers publish events instead of mailbox rows

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 13: Migrate context producers (AuditContext, HazardContext)

**Files:**
- Modify: `src/contexts/AuditContext.tsx`
- Modify: `src/contexts/HazardContext.tsx`

**Interfaces:**
- Consumes: `eventStore.publish`. Import path from `src/contexts/`: `import { eventStore } from '../notifications/events';`
- The derived side of both modules is already live via Tasks 4–5; here we delete the edge-triggered effects that duplicated it.

- [ ] **Step 1: AuditContext — delete the expiry effect**

Delete: the `useNotificationContext` import, the `const { addNotification } = useNotificationContext();` line, the whole `checkExpiryNotifications` callback (including its `audit_expiry_checked` localStorage throttle), and the `useEffect` that calls it. Nothing replaces them — `buildAuditFeed` (Task 4) now derives this state.

- [ ] **Step 2: HazardContext — delete the review effect, keep the report event**

Delete: the `checkEffectivenessReviews` callback (including the `hazard_effectiveness_checked` throttle) and its `useEffect` — `buildHazardFeed` (Task 5) derives it. Remove the `useNotificationContext` import and `addNotification` destructure. In `submitHazard`, replace the `addNotification({...})` block with:

```ts
        eventStore.publish({
            id: `hazard:${newId}`,
            severity: newHazard.severity.toLowerCase() === 'critical' ? 'critical' : 'warn',
            title: `New hazard reported: ${newHazard.severity} severity`,
            detail: `${newHazard.title} (${newHazard.location})`,
            module: 'Safety Systems',
            link: '/safety/hazards',
            audienceRoles: ['safety', 'admin', 'lead'],
        });
```

- [ ] **Step 3: Verify**

Run: `npm run type-check && npx vitest run`
Expected: green. `grep -rn "audit_expiry_checked\|hazard_effectiveness_checked" src/` returns nothing.

- [ ] **Step 4: Commit**

```bash
git add src/contexts/AuditContext.tsx src/contexts/HazardContext.tsx
git commit -m "refactor(notifications): audit/hazard due-state is derived; hazard reports are events

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 14: Migrate UnifiedTasks + TripCoordination

**Files:**
- Modify: `src/components/UnifiedTasksActionItems.tsx` (~lines 91, 536–562, 1783–1794)
- Modify: `src/components/TripCoordination.tsx` (~lines 50, 171, 588–611)

- [ ] **Step 1: UnifiedTasksActionItems — pending waivers**

Swap the `useNotificationContext` import (line 45) for `import { eventStore } from '../notifications/events';` and delete the `addNotification` destructure (line 91). Replace the entire pending-waiver `useEffect` (the block using `sessionStorage`) with — `publish` is idempotent by id, so the sessionStorage throttle goes:

```ts
  // Surface pending waiver decisions as events (publish is idempotent by id)
  useEffect(() => {
    userActionItems
      .filter(item => item.module === 'Waiver Approval' && item.status === 'Pending')
      .forEach(waiver => {
        eventStore.publish({
          id: `waiver-pending:${waiver.id}`,
          severity: 'warn',
          title: `Waiver pending your decision: ${waiver.title.replace('Waiver Final Approval: ', '').replace('Waiver Approval: ', '')}`,
          detail: waiver.description,
          module: 'Waiver Approval',
          link: '/tasks-action-items',
          audienceRoles: ['lead', 'admin'],
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

- [ ] **Step 2: UnifiedTasksActionItems — waiver decision**

Replace the decision `addNotification({...})` block with:

```ts
                    eventStore.publish({
                      id: `waiver-decision:${decidingWaiverItem.id}`,
                      severity: waiverDecision === 'denied' ? 'warn' : 'info',
                      title: `Waiver ${decisionLabel.toLowerCase()}: ${decidingWaiverItem.title}`,
                      detail: `The waiver request has been ${decisionLabel.toLowerCase()} by the ${userRole === 'lead' ? 'Chief Pilot' : 'VP'}.${waiverDecisionComment ? ` Comment: ${waiverDecisionComment}` : ''}`,
                      module: 'Waiver Approval',
                      link: '/tasks-action-items',
                      audienceRoles: ['safety', 'admin'],
                    });
```

- [ ] **Step 3: TripCoordination — persist reminders instead of mailing them**

Remove the `useNotifications` import (line 50) and the `const { addNotification } = useNotifications({ userRole: 'scheduling' });` line (171). Add `import { addTripReminder } from '../notifications/tripReminderStore';`. In `createReminder`, replace the `reminder` object construction and `addNotification(reminder);` with:

```ts
    addTripReminder({
      id: `TR_${Date.now()}`,
      title: newReminder.title,
      detail: newReminder.message || `Reminder for ${selectedTrip.tripNumber}: ${newReminder.title}`,
      dueAtUtc: new Date(reminderDateTime).toISOString(),
      tripId: selectedTrip.id,
    });
```

(The reminder now surfaces in the bell via `buildTripReminderFeed` once due, instead of appearing immediately as a fake "notification" dated in the future.)

- [ ] **Step 4: Verify**

Run: `npm run type-check && npx vitest run`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/components/UnifiedTasksActionItems.tsx src/components/TripCoordination.tsx
git commit -m "refactor(notifications): waiver events + persisted due-derived trip reminders

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 15: Migrate InventoryV2 (provider, App wrapper, AlertBell, AlertsPage)

**Files:**
- Modify: `src/components/inventory-v2/InventoryV2Context.tsx`
- Modify: `src/App.tsx` (~lines 149–157)
- Modify: `src/components/inventory-v2/shared/AlertBell.tsx` (full replacement below)
- Modify: `src/components/inventory-v2/pages/AlertsPage.tsx` (full replacement below)

- [ ] **Step 1: InventoryV2Context — strip the prop and the derived-state effects**

- Remove `import type { Notification } from '../contexts/NotificationContext';`
- Remove `addNotification` from `InventoryV2ProviderProps` and the provider's destructured props; delete `addNotifRef` and its assignment lines.
- Delete the **entire** stockroom-threshold `useEffect` (the one diffing `prevStockroomItemsRef`) — `buildInventoryFeed` derives levels now.
- In the transition `useEffect` (diffing `prevStateRef`): delete the inspection loop and the grocery-list loop (both derived now). Keep only the trip-completed loop, replacing its `addNotif({...})` with (add `import { eventStore } from '../../notifications/events';`):

```ts
    for (const trip of state.trips) {
      const prevTrip = prev.trips.find(t => t.id === trip.id);
      if (trip.status === 'completed' && prevTrip?.status !== 'completed') {
        eventStore.publish({
          id: `inv-trip-completed:${trip.id}`,
          severity: 'info',
          title: `Trip complete — ${trip.tailNumber} ready for inspection`,
          detail: `${trip.tripName ?? trip.tailNumber} has been completed. Post-trip inspection recommended.`,
          module: 'Inventory',
          link: '/inventory-v2/inspection',
          audienceRoles: ['inflight', 'fa', 'lead-fa', 'commissary-manager', 'admin', 'lead'],
        });
      }
    }
```

Also trim the effect's dependency array to `[state.trips]` and remove the now-unused `addNotifRef` guard lines at the top of the effect.

- [ ] **Step 2: App.tsx — simplify the wrapper**

`InventoryRouteWrapper` no longer needs the notification context:

```tsx
function InventoryRouteWrapper({ children, userRole }: { children: React.ReactNode; userRole: string }) {
  return (
    <InventoryV2Provider userRole={userRole}>
      {children}
    </InventoryV2Provider>
  );
}
```

(Leave the `NotificationProvider` wrapper and its import in place — they die in Task 16.)

- [ ] **Step 3: AlertBell — count from the feed**

Replace the file content with:

```tsx
import React from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInventoryV2 } from '../InventoryV2Context';
import { useNotificationFeed } from '../../../notifications/useNotificationFeed';

export function AlertBell() {
  const { state } = useInventoryV2();
  const { entries } = useNotificationFeed(state.currentUser.role);
  const navigate = useNavigate();

  if (state.currentUser.role !== 'commissary-manager') return null;

  const count = entries.filter(
    e => e.module === 'Inventory' && (e.kind === 'derived' || !e.isRead),
  ).length;

  return (
    <button
      onClick={() => navigate('/inventory-v2/alerts')}
      className="relative p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
      aria-label={`${count} active alerts`}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 4: AlertsPage — render feed entries**

Replace the file content with:

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import { Button } from '../../ui/button';
import { useInventoryV2 } from '../InventoryV2Context';
import { useNotificationFeed } from '../../../notifications/useNotificationFeed';
import type { FeedEntry, FeedSeverity } from '../../../notifications/types';

function SeverityBadge({ severity }: { severity: FeedSeverity }) {
  if (severity === 'critical') {
    return <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-red-500/15 text-red-600">Critical</span>;
  }
  if (severity === 'warn') {
    return <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-600">Warning</span>;
  }
  return <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground">Info</span>;
}

function AlertTable({
  entries,
  onClear,
}: {
  entries: FeedEntry[];
  onClear: (entry: FeedEntry) => void;
}) {
  const navigate = useNavigate();

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <Bell className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">No alerts to show</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="pb-2 font-medium">Title</th>
            <th className="pb-2 font-medium">Detail</th>
            <th className="pb-2 font-medium">Severity</th>
            <th className="pb-2 font-medium">When</th>
            <th className="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {entries.map(e => (
            <tr key={e.id}>
              <td className="py-2.5 font-medium">{e.title}</td>
              <td className="py-2.5 text-muted-foreground max-w-xs">{e.detail}</td>
              <td className="py-2.5"><SeverityBadge severity={e.severity} /></td>
              <td className="py-2.5 text-xs text-muted-foreground">
                {e.atUtc ? formatDistanceToNow(new Date(e.atUtc), { addSuffix: true }) : 'live'}
              </td>
              <td className="py-2.5">
                <div className="flex gap-2">
                  <Button size="sm" className="h-6 px-2 text-[11px]" onClick={() => navigate(e.link)}>
                    View →
                  </Button>
                  <button
                    className="text-[11px] text-muted-foreground underline hover:text-foreground"
                    onClick={() => onClear(e)}
                  >
                    {e.kind === 'derived' ? 'dismiss' : 'mark read'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AlertsPage() {
  const { state } = useInventoryV2();
  const { entries, markRead, dismiss } = useNotificationFeed(state.currentUser.role);

  const inventory = entries.filter(e => e.module === 'Inventory');
  const active = inventory.filter(e => e.kind === 'derived' || !e.isRead);
  const history = inventory.filter(e => e.kind === 'event' && e.isRead);

  const clear = (entry: FeedEntry) => {
    if (entry.kind === 'derived') dismiss(entry.id);
    else markRead(entry.id);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">My Alerts</h1>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Active
            {active.length > 0 && (
              <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {active.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">
          <AlertTable entries={active} onClear={clear} />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <AlertTable entries={history} onClear={clear} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Run: `npm run type-check && npx vitest run`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/components/inventory-v2 src/App.tsx
git commit -m "refactor(notifications): inventory alerts consume the derived feed

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 16: Delete the legacy mailbox

**Files:**
- Delete: `src/components/contexts/NotificationContext.tsx`
- Delete: `src/components/hooks/useNotifications.ts`
- Delete: `src/components/NotificationDrawer.tsx`
- Modify: `src/App.tsx` (remove provider), `src/components/HazardWorkflow.tsx` (remove dead import line 54)

- [ ] **Step 1: Confirm nothing still imports the legacy modules**

Run: `grep -rn "NotificationContext\|hooks/useNotifications\|NotificationDrawer" src --include="*.ts" --include="*.tsx" | grep -v "src/notifications/"`
Expected: hits only in `src/App.tsx` (import + `<NotificationProvider>` wrapper), `src/components/HazardWorkflow.tsx` (unused import), and the three files being deleted. Any other hit means a consumer was missed — migrate it (feed hook for reads, `eventStore.publish` for writes) before proceeding.

- [ ] **Step 2: App.tsx**

Remove `import { NotificationProvider, useNotificationContext } from './components/contexts/NotificationContext';` and unwrap `<NotificationProvider>…</NotificationProvider>` (keep its children in place).

- [ ] **Step 3: HazardWorkflow.tsx**

Delete line 54 (`import { useNotificationContext } from './contexts/NotificationContext';`) — it was never used.

- [ ] **Step 4: Delete the files**

```bash
git rm src/components/contexts/NotificationContext.tsx src/components/hooks/useNotifications.ts src/components/NotificationDrawer.tsx
```

Note: `src/main.tsx` still registers `/sw.js` for the PWA shell — that registration stays; only the duplicate registration inside the deleted NotificationContext dies with it. The `'ams_notifications'` localStorage key simply becomes unread residue in existing browsers; no cleanup code needed in a demo.

- [ ] **Step 5: Verify**

Run: `npm run type-check && npx vitest run && npm run build`
Expected: all green, build succeeds, and:
`grep -rn "ams_notifications\|SEED_NOTIFICATIONS\|useNotificationContext" src` → no hits.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(notifications)!: delete the stored-mailbox notification system

The bell, inventory alerts, and all producers now run on the derived
feed + event stream. Seed data, the role→type map, duplicate counts,
the orphaned drawer, and the context SW registration are gone.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 17: Final verification + docs

- [ ] **Step 1: Full gates**

Run: `npx vitest run && npm run type-check && npm run build`
Expected: suite green (baseline 320 + ~31 new), no new type errors, build succeeds.

- [ ] **Step 2: Manual smoke via dev server**

Start the dev server (`.claude/launch.json` / preview tooling) and verify, as at least two personas:
1. **maintenance**: bell badge > 0; tech-log items (new squawk / grounded / placard-pending) present with `Tech Log` module badges; clicking one navigates into the tech-log route.
2. **safety**: audit-expiry items appear (derived from the seeded audits); submit a hazard from the hazard form → a `New hazard reported` event appears; mark it read → unread count drops; re-submitting the same hazard id does not duplicate.
3. Dismiss a derived item → it moves to the Dismissed view; reload the page → it stays dismissed and does **not** resurrect; the feed shows no seeded fake entries anywhere.
4. **commissary-manager** in inventory: AlertsPage Active tab lists below-par/below-min items; restock one via the UI → the alert self-clears.

- [ ] **Step 3: Update the design doc status line**

In `docs/notifications/2026-07-04-global-notifications-design.md`, change `**Status:** Approved design, pre-implementation` to `**Status:** Implemented on feat/global-notifications`.

- [ ] **Step 4: Commit**

```bash
git add docs/notifications
git commit -m "docs(notifications): mark design implemented

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
