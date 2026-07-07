import type { FeedItem } from '../types';
import { defaultStorage, type StorageLike } from '../storage';
import { resolveUserId } from '../identity';
import { unacknowledgedMustReads } from '../../components/bulletins/engine/acknowledgments';
import type { BulletinsState } from '../../components/bulletins/types';

const STORAGE_KEY = 'bulletins-state';

/** Surfaces "Read & Initial" bulletins the current user (by login role) still owes.
 * Derived — same unacknowledged bulletin ⇒ same id, so it clears itself once acked. */
export function buildBulletinFeed(
  userRole: string,
  _nowUtc: string,
  storage: StorageLike | null = defaultStorage(),
): FeedItem[] {
  if (!storage) return [];
  let state: BulletinsState;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.bulletins)) return [];
    state = { bulletins: parsed.bulletins, acknowledgments: Array.isArray(parsed.acknowledgments) ? parsed.acknowledgments : [] };
  } catch {
    return [];
  }

  const userId = resolveUserId(userRole);
  const outstanding = unacknowledgedMustReads(state.bulletins, state.acknowledgments, userRole, userId);

  return outstanding.map((b) => ({
    id: `bulletin-ack:${b.id}:${b.version}`,
    severity: 'warn',
    title: `Action required: read & initial "${b.title}"`,
    detail: `${b.bulletinType === 'flight-ops' ? 'Flight Operations' : 'Procedural'} Bulletin ${b.id} · v${b.version}`,
    module: 'Bulletins',
    link: b.bulletinType === 'flight-ops' ? '/flight-operations-bulletins' : '/procedural-bulletins',
  }));
}
