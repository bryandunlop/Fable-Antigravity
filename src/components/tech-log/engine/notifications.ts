import type { TechLogState, Personnel } from '../types';
import { currentRows } from './supersede';
import { deriveServiceability } from './serviceability';
import { isDeferralExpired } from './pl25';
import { expiredChecksFor } from './recurringChecks';
import { deriveSafaReadiness } from './safa';
import { campSafaStatus } from '../integration/campClient';
import { latestBriefing } from '../components/BriefingPanel';

const DAY = 86400000;

export type NotifSeverity = 'critical' | 'warn' | 'info';
export interface Notification {
  id: string;            // stable key (for dismissal)
  severity: NotifSeverity;
  title: string;
  detail?: string;
  tail?: string;
  link: string;          // route to open
  atUtc?: string;
}

const RANK: Record<NotifSeverity, number> = { critical: 0, warn: 1, info: 2 };

/**
 * Role-filtered notification feed, fully derived from the ledger (no stored notifications) minus the
 * keys the user has dismissed. Maintenance sees the work that needs them; pilots see the handoff
 * coming back (briefing ready, their squawk actioned) plus grounded aircraft.
 */
export function buildNotifications(
  state: TechLogState,
  user: Personnel,
  nowUtc: string,
): Notification[] {
  const now = new Date(nowUtc).getTime();
  const dismissed = new Set(state.dismissedNotifications);
  const tailOf = (id: string) => state.aircraft.find(a => a.id === id)?.tailNumber ?? '—';
  const out: Notification[] = [];

  const defects = currentRows(state.defects);
  const deferrals = currentRows(state.deferrals);
  const isMaint = user.role === 'MAINTENANCE';

  if (isMaint) {
    for (const d of defects.filter(x => x.status === 'OPEN')) {
      const tail = tailOf(d.aircraftId);
      out.push({ id: `sq:${d.id}`, severity: d.airworthinessAffecting === false ? 'warn' : 'critical', title: `New squawk — ${tail}`, detail: `ATA ${d.ataChapter}: ${d.description}`, tail, link: `/tech-log/aircraft/${tail}?tab=defects`, atUtc: d.reportedAtUtc });
    }
    for (const d of deferrals.filter(x => x.status === 'PENDING_PLACARD')) {
      const tail = tailOf(d.aircraftId);
      out.push({ id: `pp:${d.id}`, severity: 'critical', title: `Grounded — (M)/placard release pending — ${tail}`, detail: 'Sign the gating release to dispatch.', tail, link: `/tech-log/aircraft/${tail}?tab=deferrals&deferral=${d.id}&gating=1` });
    }
    for (const d of deferrals.filter(x => x.status === 'ACTIVE')) {
      const ac = state.aircraft.find(a => a.id === d.aircraftId);
      const tail = tailOf(d.aircraftId);
      const expired = ac && isDeferralExpired(d, nowUtc, { hours: ac.airframeTotalHours, cycles: ac.airframeTotalCycles });
      if (expired) {
        out.push({ id: `df:${d.id}`, severity: 'critical', title: `Deferral overdue — ${tail}`, detail: 'Past its repair-due condition.', tail, link: `/tech-log/aircraft/${tail}?tab=deferrals` });
      } else if (d.repairDueDateUtc) {
        const days = Math.floor((new Date(d.repairDueDateUtc).getTime() - now) / DAY);
        if (days >= 0 && days <= 3) out.push({ id: `df:${d.id}`, severity: 'warn', title: `Deferral due in ${days}d — ${tail}`, tail, link: `/tech-log/aircraft/${tail}?tab=deferrals` });
      }
    }
    for (const ac of state.aircraft) {
      for (const c of expiredChecksFor(ac.id, state, nowUtc)) {
        out.push({ id: `ck:${c.id}`, severity: 'critical', title: `Recurring check expired — ${ac.tailNumber}`, detail: c.name, tail: ac.tailNumber, link: `/tech-log/aircraft/${ac.tailNumber}?tab=overview` });
      }
    }
  } else {
    // pilot lens
    for (const b of state.briefings.filter(x => x.status === 'RELEASED')) {
      const tail = tailOf(b.aircraftId);
      out.push({ id: `br:${b.id}`, severity: 'info', title: `Flight briefing ready — ${tail}`, detail: 'Maintenance released the aircraft for flight — review & acknowledge.', tail, link: `/tech-log/aircraft/${tail}?tab=briefing`, atUtc: b.releasedAtUtc });
    }
    const RECENT = 7 * DAY; // only surface recently-actioned squawks, not old history
    for (const d of defects.filter(x => x.reportedByOid === user.oid && (x.status === 'DEFERRED' || x.status === 'RECTIFIED'))) {
      const actionAt = d.clearedTsUtc ?? d.reportedAtUtc;
      if (now - new Date(actionAt).getTime() > RECENT) continue;
      const tail = tailOf(d.aircraftId);
      out.push({ id: `ac:${d.id}`, severity: 'info', title: `Your squawk was ${d.status === 'DEFERRED' ? 'deferred' : 'rectified'} — ${tail}`, detail: `ATA ${d.ataChapter}: ${d.description}`, tail, link: `/tech-log/aircraft/${tail}?tab=defects` });
    }
    for (const ac of state.aircraft.filter(a => !a.isProvisional)) {
      if (deriveServiceability(ac.id, state, nowUtc).status === 'RED') {
        out.push({ id: `red:${ac.id}`, severity: 'warn', title: `${ac.tailNumber} is grounded (RED)`, tail: ac.tailNumber, link: `/tech-log/aircraft/${ac.tailNumber}` });
      }
    }
    // SAFA ramp-check readiness (advisory — never a dispatch gate): surface items CAMP flags as ACTION.
    for (const ac of state.aircraft.filter(a => !a.isProvisional)) {
      const action = deriveSafaReadiness(state.safaCheckItems, campSafaStatus(ac.serialNumber)).filter(r => r.status === 'ACTION');
      if (action.length > 0) {
        out.push({ id: `safa:${ac.id}`, severity: 'warn', title: `SAFA item needs attention — ${ac.tailNumber}`, detail: action.map(r => r.item.title).join('; '), tail: ac.tailNumber, link: '/tech-log/safa' });
      }
    }
  }

  return out
    .filter(n => !dismissed.has(n.id))
    .sort((a, b) => RANK[a.severity] - RANK[b.severity] || (b.atUtc ?? '').localeCompare(a.atUtc ?? ''));
}
