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
