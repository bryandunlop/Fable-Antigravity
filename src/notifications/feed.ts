import type { FeedCounts, FeedEntry, FeedItem, FeedSeverity } from './types';
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
  roles: string[] = [userRole],
): Feed {
  // Identity (dismissals + read-state) is anchored on the one person via their
  // primary role; the role SET only widens which contributors and event
  // audiences are in scope, so a multi-role user sees the union of their lenses.
  const userId = resolveUserId(userRole);
  const roleSet = [...new Set(roles)];

  // Derived items unioned across every role the user holds, deduped by stable id
  // (a derived id is a function of the underlying condition, not the asking role).
  const derived: FeedItem[] = [];
  const seenDerived = new Set<string>();
  for (const role of roleSet) {
    for (const c of deps.contributors) {
      let items: FeedItem[];
      try {
        items = c(role, nowUtc);
      } catch {
        items = [];
      }
      for (const item of items) {
        if (seenDerived.has(item.id)) continue;
        seenDerived.add(item.id);
        derived.push(item);
      }
    }
  }

  const dismissedIds = new Set(deps.dismissals.listDismissed(userId));
  const visibleDerived: FeedEntry[] = derived.filter(d => !dismissedIds.has(d.id)).map(d => ({ ...d, kind: 'derived' as const }));
  const dismissed: FeedEntry[] = derived.filter(d => dismissedIds.has(d.id)).map(d => ({ ...d, kind: 'derived' as const }));

  // Events audience-matched to any of the user's roles, deduped by id.
  const events: FeedEntry[] = [];
  const seenEvents = new Set<string>();
  for (const role of roleSet) {
    for (const e of deps.events.listFor(role)) {
      if (seenEvents.has(e.id)) continue;
      seenEvents.add(e.id);
      events.push({ ...e, kind: 'event' as const, isRead: e.readBy.includes(userId) });
    }
  }

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
