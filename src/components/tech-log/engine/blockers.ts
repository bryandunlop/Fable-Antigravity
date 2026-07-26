import type { Defect, Deferral, WorkCard, RecurringCheck, TechLogState, Serviceability } from '../types';
import { currentRows } from './supersede';
import { isDeferralExpired } from './pl25';
import { projectCheck } from './recurringChecks';
import { deriveServiceability } from './serviceability';

/**
 * One list of "what stands between this tail and dispatch", each row carrying the dispositions that
 * would clear it.
 *
 * This exists because the serviceability projection answers *which rule* grounds an aircraft
 * (§14.2 rules 1-5) but not *which object* to act on, and the aircraft page previously listed only
 * open defects and work cards — so a tail grounded by an expired deferral (rule 2), a pending
 * (M)/placard release, or an expired recurring check (rule 3) showed an empty list under a RED chip.
 *
 * Derivation only: this reads the same ledger rows as deriveServiceability and never decides
 * status itself — `status`/`governingRule` are taken straight from the projection so the two can
 * never disagree. Offering an action here is a navigation affordance, not an authorization: the
 * panels behind each action keep their own gates (canDeferDefect, canSignPlacardDischarge,
 * canDischargeGating, extension eligibility).
 */

export type BlockerKind =
  | 'DEFECT_OPEN'
  | 'DEFERRAL_PENDING_PLACARD'
  | 'DEFERRAL_EXPIRED'
  | 'CHECK_EXPIRED';

export type RestrictionKind = 'DEFERRAL_ACTIVE';
export type InProgressKind = 'WORK_CARD_OPEN';

/** A disposition the UI may offer on a row. Presentation intent — never an authorization result. */
export type BlockerAction =
  | 'DEFER'          // raise an MEL deferral against the defect
  | 'RAISE_CARD'     // open a work card and go do the work
  | 'SIGN_RELEASE'   // sign the CRS now (work already done)
  | 'SIGN_GATING'    // sign the (M)/placard release that flips PENDING_PLACARD → ACTIVE
  | 'ACCOMPLISH'     // accomplish & sign a recurring check
  | 'EXTEND'         // extend a Cat B/C deferral (once)
  | 'OPEN_CARD';     // navigate to an existing work card

export interface BlockerRow {
  id: string;
  kind: BlockerKind | RestrictionKind | InProgressKind;
  title: string;
  detail?: string;
  /** Plain-language statement of the condition that removes this row. */
  clearsWhen: string;
  /** Raw repair-due instant. Formatting is the caller's job — only the component knows the D24
   *  display zone, and a regulatory time must never be rendered as a bare UTC ISO string. */
  dueUtc?: string;
  governingTimezone?: string;
  actions: BlockerAction[];
  /** True for the single row matching the serviceability rule currently governing the tail. */
  governing: boolean;
  defect?: Defect;
  deferral?: Deferral;
  check?: RecurringCheck;
  workCard?: WorkCard;
}

export interface BlockerBoard {
  status: Serviceability;
  governingRule: number;
  /** Conditions holding the aircraft RED. */
  blockers: BlockerRow[];
  /** In-force restrictions (AMBER) — dispatchable, but constrained. */
  restrictions: BlockerRow[];
  /** Work already under way. Never a grounding cause on its own. */
  inProgress: BlockerRow[];
}

type Slice = Pick<TechLogState, 'aircraft' | 'defects' | 'deferrals'> &
  Partial<Pick<TechLogState, 'workCards' | 'recurringChecks' | 'recurringAccomplishments' | 'melItems'>>;

export function buildBlockers(aircraftId: string, state: Slice, asOfUtc: string): BlockerBoard {
  const ac = state.aircraft.find(a => a.id === aircraftId);
  const airframe = { hours: ac?.airframeTotalHours ?? 0, cycles: ac?.airframeTotalCycles ?? 0 };
  const sv = deriveServiceability(aircraftId, state, asOfUtc);

  /** "MEL 32-04-01 Cat D — Tire Pressure Monitoring System" — a tech recognises the item, not "Cat C". */
  const melLabel = (df: Deferral) => {
    const m = (state.melItems ?? []).find(x => x.id === df.melItemId);
    const ref = m?.subItemNumber ? `MEL ${m.subItemNumber}` : 'MEL item';
    const cat = df.category ? ` Cat ${df.category}` : '';
    return m?.title ? `${ref}${cat} — ${m.title}` : `${ref}${cat}`;
  };

  const defects = currentRows(state.defects).filter(d => d.aircraftId === aircraftId);
  const deferrals = currentRows(state.deferrals).filter(d => d.aircraftId === aircraftId);
  const workCards = (state.workCards ?? []).filter(w => w.aircraftId === aircraftId);

  const expiredDeferral = (d: Deferral) =>
    (d.status === 'ACTIVE' || d.status === 'PENDING_PLACARD') && isDeferralExpired(d, asOfUtc, airframe);

  const blockers: BlockerRow[] = [];
  const restrictions: BlockerRow[] = [];
  const inProgress: BlockerRow[] = [];

  // ── rule 1: open airworthiness defect with no ACTIVE deferral covering it ──
  const coveredByActive = (defectId: string) =>
    deferrals.some(df => df.defectId === defectId && df.status === 'ACTIVE' && !expiredDeferral(df));

  for (const d of defects) {
    const open = (d.airworthinessAffecting === true || d.airworthinessAffecting === null) &&
      (d.status === 'OPEN' || d.status === 'DEFERRED' || d.status === 'WATCHLISTED') && !d.clearedTsUtc;
    if (!open || coveredByActive(d.id)) continue;
    // Deferring is impossible on a provisional aircraft (its D195 MEL is pending FSDO approval),
    // so don't advertise the action there — the panel would reject it anyway.
    const actions: BlockerAction[] = ac?.isProvisional
      ? ['RAISE_CARD', 'SIGN_RELEASE']
      : ['DEFER', 'RAISE_CARD', 'SIGN_RELEASE'];
    blockers.push({
      id: d.id, kind: 'DEFECT_OPEN', defect: d,
      title: `ATA ${d.ataChapter} — ${d.description}`,
      detail: `${d.severity} · reported via ${d.source}`,
      clearsWhen: ac?.isProvisional
        ? 'Rectified and released to service (deferrals are blocked on this tail).'
        : 'Rectified and released to service, or deferred under an MEL item.',
      governing: sv.governingRule === 1 && sv.drivingDefectId === d.id,
      actions,
    });
  }

  // ── deferrals: expired (rule 2), pending its gating release, or in force (rule 4) ──
  for (const df of deferrals) {
    if (df.status === 'CLEARED') continue;
    const label = melLabel(df);

    if (df.status === 'EXPIRED' || expiredDeferral(df)) {
      blockers.push({
        id: df.id, kind: 'DEFERRAL_EXPIRED', deferral: df,
        title: `Deferral overdue — ${label}`,
        dueUtc: df.repairDueDateUtc,
        governingTimezone: df.governingTimezone,
        detail: 'The repair interval has run out. An expired deferral is terminal — it cannot be discharged late.',
        clearsWhen: 'The underlying defect is rectified and released to service.',
        governing: sv.governingRule === 2 && sv.drivingDeferralId === df.id,
        actions: ['RAISE_CARD', 'SIGN_RELEASE'],
      });
      continue;
    }
    if (df.status === 'PENDING_PLACARD') {
      const needs = [df.mProcedureRequired ? '(M) procedure' : null, df.placardRequired ? 'placard' : null]
        .filter(Boolean).join(' + ');
      blockers.push({
        id: df.id, kind: 'DEFERRAL_PENDING_PLACARD', deferral: df,
        title: `Awaiting its ${needs || '(M)/placard'} release — ${label}`,
        detail: 'The deferral decision is signed, but the aircraft stays grounded until the gating release is signed.',
        clearsWhen: 'The (M)/placard maintenance release is signed — the deferral then goes ACTIVE.',
        governing: sv.governingRule === 1 && sv.drivingDefectId === df.defectId,
        actions: ['SIGN_GATING'],
      });
      continue;
    }
    if (df.status === 'ACTIVE') {
      const extendable = df.category !== 'A' && df.category !== 'D' && !df.extensionUsed;
      restrictions.push({
        id: df.id, kind: 'DEFERRAL_ACTIVE', deferral: df,
        title: label,
        dueUtc: df.repairDueDateUtc,
        governingTimezone: df.governingTimezone,
        clearsWhen: 'The deferred defect is rectified and released to service.',
        governing: sv.governingRule === 4 && sv.drivingDeferralId === df.id,
        actions: extendable ? ['RAISE_CARD', 'EXTEND'] : ['RAISE_CARD'],
      });
    }
  }

  // ── rule 3: expired / never-accomplished dispatch-gating recurring checks ──
  for (const c of (state.recurringChecks ?? []).filter(c => c.aircraftId === aircraftId && c.active !== false)) {
    const p = projectCheck(c, state.recurringAccomplishments ?? [], asOfUtc, airframe);
    if (p.state !== 'EXPIRED' && p.state !== 'NEVER_DONE') continue;
    blockers.push({
      id: c.id, kind: 'CHECK_EXPIRED', check: c,
      title: `${c.name} — ${p.state === 'NEVER_DONE' ? 'never accomplished' : 'expired'}`,
      detail: `every ${c.intervalValue} ${c.intervalUnit.replace('_', ' ').toLowerCase()}`,
      clearsWhen: 'The check is re-accomplished and signed.',
      governing: sv.governingRule === 3 && sv.drivingCheckId === c.id,
      actions: ['ACCOMPLISH'],
    });
  }

  // ── work already under way ──
  for (const w of workCards.filter(w => w.status !== 'COMPLETED')) {
    const done = w.steps.filter(s => s.done).length;
    inProgress.push({
      id: w.id, kind: 'WORK_CARD_OPEN', workCard: w,
      title: `${w.cardNumber ?? w.woNumber ?? w.id} — ${w.title}`,
      detail: `${w.status} · steps ${done}/${w.steps.length}`,
      clearsWhen: 'All steps are completed and the card is signed off.',
      governing: false,
      actions: ['OPEN_CARD'],
    });
  }

  // Governing row first — it is the answer to "why is this tail red right now".
  const byGoverning = (a: BlockerRow, b: BlockerRow) => Number(b.governing) - Number(a.governing);
  blockers.sort(byGoverning);
  restrictions.sort(byGoverning);

  return { status: sv.status, governingRule: sv.governingRule, blockers, restrictions, inProgress };
}

/** One sentence naming the condition that governs the tail right now. */
export function governingSentence(board: BlockerBoard, tailNumber: string): string {
  const g = [...board.blockers, ...board.restrictions].find(r => r.governing);
  if (board.status === 'GREEN') return `${tailNumber} is serviceable — no open defects and no active deferrals.`;
  if (!g) {
    return board.status === 'RED'
      ? `${tailNumber} is grounded.`
      : `${tailNumber} is dispatchable under restriction.`;
  }
  return board.status === 'RED'
    ? `${tailNumber} is grounded because of ${g.title}`
    : `${tailNumber} is dispatchable under restriction: ${g.title}`;
}
