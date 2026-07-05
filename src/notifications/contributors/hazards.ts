import type { FeedItem } from '../types';
import { defaultStorage, type StorageLike } from '../storage';

const AUDIENCE = ['safety', 'admin', 'lead'];
const DAY = 86400000;

interface StoredHazard {
  id: string;
  title: string;
  effectivenessReviewDate?: string;
}

export function buildHazardFeed(
  userRole: string,
  nowUtc: string,
  storage: StorageLike | null = defaultStorage(),
): FeedItem[] {
  if (!AUDIENCE.includes(userRole) || !storage) return [];
  let hazards: StoredHazard[];
  try {
    const parsed = JSON.parse(storage.getItem('aviation_hazards') ?? '[]');
    if (!Array.isArray(parsed)) return [];
    hazards = parsed;
  } catch {
    return [];
  }
  const now = new Date(nowUtc).getTime();
  const out: FeedItem[] = [];
  for (const h of hazards) {
    if (!h || !h.effectivenessReviewDate) continue;
    const reviewTime = new Date(h.effectivenessReviewDate).getTime();
    if (Number.isNaN(reviewTime)) continue;
    const daysUntil = Math.ceil((reviewTime - now) / DAY);
    if (daysUntil > 7) continue;
    out.push({
      id: `hazard-review:${h.id}`,
      severity: daysUntil < 0 ? 'warn' : 'info',
      title: daysUntil < 0
        ? `Effectiveness review overdue: ${h.title}`
        : `Effectiveness review due${daysUntil === 0 ? ' today' : ` in ${daysUntil}d`}: ${h.title}`,
      detail: '6-month effectiveness review.',
      module: 'Safety Systems',
      link: `/safety/hazard-workflow/${h.id}`,
    });
  }
  return out;
}
