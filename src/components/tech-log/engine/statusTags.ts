import type { StatusTagEvent, WorkCard, WorkCardStatusTag } from '../types';

const round1 = (n: number) => Math.round(n * 10) / 10;

export type AppendTagResult = { ok: true; card: WorkCard } | { ok: false; error: string };

export function currentTag(card: WorkCard): WorkCardStatusTag | undefined {
  const tags = card.statusTags;
  return tags && tags.length ? tags[tags.length - 1].tag : undefined;
}

/**
 * Append a work/wait state change to the card's tag history (QM4/D27). Pure — returns the updated
 * card for EDIT_WORK_CARD. WAITING_PARTS demands a note: "waiting on parts" without what/from-whom
 * is exactly the un-answerable hole the C-suite question falls into later.
 */
export function appendStatusTag(
  card: WorkCard,
  tag: WorkCardStatusTag,
  byOid: string,
  atUtc: string,
  note?: string,
): AppendTagResult {
  if (card.status === 'COMPLETED') {
    return { ok: false, error: 'This card is complied with — its time history is closed.' };
  }
  if (currentTag(card) === tag) {
    return { ok: false, error: 'The card is already in that state.' };
  }
  if (tag === 'WAITING_PARTS' && !note?.trim()) {
    return { ok: false, error: 'Waiting-on-parts (POO) needs a note — what part, ordered from whom.' };
  }
  const ev: StatusTagEvent = { tag, atUtc, byOid, note: note?.trim() || undefined };
  return {
    ok: true,
    card: { ...card, statusTags: [...(card.statusTags ?? []), ev], status: 'IN_WORK' },
  };
}

export interface StatusDurations {
  hours: Record<WorkCardStatusTag, number>;
  openTag?: WorkCardStatusTag;  // state the card is sitting in right now (undefined once completed)
}

/** Per-state elapsed hours from the tag history. The final segment closes at completion time, or
 * runs to asOf while the card is open — "how long has it been waiting" is always answerable live. */
export function statusDurations(card: WorkCard, asOfUtc: string): StatusDurations {
  const hours: Record<WorkCardStatusTag, number> = { IN_WORK: 0, WAITING_PARTS: 0, WAITING_INSPECTION: 0 };
  const tags = card.statusTags ?? [];
  if (tags.length === 0) return { hours };
  const end = card.completedAtUtc ?? asOfUtc;
  for (let i = 0; i < tags.length; i++) {
    const from = new Date(tags[i].atUtc).getTime();
    const to = new Date(i + 1 < tags.length ? tags[i + 1].atUtc : end).getTime();
    hours[tags[i].tag] += Math.max(0, (to - from) / 3600000);
  }
  (Object.keys(hours) as WorkCardStatusTag[]).forEach(k => { hours[k] = round1(hours[k]); });
  return { hours, openTag: card.completedAtUtc ? undefined : tags[tags.length - 1].tag };
}
