# Global Notification Feed — Design

**Date:** 2026-07-04
**Branch:** `feat/global-notifications` (off `main`)
**Status:** Approved design, pre-implementation
**Production doc:** `~/Obsidian/myGFO/02-Platform/Features/Notification_System_Redesign.md`

## Problem

The app has two notification systems that do not talk to each other:

1. **Global bell** (`src/components/contexts/NotificationContext.tsx`, `NotificationCenter.tsx`, `useNotifications.ts`) — *stored* notifications persisted to localStorage, seeded with hardcoded demo data, fed by imperative `addNotification()` calls from 8 producers. Role visibility is a hardcoded role→type map duplicated away from the modules that own the semantics.
2. **Tech-log engine** (`src/components/tech-log/engine/notifications.ts`) — fully *derived* from ledger state on every render; stores only dismissal keys. This is the architecturally correct pattern (a stored notification can disagree with derived state; a derived one cannot).

Consequences of the split:

- The highest-stakes alerts in the app (AOG, grounded aircraft, deferral overdue) never reach the global bell; the bell's "AOG Squawk" is a fake seed.
- State announcements ("audit expiring", "stock below threshold", "mitigation due") are **edge-triggered from effects**, so they can duplicate across sessions and never self-clear when the condition resolves.
- `clearAll` does not survive reload — an empty list re-seeds demo data, resurrecting dismissed notifications.
- Counts are computed twice (context-wide vs role-filtered), so badges can disagree.
- `NotificationDrawer.tsx` is orphaned dead code.
- The notification context registers a service worker, contradicting the production constraint (no SW in the Capacitor build).

## Goals

1. One notification architecture, converged on the derived model — the demo becomes the reference implementation for production myGFO.
2. Fix the visible warts (above) as a side effect, not as patches.
3. Feed the production design doc (path above).

## Design

### 1. One shape, one taxonomy

New `src/notifications/types.ts`:

```ts
export type FeedSeverity = 'critical' | 'warn' | 'info';

export interface FeedItem {
  id: string;          // stable derivation key (dismissal identity)
  severity: FeedSeverity;
  title: string;
  detail?: string;
  module: string;      // display grouping, e.g. 'Tech Log', 'Inventory'
  link: string;        // route to open
  atUtc?: string;
}
```

This is the tech-log engine's shape promoted app-wide. Retired: the global system's `low/medium/high/critical` priority scale and its 12-value `type` union. `module` replaces `type` for grouping; audience filtering moves into contributors, so no central type map exists anywhere.

### 2. Contributors: one hook per module

Each module exports a contributor hook — `useTechLogFeed(user)`, `useInventoryFeed(user)`, … — that:

- reads **that module's own persisted store** (not a route-scoped React context), subscribing via `useSyncExternalStore` on the module's localStorage key, so the feed is live even when the module's screens are unmounted;
- derives its `FeedItem[]` fresh on every read — nothing state-based is ever stored, and conditions self-clear when no longer true (level-triggered, not edge-triggered);
- performs its **own role filtering** internally, exactly as `buildNotifications` already does with its maintenance/pilot lenses.

The tech-log contributor is a thin wrapper over the existing engine. A static list in `src/notifications/contributors.ts` composes all contributor hooks.

Rationale: state-based items exist in the feed exactly while they are true, so the feed can never disagree with derived state. This also mirrors production reality: the feed derives from synced local state, not from whichever screen is mounted, and therefore works offline for free.

### 3. Minimal stored event stream

For things that *happened* rather than *are*: `src/notifications/events.ts` exposes `publishEvent()` appending to a localStorage-backed event store.

- Events carry `audienceRoles: Role[]` (a stored row can't run a lens function).
- Events are the **only** stored notifications and the only items with read/unread state.
- Derived items never have read state — they support per-user **dismissal keys** (tech-log style). A dismissed-but-still-true condition stays discoverable in a "dismissed" view; it does not resurrect as unread.

**Classification rule for every producer:** announces current state → derive it; announces an occurrence → publish an event.

### 4. Aggregator and the bell

`useNotificationFeed(user)` in `src/notifications/`:

- merges all contributor outputs + unread events;
- subtracts the current user's dismissal keys;
- sorts by severity rank (`critical` → `warn` → `info`), then recency;
- computes counts **once** (total / unread events / critical).

Dismissal keys live in a central `src/notifications/dismissals.ts` localStorage store keyed by user oid. Tech-log's own dismissal keys stay internal to its engine (already applied before its wrapper returns items) — the two sets never merge.

`NotificationCenter` becomes a pure consumer of this hook — ending the context-vs-hook count disagreement. Visual language stays GFO-conformant: white-first, quiet severity accents, severity styling distinct from the custody gold/blue axis.

### 5. Producer migration (verified against call sites)

| Producer | Fires today | Becomes |
|---|---|---|
| `SafetyDashboard` | "New Safety Newsletter Published" | event |
| `StandaloneFRATForm` / `StandaloneGRATForm` | "Submitted FRAT/GRAT Needs Approval" | event — submissions aren't persisted as queryable state; if a pending-approvals store lands later, reclassify to derived |
| `HazardContext` | "New Hazard: {severity}" | event |
| `HazardContext` | mitigation/review due ≤7d or overdue | derived contributor over hazard store |
| `AuditContext` | "Audit Expired" / "Expiring Soon" (≤30d) | derived contributor over audit store |
| `UnifiedTasksActionItems` | "Waiver Pending Your Decision" and "Waiver Approved/Rejected" | events |
| `TripCoordination` | user-created reminder (fired straight into the mailbox, reminder itself not persisted) | persist reminders in the trip store; derive "reminder due" — the one migration that adds a small store |
| `InventoryV2Context` | qty-decrease past threshold (edge-triggered, via injected `addNotification` prop) | derived contributor over inventory store — "below threshold" as level state; prop injection removed |

Tech-log needs no producer work — its engine already derives; it gains only the wrapper hook.

### 6. Deletions and wart fixes

- Delete `SEED_NOTIFICATIONS` and the reseed-on-empty logic; real AOG/grounded items flow from the tech-log contributor.
- Delete orphaned `NotificationDrawer.tsx`.
- Remove service-worker registration from notification code (browser push is a production Phase 2 transport question, not demo furniture).
- Delete `NotificationContext.tsx` + `useNotifications.ts` once all consumers are migrated; remove the `addNotification` prop threading into `InventoryV2Provider`.
- `EmailNotificationSystem.tsx` (mock) untouched — referenced by the production doc as the Phase 2+ digest channel.

### 7. Testing

Contributors are pure over their store state; tests mirror the existing `engine/notifications.test.ts` pattern:

- aggregation ordering (severity rank, then recency);
- dismissal filtering (dismissed derived item excluded; reappears only in the dismissed view; never resurrects as unread);
- self-clearing: a derived item disappears from the feed when its condition resolves (e.g. stock restocked, audit renewed);
- event read/unread transitions and `audienceRoles` filtering;
- regression: an emptied feed stays empty after reload (no reseed);
- counts computed once and consistent with the rendered list.

### Out of scope

- Real push transport (Web Push/APNs), email sending — production Phase 2 concerns, documented in the vault doc only.
- Migrating `EmailNotificationSystem` mock.
- Any tech-log engine changes.

## Production alignment (summary — full doc in vault)

- Notifications are a **projection** over synced state, computed per-role lens on the client — fresh-on-sync in Phase 1, exactly the D14 serviceability model.
- Only stored artifacts: per-user dismissal keys + true events, in **updatable non-ledger tables**, payloads free of PII/free-text bodies (NEVER-rule alignment).
- Offline iPad: feed computes locally from synced SQLite state; nothing to deliver, nothing to miss; only dismissal keys sync.
- Phase 2 push is a **nudge transport** (Service Bus fan-out → Web Push for desktop PWA, APNs via Capacitor) telling clients to resync/recompute — never the source of truth.
- Email digest builds on the same feed derivation server-side.
