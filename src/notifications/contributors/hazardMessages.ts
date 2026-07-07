import type { FeedItem } from '../types';
import { defaultStorage, type StorageLike } from '../storage';
import { isAwaitingReplyFrom } from '../../components/hazard/engine/thread';
import type { Hazard } from '../../contexts/HazardContext';

const SAFETY_ROLES = ['safety', 'admin'];

/** Surfaces hazard follow-up messages awaiting a reply — for safety staff (a reporter
 * replied) and for the known reporter (safety asked for more info). Derived, so an item
 * clears once the thread is answered. Anonymous reports are excluded. */
export function buildHazardMessageFeed(
  userRole: string,
  _nowUtc: string,
  storage: StorageLike | null = defaultStorage(),
): FeedItem[] {
  if (!storage) return [];
  let hazards: Hazard[];
  try {
    const parsed = JSON.parse(storage.getItem('aviation_hazards') ?? '[]');
    if (!Array.isArray(parsed)) return [];
    hazards = parsed;
  } catch {
    return [];
  }

  const out: FeedItem[] = [];

  if (SAFETY_ROLES.includes(userRole)) {
    for (const h of hazards) {
      if (isAwaitingReplyFrom(h, 'safety')) {
        out.push({
          id: `hazard-msg-safety:${h.id}`,
          severity: 'info',
          title: `New reply from reporter on ${h.id}`,
          detail: h.title,
          module: 'Safety Systems',
          link: `/safety/hazards/${h.id}`,
        });
      }
    }
    return out;
  }

  // Potential reporter: match the hazard's submitterId to this browser's stable id.
  const myId = storage.getItem('aviation_user_id');
  if (!myId) return out;
  for (const h of hazards) {
    if (h.submitterId === myId && isAwaitingReplyFrom(h, 'submitter')) {
      out.push({
        id: `hazard-msg-reporter:${h.id}`,
        severity: 'warn',
        title: `Safety requested more information on ${h.id}`,
        detail: h.title,
        module: 'Safety Systems',
        link: `/safety/hazards/${h.id}`,
      });
    }
  }
  return out;
}
