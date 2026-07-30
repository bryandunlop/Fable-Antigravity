import type { StatusTagEvent, WorkCard, WorkCardStatusTag, WorkCardTimeAuditEvent, WorkGapReason } from '../types';

const round1 = (n: number) => Math.round(n * 10) / 10;

export type AppendTagResult = { ok: true; card: WorkCard } | { ok: false; error: string };

/** Display vocabulary for the work/wait states. Lives here (not on a page) because the timeline
 * editor, the downtime debrief, the metrics rollup and the FIR bar all name the same states. */
export const STATUS_TAG_LABELS: Record<WorkCardStatusTag, string> = {
  IN_WORK: 'In work',
  DIAGNOSING: 'Diagnosing (on aircraft)',
  WAITING_PARTS: 'Waiting on parts (POO)',
  WAITING_INSPECTION: 'Waiting on inspection',
  WAITING_TECH_REP: 'Waiting on tech rep',
  WAITING_CONTRACT_MX: 'Waiting on contract maintenance',
  WAITING_OTHER: 'Waiting — other',
  GAP: 'Nobody working (gap)',
};

/** Presentation order — roughly work → wait → away. Stacked bars and pickers follow it. */
export const STATUS_TAG_ORDER: WorkCardStatusTag[] = [
  'DIAGNOSING', 'IN_WORK', 'WAITING_PARTS', 'WAITING_TECH_REP',
  'WAITING_CONTRACT_MX', 'WAITING_INSPECTION', 'WAITING_OTHER', 'GAP',
];

export const GAP_REASON_LABELS: Record<WorkGapReason, string> = {
  END_OF_SHIFT: 'Went home for the night',
  WEEKEND_HOLIDAY: 'Weekend / holiday',
  CONTRACT_MX_AWAY: 'Contract maintenance left, no replacement',
  AWAITING_SLOT: 'Awaiting a hangar / shop slot',
  OTHER: 'Other',
};

const zeroHours = (): Record<WorkCardStatusTag, number> => ({
  IN_WORK: 0, DIAGNOSING: 0, WAITING_PARTS: 0, WAITING_INSPECTION: 0,
  WAITING_TECH_REP: 0, WAITING_CONTRACT_MX: 0, WAITING_OTHER: 0, GAP: 0,
});

/** States whose `note` is not optional — a wait nobody described is an un-answerable hole later. */
const NOTE_REQUIRED: WorkCardStatusTag[] = ['WAITING_PARTS', 'WAITING_OTHER'];

/** The state the card is in **now**: the chronologically last span, not the last array element.
 * Those two diverge the moment somebody retrospectively inserts a span — D61's primary path — and
 * `statusDurations().openTag` has always reported the chronological one. While they disagreed, the
 * duplicate guard in `appendStatusTag` and `WorkCardDetail`'s chip disabled-states both acted on
 * the wrong "current" state. */
export function currentTag(card: WorkCard): WorkCardStatusTag | undefined {
  const tags = card.statusTags;
  if (!tags || tags.length === 0) return undefined;
  const seq = sorted(tags);
  return seq[seq.length - 1].tag;
}

/** Chronological copy. `statusDurations` walks this rather than the raw array so a legacy or
 * hand-edited out-of-order history reports honest numbers, instead of the pre-D61 failure mode
 * where an out-of-order insert silently contributed 0 h and corrupted its neighbour's span.
 * Writes are sorted at the door too, so persisted histories converge on order. */
function sorted(tags: StatusTagEvent[]): StatusTagEvent[] {
  return [...tags].sort((a, b) => a.atUtc.localeCompare(b.atUtc));
}

/** One-line rendering of a span history for the D62 audit trail. Deliberately human-readable and
 * deliberately raw UTC: this is a provenance string, not a display surface, so it must not depend
 * on a locale or a formatter (D42 — engines never bake display timestamps into their output).
 *
 * It renders **every** field of `StatusTagEvent`, and that is load-bearing rather than verbose. The
 * trail records before → after strings; a field this function omits is a field whose edit produces
 * two identical strings, i.e. an audit entry saying something changed without saying what — on a
 * card a signed `MaintenanceRelease` points at. If `StatusTagEvent` gains a field, add it here. */
export function describeTimeline(tags: StatusTagEvent[] | undefined): string {
  if (!tags || tags.length === 0) return '(no time history)';
  return sorted(tags)
    .map(t => `${t.atUtc} ${t.tag}`
      + (t.gapReason ? `/${t.gapReason}` : '')
      + (t.includeInTotals === false ? ' (excluded)' : '')
      + ` by:${t.byOid || '—'}`
      + (t.partsOrderId ? ` po:${t.partsOrderId}` : '')
      + (t.note?.trim() ? ` "${t.note.trim()}"` : ''))
    .join(' · ');
}

function validate(tags: StatusTagEvent[], card: WorkCard): string | undefined {
  const seq = sorted(tags);
  for (let i = 0; i < seq.length; i++) {
    const t = seq[i];
    if (Number.isNaN(new Date(t.atUtc).getTime())) return 'A span has an unreadable start time.';
    if (NOTE_REQUIRED.includes(t.tag) && !t.note?.trim()) {
      return t.tag === 'WAITING_PARTS'
        ? 'Waiting-on-parts (POO) needs a note — what part, ordered from whom.'
        : 'A free-text wait state needs a note saying what is being waited on.';
    }
    if (t.tag === 'GAP' && !t.gapReason) return 'A gap needs a reason — nobody was working, say why.';
    if (i > 0 && seq[i - 1].atUtc === t.atUtc) return 'Two spans start at the same time — give each a distinct start.';
    // Adjacency is checked AFTER sorting, which is the point: the pre-D61 guard inspected only the
    // last element, so inserting a span between two others could create the very adjacent duplicate
    // it was written to prevent.
    //
    // GAP is exempt when the two gaps differ. A gap is not a state the card is *in* — it is an
    // annotation on a stretch where nobody worked, and D61 §4 names an away period that is not
    // uniform: the shop goes home Friday (our own shift pattern, counted) and the contract crew then
    // leaves with no replacement (dead time nobody owns, excluded). Back-to-back GAP spans are the
    // only way to say that. Two gaps that agree on both reason and include-flag are still one gap
    // typed twice, and are still refused.
    if (i > 0 && seq[i - 1].tag === t.tag) {
      const prev = seq[i - 1];
      const distinguishableGaps = t.tag === 'GAP'
        && (prev.gapReason !== t.gapReason || (prev.includeInTotals !== false) !== (t.includeInTotals !== false));
      if (!distinguishableGaps) {
        return t.tag === 'GAP'
          ? 'Two identical gaps in a row — merge them, or give one a different reason or include/exclude choice.'
          : 'Two spans in a row are the same state — merge them, or change one.';
      }
    }
    if (card.completedAtUtc && t.atUtc > card.completedAtUtc) {
      return 'A span cannot start after the card was complied with.';
    }
  }
  return undefined;
}

/**
 * The **only** sanctioned writer of a card's time history: validates, re-sorts, and appends the D62
 * audit record. Callers pass the whole intended history — the retrospective timeline editor (D61's
 * primary path) and the live convenience chips both come through here.
 *
 * D62: this is permitted on a `COMPLETED` card. The premise of D61 is reconstruction *after* the
 * event — the technician who signs the CRS at 0200 and writes up the day at 0900. What used to be a
 * hard refusal ("its time history is closed") is now an audited edit. This is not an immutability
 * breach: `WorkCard` is in neither ledger class in `CLAUDE.md`, `statusTags` is documented as
 * off-ledger WIP state, and `engine/signing.ts` never folds the card body into a content hash. The
 * audit trail buys defensibility, because a signed `MaintenanceRelease` points at this card.
 *
 * The card's own `status` is left alone once COMPLETED — editing the time history must never
 * un-complete a card that a signed release points at.
 */
export function writeStatusTimeline(
  card: WorkCard,
  tags: StatusTagEvent[],
  by: { oid: string; name?: string },
  atUtc: string,
): AppendTagResult {
  const err = validate(tags, card);
  if (err) return { ok: false, error: err };
  const next = sorted(tags).map(t => ({ ...t, note: t.note?.trim() || undefined }));
  const audit: WorkCardTimeAuditEvent = {
    atUtc,
    byOid: by.oid,
    byName: by.name,
    before: card.statusTags?.length ? describeTimeline(card.statusTags) : undefined,
    after: describeTimeline(next),
    afterCompletion: card.status === 'COMPLETED',
  };
  return {
    ok: true,
    card: {
      ...card,
      statusTags: next,
      status: card.status === 'COMPLETED' ? card.status : next.length ? 'IN_WORK' : card.status,
      timeAudit: [...(card.timeAudit ?? []), audit],
    },
  };
}

/**
 * Append one work/wait state change (QM4/D27). Per D61 this is the **convenience** path — a tech
 * who wants to tap as they go may, but the editable timeline is the source of truth, because a
 * design that depends on live tapping produces wrong-but-confident numbers, which is worse than
 * none. Pure — returns the updated card for EDIT_WORK_CARD.
 */
export function appendStatusTag(
  card: WorkCard,
  tag: WorkCardStatusTag,
  byOid: string,
  atUtc: string,
  extra?: {
    note?: string;
    byName?: string;
    gapReason?: WorkGapReason;
    includeInTotals?: boolean;
    partsOrderId?: string;
  },
): AppendTagResult {
  if (currentTag(card) === tag) {
    return { ok: false, error: 'The card is already in that state.' };
  }
  const ev: StatusTagEvent = {
    tag, atUtc, byOid,
    note: extra?.note?.trim() || undefined,
    gapReason: extra?.gapReason,
    includeInTotals: extra?.includeInTotals,
    partsOrderId: extra?.partsOrderId,
  };
  return writeStatusTimeline(card, [...(card.statusTags ?? []), ev], { oid: byOid, name: extra?.byName }, atUtc);
}

export interface StatusDurations {
  /**
   * Per-state elapsed hours. A `GAP` span the enterer EXCLUDED contributes **0** here and is
   * reported in `excludedGapHours` instead — so summing this record is always the counted total,
   * and an excluded gap is marked rather than destroyed.
   */
  hours: Record<WorkCardStatusTag, number>;
  /** Gap hours the enterer chose not to count (D61 §4). Preserved and surfaced, never dropped. */
  excludedGapHours: number;
  openTag?: WorkCardStatusTag;  // state the card is sitting in right now (undefined once completed)
}

/** Per-state elapsed hours from the tag history. The final segment closes at completion time, or
 * runs to asOf while the card is open — "how long has it been waiting" is always answerable live.
 *
 * D61/D63: spans still run edge to edge, but an unworked stretch is no longer invisible. Before
 * this, an overnight where somebody left the card `IN_WORK` accrued silently to wrench time; now
 * the tech logs that stretch as a `GAP` span and chooses, per gap, whether it counts. */
export function statusDurations(card: WorkCard, asOfUtc: string): StatusDurations {
  const hours = zeroHours();
  const tags = sorted(card.statusTags ?? []);
  if (tags.length === 0) return { hours, excludedGapHours: 0 };
  const end = card.completedAtUtc ?? asOfUtc;
  let excludedGapHours = 0;
  for (let i = 0; i < tags.length; i++) {
    const from = new Date(tags[i].atUtc).getTime();
    const to = new Date(i + 1 < tags.length ? tags[i + 1].atUtc : end).getTime();
    const span = Math.max(0, (to - from) / 3600000);
    if (tags[i].tag === 'GAP' && tags[i].includeInTotals === false) excludedGapHours += span;
    else hours[tags[i].tag] += span;
  }
  (Object.keys(hours) as WorkCardStatusTag[]).forEach(k => { hours[k] = round1(hours[k]); });
  return {
    hours,
    excludedGapHours: round1(excludedGapHours),
    openTag: card.completedAtUtc ? undefined : tags[tags.length - 1].tag,
  };
}
