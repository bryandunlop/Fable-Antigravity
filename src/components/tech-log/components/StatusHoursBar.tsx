import type { WorkCardStatusTag } from '../types';
import { STATUS_TAG_LABELS, STATUS_TAG_ORDER } from '../engine/statusTags';

/**
 * The one-line picture of where an aircraft's downtime went. Lifted verbatim in behaviour from
 * `fir/pages/FirDetail.tsx`, which built it first — it is now shared by the work card, the FIR
 * draft, the published FIR revision and the fleet metrics page, so those four cannot drift.
 *
 * Deliberately NOT the RAG palette: these are effort/wait states, not serviceability.
 *
 * Segments are passed in already labelled rather than looked up from `STATUS_TAG_LABELS` at render.
 * That matters for D63: a **published** FIR renders a frozen snapshot, and a snapshot whose labels
 * were resolved live would silently repaint itself the day the state vocabulary changes.
 */
export interface BarSegment {
  key: string;
  label: string;
  hours: number;
}

/** Tailwind classes per known state key, with a fallback for a key this build no longer knows. */
const SEGMENT_CLASS: Record<string, string> = {
  DIAGNOSING: 'bg-gfo-midnight/70 dark:bg-gfo-daylight/70',
  IN_WORK: 'bg-gfo-midnight dark:bg-gfo-daylight',
  WAITING_PARTS: 'bg-slate-500 dark:bg-slate-400',
  WAITING_TECH_REP: 'bg-slate-400 dark:bg-slate-500',
  WAITING_CONTRACT_MX: 'bg-slate-400/70 dark:bg-slate-500/70',
  WAITING_INSPECTION: 'bg-slate-300 dark:bg-slate-600',
  WAITING_OTHER: 'bg-slate-200 dark:bg-slate-700',
  GAP: 'bg-amber-300 dark:bg-amber-700',
  UNTAGGED: 'bg-muted',
};

export const segmentClass = (key: string) => SEGMENT_CLASS[key] ?? 'bg-muted';

/** Build bar segments from a per-state hours record, in the shared presentation order. */
export function segmentsFromStateHours(
  hours: Record<WorkCardStatusTag, number>,
  untaggedHours?: number,
): BarSegment[] {
  const segs: BarSegment[] = STATUS_TAG_ORDER.map(k => ({ key: k, label: STATUS_TAG_LABELS[k], hours: hours[k] ?? 0 }));
  if (untaggedHours != null) segs.push({ key: 'UNTAGGED', label: 'Unattributed', hours: untaggedHours });
  return segs;
}

export function StatusHoursBar({ segments, className }: { segments: BarSegment[]; className?: string }) {
  const shown = segments.filter(s => s.hours > 0);
  const total = shown.reduce((a, b) => a + b.hours, 0);
  if (total <= 0) return null;
  return (
    <div
      className={`flex h-3 w-full overflow-hidden rounded-full border border-border ${className ?? ''}`}
      role="img"
      aria-label={shown.map(s => `${s.label} ${Math.round(s.hours * 10) / 10} h`).join(', ')}
    >
      {shown.map(s => (
        <div
          key={s.key}
          className={segmentClass(s.key)}
          style={{ width: `${(s.hours / total) * 100}%` }}
          title={`${s.label} — ${Math.round(s.hours * 10) / 10} h`}
        />
      ))}
    </div>
  );
}
