import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTechLog, useCurrentUser } from './TechLogContext';
import { newId } from './util/id';
import { currentRows } from './engine/supersede';
import { createRectificationCard } from './engine/rectification';
import { planFixFromDeferral } from './engine/fixFromDeferral';
import type { Defect, Deferral } from './types';

/**
 * Rectify a defect by raising a corrective work card linked to it, then opening the card to execute.
 * Completing the card (WorkCardDetail) rectifies the defect + returns the aircraft to service.
 * Shared by AircraftDetail and Defects so the "rectify → work card" logic lives in one place.
 */
export function useRectifyToWorkCard() {
  const { dispatch } = useTechLog();
  const user = useCurrentUser();
  const navigate = useNavigate();

  return (defect: Defect) => {
    const cardId = newId('wc');
    const now = new Date().toISOString();
    const card = createRectificationCard(defect, { cardId, stepId: newId('st') }, now);
    dispatch({ type: 'ADD_WORK_CARD', payload: card });
    dispatch({
      type: 'ADD_AUDIT',
      payload: {
        id: newId('aud'), actorOid: user.oid, action: 'WORKCARD_RAISED', entityType: 'WorkCard',
        entityId: cardId, atUtc: now,
        summary: `${card.cardNumber} raised to rectify ATA ${defect.ataChapter} defect (${defect.id})`,
      },
    });
    navigate(`/tech-log/work-cards/${cardId}`);
  };
}

/**
 * Start the fix for a DEFERRED item: raise a corrective work card against the deferral's underlying
 * defect (linked to both), then open it to execute. If a non-completed card already covers that
 * defect, open the existing card instead of creating a duplicate. Raising the card does NOT clear
 * the deferral — the aircraft stays covered (AMBER) until the card is completed and the release is
 * signed, which then rectifies the defect and supersede-clears the deferral (WorkCardDetail).
 */
export function useRaiseFixFromDeferral() {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const navigate = useNavigate();

  return (deferral: Deferral) => {
    const now = new Date().toISOString();
    const plan = planFixFromDeferral(
      deferral,
      currentRows(state.defects),
      state.workCards,
      { cardId: newId('wc'), stepId: newId('st') },
      now,
    );
    if (plan.kind === 'NO_DEFECT') {
      toast.error('Cannot start the fix — the deferred defect could not be found.');
      return;
    }
    if (plan.kind === 'OPEN_EXISTING') {
      toast.info('This deferral already has an open work card — opening it.');
      navigate(`/tech-log/work-cards/${plan.cardId}`);
      return;
    }
    dispatch({ type: 'ADD_WORK_CARD', payload: plan.card });
    dispatch({
      type: 'ADD_AUDIT',
      payload: {
        id: newId('aud'), actorOid: user.oid, action: 'WORKCARD_RAISED', entityType: 'WorkCard',
        entityId: plan.card.id, atUtc: now,
        summary: `${plan.card.cardNumber} raised to rectify deferred ATA ${plan.card.ataChapter} defect (deferral ${deferral.id})`,
      },
    });
    navigate(`/tech-log/work-cards/${plan.card.id}`);
  };
}
