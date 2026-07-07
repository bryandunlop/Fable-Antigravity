// Pure read-and-initial logic for bulletins. No React / no storage — unit-tested.
import type { Bulletin, BulletinAcknowledgment } from '../types';

/** One person who is expected to read a bulletin. In this demo, login is by role,
 * so a "reader" is a role plus its resolved representative user id. */
export interface Reader {
  role: string;
  userId: string;
}

/** Has this user acknowledged the CURRENT version of the bulletin? A prior-version
 * ack does not count (a re-issue re-arms the requirement). */
export function isAcknowledged(
  bulletin: Pick<Bulletin, 'id' | 'version'>,
  acks: BulletinAcknowledgment[],
  userId: string,
): boolean {
  return acks.some(
    (a) => a.bulletinId === bulletin.id && a.userId === userId && a.bulletinVersion === bulletin.version,
  );
}

/** Acknowledgments recorded against the bulletin's current version. */
export function acknowledgedFor(
  bulletin: Pick<Bulletin, 'id' | 'version'>,
  acks: BulletinAcknowledgment[],
): BulletinAcknowledgment[] {
  return acks.filter((a) => a.bulletinId === bulletin.id && a.bulletinVersion === bulletin.version);
}

/** Whether a reader (by role) is in the bulletin's target audience. */
export function isTargetRole(bulletin: Pick<Bulletin, 'roles'>, role: string): boolean {
  return bulletin.roles.includes('all') || bulletin.roles.includes(role);
}

/** Readers who still owe a read-and-initial on the current version. */
export function outstandingReaders(
  bulletin: Pick<Bulletin, 'id' | 'version'>,
  readers: Reader[],
  acks: BulletinAcknowledgment[],
): Reader[] {
  return readers.filter((r) => !isAcknowledged(bulletin, acks, r.userId));
}

/** Must-read bulletins the given user (role + resolved id) has not yet acknowledged.
 * Drives the "Action required" badge and the notification contributor. */
export function unacknowledgedMustReads(
  bulletins: Bulletin[],
  acks: BulletinAcknowledgment[],
  userRole: string,
  userId: string,
): Bulletin[] {
  return bulletins.filter(
    (b) =>
      b.requireAcknowledgment &&
      !b.isArchived &&
      isTargetRole(b, userRole) &&
      !isAcknowledged(b, acks, userId),
  );
}
