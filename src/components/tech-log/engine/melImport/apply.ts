/**
 * Turn a reviewed MEL import into the exact rows that will be written, and apply them (D95).
 *
 * Split in two on purpose. `buildImportPayload` runs at PROPOSAL time and freezes the
 * outcome; `applyMelImport` runs at APPROVAL time and does only what the frozen payload
 * says. Re-deriving the diff at approval would mean the approver signs one thing and a
 * different thing gets written if the catalog moved in between — the same reason a
 * signature snapshots its content rather than resolving it live.
 */
import type { AircraftType, MelItem, MelSection } from '../../types';
import type { CatalogDiff } from './checks';

export interface ImportPayload {
  added: MelItem[];
  changed: MelItem[];
  removedIds: string[];
  unchangedCount: number;
  /**
   * Revision stamps for rows whose CONTENT did not change but which still appear in this
   * document — and therefore still carry a revision from it.
   */
  stamps: { subItemNumber: string; mmelRevision: string; effectiveDate: string }[];
}

function section(item: MelItem): MelSection {
  return item.melSection ?? 'ONE';
}

/**
 * The rows this import will write, decided once.
 *
 * A changed row keeps the id the catalog already knows it by. The parser derives ids from
 * the item number, so they usually agree — but "usually" is not a thing to write a MEL
 * against, and an id that silently changed would orphan every record pointing at it.
 */
export function buildImportPayload(diff: CatalogDiff, parsed: MelItem[]): ImportPayload {
  // A MEL revises page by page, so each row's revision is the one printed on ITS page —
  // never the document's. Stamping all 495 rows with the document revision would claim
  // every item was revised, when the G650ER R1 leaves 24 pages at Original.
  const approve = (m: MelItem): MelItem => ({ ...m, approvalState: 'APPROVED' });

  const changedNumbers = new Set(diff.changed.map(c => c.after.subItemNumber));
  const addedNumbers = new Set(diff.added.map(m => m.subItemNumber));

  return {
    added: diff.added.map(approve),
    changed: diff.changed.map(c => approve({ ...c.after, id: c.before.id })),
    removedIds: diff.removed.map(m => m.id),
    unchangedCount: diff.unchanged,
    stamps: parsed
      .filter(m => !changedNumbers.has(m.subItemNumber) && !addedNumbers.has(m.subItemNumber))
      .map(m => ({
        subItemNumber: m.subItemNumber,
        mmelRevision: m.mmelRevision,
        effectiveDate: m.effectiveDate,
      })),
  };
}

export interface ApplyImportInput {
  melItems: MelItem[];
  aircraftType: AircraftType;
  /** The sections this document actually contained. Others are left entirely alone. */
  sections: MelSection[];
  payload: ImportPayload;
}

export function applyMelImport({
  melItems,
  aircraftType,
  sections,
  payload,
}: ApplyImportInput): MelItem[] {
  const inScope = new Set(sections);
  const changedById = new Map(payload.changed.map(m => [m.id, m]));
  const removed = new Set(payload.removedIds);
  const stampByNumber = new Map(payload.stamps.map(s => [s.subItemNumber, s]));

  const next = melItems.map(m => {
    if (m.aircraftType !== aircraftType || !inScope.has(section(m))) return m;

    // Withdrawn by this revision. SUPERSEDED rather than deleted: a deferral signed against
    // it must still resolve, while DeferralCreatePanel — which only offers APPROVED items —
    // stops anyone citing it again. Deliberately NOT restamped; it is not in this revision.
    if (removed.has(m.id)) return { ...m, approvalState: 'SUPERSEDED' as const };

    const replacement = changedById.get(m.id);
    if (replacement) return replacement;

    // Unchanged in content, but it IS in this document and carries whatever revision its
    // page printed — otherwise the catalog still reads Rev 1 after Rev 2 was approved and a
    // deferral would snapshot a revision the aircraft is no longer operating under. A row
    // this document did not mention at all keeps what it had.
    const stamp = stampByNumber.get(m.subItemNumber);
    if (!stamp) return m;
    return {
      ...m,
      mmelRevision: stamp.mmelRevision,
      effectiveDate: stamp.effectiveDate,
      approvalState: 'APPROVED' as const,
    };
  });

  return [...next, ...payload.added];
}
