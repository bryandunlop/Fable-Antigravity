import { useNavigate } from 'react-router-dom';
import { useTechLog, useCurrentUser } from './TechLogContext';
import { newId } from './util/id';
import { createRectificationCard } from './engine/rectification';
import type { Defect } from './types';

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
