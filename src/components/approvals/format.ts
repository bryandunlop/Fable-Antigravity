// Shared time formatting for the approval surfaces (inbox + waiver console).
// `now` is injectable so both functions stay pure and testable.

/** Relative age of an ISO instant, e.g. "just now", "12m ago", "3h ago", "2d ago". */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return 'recently';
  const mins = Math.round((now - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

/** A duration as a compact span, e.g. "45m", "15h", "1.5d". Used for the
 *  console's average-time-to-clear tile. */
export function formatDuration(ms: number): string {
  if (!isFinite(ms) || ms < 0) return '—';
  if (ms < 60_000) return '<1m';
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${(ms / 86_400_000).toFixed(1)}d`;
}
