import type { Defect, WorkCard } from '../types';

/**
 * CAMP push input for closing a defect's discrepancy on rectification (intent CLOSE → UPDATE/Closed,
 * parent ref carried forward off-ledger). Built here — next to the card factory — so the close always
 * carries the defect's pre-rectification status and a watch-lane discrepancy stays DEFERRED-WATCHLIST.
 */
export function rectificationClosePush(
  defect: Defect,
  rectifiedDefectId: string,
  opts: { technician: string; riiItem?: boolean; inspector?: string },
) {
  return {
    entityType: 'DEFECT' as const,
    entityId: rectifiedDefectId,
    aircraftId: defect.aircraftId,
    ata: defect.ataChapter,
    description: defect.description,
    technician: opts.technician,
    intent: 'CLOSE' as const,
    supersedesEntityId: defect.id,
    // Pre-rectification status keeps the CAMP lane: a WATCHLISTED defect closes as
    // DEFERRED-WATCHLIST against its existing watch-lane discrepancy, never NON-DEFERRED.
    defectStatus: defect.status,
    riiItem: opts.riiItem,
    inspector: opts.inspector,
  };
}

/**
 * Build a corrective work card for a defect rectification — linked to the defect (`linkedDefectId`) so
 * completing the card in WorkCardDetail rectifies the defect, clears any linked deferral, and returns
 * the aircraft to service. Seeds exactly one step so the card is completable; the mechanic adds
 * steps / labor / parts, or pulls the steps from a CAMP work order.
 */
export function createRectificationCard(
  defect: Defect,
  ids: { cardId: string; stepId: string },
  nowUtc: string,
  deferralId?: string,
): WorkCard {
  return {
    id: ids.cardId,
    cardNumber: `WC-${ids.cardId.slice(-4).toUpperCase()}`,
    aircraftId: defect.aircraftId,
    title: `Rectify — ATA ${defect.ataChapter}: ${defect.description}`,
    ataChapter: defect.ataChapter,
    description: defect.description,
    steps: [{ id: ids.stepId, seq: 1, text: `Rectify: ${defect.description}`, done: false }],
    status: 'OPEN',
    source: 'MANUAL',
    headerStatusCode: 1, // Open (CAMP WO header ladder)
    scheduled: false,    // corrective (defect-driven), not a scheduled task
    linkedDefectId: defect.id,
    linkedDeferralId: deferralId,
    riiRequired: false,
    createdAtUtc: nowUtc,
  };
}
