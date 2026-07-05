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
