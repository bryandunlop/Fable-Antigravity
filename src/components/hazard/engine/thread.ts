// Pure logic for the hazard secure follow-up thread. No React / no storage — unit-tested.
import type { Hazard, HazardMessage } from '../../../contexts/HazardContext';

export type ThreadRole = 'safety' | 'submitter';

export interface ThreadParticipant {
  role: ThreadRole;
}

/** Who, if anyone, the current viewer is in this hazard's thread.
 * Anonymous reports have no thread (returns null for everyone). */
export function threadParticipant(
  hazard: Pick<Hazard, 'isAnonymous' | 'submitterId'>,
  currentUserId: string,
  isSafetyManager: boolean,
): ThreadParticipant | null {
  if (hazard.isAnonymous) return null;
  if (isSafetyManager) return { role: 'safety' };
  if (hazard.submitterId && hazard.submitterId === currentUserId) return { role: 'submitter' };
  return null;
}

export function lastMessage(hazard: Pick<Hazard, 'messages'>): HazardMessage | undefined {
  const msgs = hazard.messages;
  return msgs && msgs.length ? msgs[msgs.length - 1] : undefined;
}

/** True when the thread's most recent message was written by the OTHER party,
 * i.e. it is awaiting a reply from `viewerRole`. Drives the notification feed. */
export function isAwaitingReplyFrom(
  hazard: Pick<Hazard, 'messages' | 'isAnonymous'>,
  viewerRole: ThreadRole,
): boolean {
  if (hazard.isAnonymous) return false;
  const last = lastMessage(hazard);
  return !!last && last.authorRole !== viewerRole;
}
