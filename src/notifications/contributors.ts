import type { FeedItem } from './types';
import { buildTechLogFeed } from './contributors/techLog';
import { buildAuditFeed } from './contributors/audits';
import { buildHazardFeed } from './contributors/hazards';
import { buildInventoryFeed } from './contributors/inventory';
import { buildTripReminderFeed } from './contributors/tripReminders';
import { buildBulletinFeed } from './contributors/bulletins';

export type FeedContributor = (userRole: string, nowUtc: string) => FeedItem[];

/** Static registry. Each contributor derives from its own module's persisted
 * store and owns its audience filtering — there is no central role→type map. */
export const CONTRIBUTORS: FeedContributor[] = [
  (r, t) => buildTechLogFeed(r, t),
  (r, t) => buildAuditFeed(r, t),
  (r, t) => buildHazardFeed(r, t),
  (r, t) => buildInventoryFeed(r, t),
  (r, t) => buildTripReminderFeed(r, t),
  (r, t) => buildBulletinFeed(r, t),
];
