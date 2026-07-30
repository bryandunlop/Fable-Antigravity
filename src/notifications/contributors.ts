import type { FeedItem } from './types';
import { buildTechLogFeed } from './contributors/techLog';
import { buildAuditFeed } from './contributors/audits';
import { buildHazardFeed } from './contributors/hazards';
import { buildInventoryFeed } from './contributors/inventory';
import { buildTripReminderFeed } from './contributors/tripReminders';
// D66: the legacy bulletins contributor is gone. It read the no-longer-written
// 'bulletins-state' key and deep-linked to the retired bulletin pages; the unified
// documents contributor below covers bulletin classes and links to the document.
import { buildDocumentsFeed } from './contributors/documents';
import { buildHazardMessageFeed } from './contributors/hazardMessages';

export type FeedContributor = (userRole: string, nowUtc: string) => FeedItem[];

/** Static registry. Each contributor derives from its own module's persisted
 * store and owns its audience filtering — there is no central role→type map. */
export const CONTRIBUTORS: FeedContributor[] = [
  (r, t) => buildTechLogFeed(r, t),
  (r, t) => buildAuditFeed(r, t),
  (r, t) => buildHazardFeed(r, t),
  (r, t) => buildInventoryFeed(r, t),
  (r, t) => buildTripReminderFeed(r, t),
  (r, t) => buildDocumentsFeed(r, t),
  (r, t) => buildHazardMessageFeed(r, t),
];
