import type { FeedItem } from '../types';
import { defaultStorage, type StorageLike } from '../storage';

const AUDIENCE = ['maintenance', 'safety', 'admin', 'lead'];
const DAY = 86400000;

interface StoredAudit {
  id: string;
  title: string;
  expirationDate?: string;
  assignedTo?: string;
}

export function buildAuditFeed(
  userRole: string,
  nowUtc: string,
  storage: StorageLike | null = defaultStorage(),
): FeedItem[] {
  if (!AUDIENCE.includes(userRole) || !storage) return [];
  let audits: StoredAudit[];
  try {
    audits = JSON.parse(storage.getItem('antigravity_audits') ?? '[]');
  } catch {
    return [];
  }
  const now = new Date(nowUtc).getTime();
  const out: FeedItem[] = [];
  for (const a of audits) {
    if (!a.expirationDate) continue;
    const daysUntil = Math.ceil((new Date(a.expirationDate).getTime() - now) / DAY);
    const assigned = a.assignedTo ? `Assigned to ${a.assignedTo}.` : undefined;
    if (daysUntil < 0) {
      out.push({
        id: `audit-expired:${a.id}`,
        severity: 'critical',
        title: `Audit expired: ${a.title}`,
        detail: [`Expired ${Math.abs(daysUntil)} day(s) ago.`, assigned].filter(Boolean).join(' '),
        module: 'Audit Management',
        link: '/internal-audits',
      });
    } else if (daysUntil <= 30) {
      out.push({
        id: `audit-due:${a.id}`,
        severity: daysUntil <= 7 ? 'warn' : 'info',
        title: `Audit expiring in ${daysUntil}d: ${a.title}`,
        detail: assigned,
        module: 'Audit Management',
        link: '/internal-audits',
      });
    }
  }
  return out;
}
