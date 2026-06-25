import type { Defect, WorkCard } from '../types';

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
    riiRequired: false,
    createdAtUtc: nowUtc,
  };
}
