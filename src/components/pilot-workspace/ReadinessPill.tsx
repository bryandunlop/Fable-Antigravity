import type { PilotReadiness } from './selectors';

/**
 * One readiness verdict, inline in the trip header row (D84).
 *
 * This was a full-width band of its own (`ReadinessBar`) sitting between the trip header and the
 * work — ~48pt spent on one word and one clause, on a screen whose real problem was that the
 * reporting footer and the Messages panel fell below the fold. The verdict belongs beside the
 * identity it describes, not stacked above it.
 *
 * Colour is unchanged and deliberate: READY green, BLOCKED red (an airworthiness stop). NOT_READY
 * is routine prep-in-progress and stays NEUTRAL, so amber keeps meaning a genuinely AMBER
 * (deferral-carrying) aircraft rather than "you have a to-do".
 */
const TONE: Record<PilotReadiness['state'], string> = {
  READY: 'bg-emerald-100 text-emerald-800',
  NOT_READY: 'bg-muted text-foreground',
  BLOCKED: 'bg-red-100 text-red-800',
};

export default function ReadinessPill({ readiness }: { readiness: PilotReadiness }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm ${TONE[readiness.state]}`}>
      <span className="font-semibold">{readiness.state.replace('_', ' ')}</span>
      {readiness.blocker && <span className="font-normal">· {readiness.blocker}</span>}
    </span>
  );
}
