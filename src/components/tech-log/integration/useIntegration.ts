import { toast } from 'sonner';
import { useTechLog } from '../TechLogContext';
import { newId } from '../util/id';
import * as camp from './campClient';
import { odataPullLatestFlight, simulateWebhook, type WebhookEnvelope } from './myairopsClient';
import type { DefectStatus, IntegrationEvent, CampCorrelation } from '../types';
import { CAMP_ERROR } from './campTaxonomy';
import type { MelFlag } from './campTaxonomy';
import { reconcileDiscrepancies, type ReconcileResult } from './reconcile';
import { decidePushMode, discrepancyTypeFor, type PushIntent } from './pushMapping';
import { runWithSession } from './campSession';

export function useIntegration() {
  const { state, dispatch } = useTechLog();

  const logEvent = (system: IntegrationEvent['system'], op: string, outcome: IntegrationEvent['outcome'], summary: string) =>
    dispatch({ type: 'ADD_INTEGRATION_EVENT', payload: { id: newId('int'), system, op, outcome, summary, atUtc: new Date().toISOString() } });
  const setCorrelation = (c: CampCorrelation) => dispatch({ type: 'UPSERT_CAMP_CORRELATION', payload: c });

  /**
   * Push a defect/deferral to CAMP via IntegrateDiscrepancies (mock). Runs LogIn → call → LogOff.
   * `intent` maps the myGFO mutation onto a CAMP mode (CREATE→INSERT, CORRECT→EDIT, CLOSE→UPDATE/Closed).
   * For a superseding correction/closure, `supersedesEntityId` points at the parent whose CAMP ref is
   * carried forward — the ref lives only on the off-ledger correlation table (OQ9), never on the signed row.
   */
  function pushDiscrepancy(input: {
    entityType: 'DEFECT' | 'DEFERRAL';
    entityId: string;
    aircraftId: string;
    ata: string;
    description: string;
    restriction?: string;
    nextDue?: string;
    category?: MelFlag;
    technician?: string;
    intent?: PushIntent;          // CREATE (default) | CORRECT | CLOSE
    defectStatus?: DefectStatus;  // WATCHLISTED → DEFERRED-WATCHLIST discrepancyType
    supersedesEntityId?: string;  // parent entity whose CAMP ref is carried forward (CORRECT/CLOSE)
    riiItem?: boolean;            // RIIitem=Y on the CAMP discrepancy
    inspector?: string;           // RII inspector name carried to CAMP
  }): camp.CampResult<{ discrepancyId: string }> | undefined {
    const ac = state.aircraft.find(a => a.id === input.aircraftId);
    if (!ac) return;
    const intent = input.intent ?? 'CREATE';
    const parentRef = (input.supersedesEntityId
      ? state.campCorrelation.find(c => c.mygfoEntityId === input.supersedesEntityId)
      : state.campCorrelation.find(c => c.mygfoEntityId === input.entityId)
    )?.campDiscrepancyRef;
    const decision = decidePushMode(intent, parentRef);

    setCorrelation({ mygfoEntityId: input.entityId, entityType: input.entityType, pushState: 'PENDING' });
    camp.campLogin();
    logEvent('CAMP', 'LogIn', 'OK', `session opened (${camp.campMeta.env})`);
    try {
      const res = camp.integrateDiscrepancies(
        {
          serial: ac.serialNumber,
          mode: decision.mode,
          status: decision.status,
          discrepancyType: discrepancyTypeFor(input.entityType, input.defectStatus),
          melFlag: input.category,
          ata: input.ata,
          description: input.description,
          restriction: input.restriction,
          nextDue: input.nextDue,
          riiItem: input.riiItem ?? false,
          inspector: input.inspector,
          technician: input.technician,
          existingDiscrepancyId: decision.existingDiscrepancyId,
        },
        ac.serialNumber,
      );
      if (res.ok && res.data) {
        setCorrelation({ mygfoEntityId: input.entityId, entityType: input.entityType, campDiscrepancyRef: res.data.discrepancyId, pushState: 'PUSHED', lastPushedUtc: new Date().toISOString() });
        logEvent('CAMP', `IntegrateDiscrepancies (${decision.mode})`, 'OK', `${ac.tailNumber} ${input.entityType} → ${res.data.discrepancyId} [${decision.status}]`);
        toast.success(`Pushed to CAMP (sandbox) — ${decision.mode} discrepancy ${res.data.discrepancyId}`);
      } else {
        setCorrelation({ mygfoEntityId: input.entityId, entityType: input.entityType, pushState: 'FAILED', lastError: res.errorMsg });
        logEvent('CAMP', 'IntegrateDiscrepancies', 'ERROR', `${res.errorCode} — ${res.errorMsg}`);
        toast.error(`CAMP push failed: ${res.errorMsg}`);
      }
      return res;
    } finally {
      camp.campLogoff();
      logEvent('CAMP', 'LogOff', 'OK', 'session closed');
    }
  }

  /** Read-backs from CAMP (mock): latest times (minutes→hours), due list (≤3mo), aircraft state. */
  function refreshCampReads(aircraftId: string) {
    const ac = state.aircraft.find(a => a.id === aircraftId);
    if (!ac) return;
    camp.campLogin();
    try {
      const times = camp.getLatestAircraftTimes(ac.serialNumber, ac.airframeTotalHours, ac.airframeTotalCycles);
      if (times.ok && times.data) {
        logEvent('CAMP', 'GetLatestAircraftTimes', 'OK', `${ac.tailNumber}: ${times.data.totalTimeMinutes} min (= ${camp.campMeta.minutesToHours(times.data.totalTimeMinutes)} h) / ${times.data.cycles} cyc`);
      }
      const state2 = camp.getAircraftState(ac.serialNumber, 'Green');
      if (state2.ok && state2.data) logEvent('CAMP', 'GetAircraftState', 'OK', `${ac.tailNumber}: ${state2.data.state}`);
      toast.success(`CAMP reads refreshed for ${ac.tailNumber}`);
    } finally {
      camp.campLogoff();
    }
  }

  /** Refresh the airworthiness read-views (due list + component times + AD/SB) and log the reads. */
  function refreshAirworthiness(aircraftId: string) {
    const ac = state.aircraft.find(a => a.id === aircraftId);
    if (!ac) return;
    camp.campLogin();
    logEvent('CAMP', 'LogIn', 'OK', `session opened (${camp.campMeta.env})`);
    try {
      const due = camp.campForecast(ac.serialNumber, { hours: ac.airframeTotalHours, cycles: ac.airframeTotalCycles });
      logEvent('CAMP', 'GetAircraftDueList', 'OK', `${ac.tailNumber}: ${due.length} item(s) within 3 months`);
      const t = camp.campComponentTimes(ac.serialNumber, ac.airframeTotalHours, ac.airframeTotalCycles);
      logEvent('CAMP', 'GetLatestAircraftTimes', 'OK', `${ac.tailNumber}: AF ${t.airframe.hours}h · E1 ${t.eng1.hours}h · E2 ${t.eng2.hours}h · APU ${t.apu.hours}h`);
      logEvent('CAMP', 'GetAdSbStatus (TBC fn)', 'OK', `${ac.tailNumber}: ${camp.campAdSb(ac.serialNumber).filter(x => x.status === 'OPEN').length} open AD/SB`);
      toast.success(`Airworthiness refreshed from CAMP (sandbox) for ${ac.tailNumber}`);
    } finally {
      camp.campLogoff();
      logEvent('CAMP', 'LogOff', 'OK', 'session closed');
    }
  }

  /** myairops OData prefill (pull-only, faked). */
  function prefillFlight(tailNumber: string, dateUtc: string) {
    const p = odataPullLatestFlight(tailNumber, dateUtc);
    logEvent('MYAIROPS', 'OData pull', 'OK', `prefilled ${tailNumber} movement ${p.origin}→${p.destination}`);
    return p;
  }

  /** List open CAMP work orders for an aircraft (mock listOpenWorkOrders). */
  function listWorkOrders(aircraftId: string) {
    const ac = state.aircraft.find(a => a.id === aircraftId);
    if (!ac) return [];
    camp.campLogin();
    try {
      const res = camp.listOpenWorkOrders(ac.serialNumber);
      logEvent('CAMP', 'ListOpenWorkOrders', res.ok ? 'OK' : 'ERROR', `${ac.tailNumber}: ${res.data?.length ?? 0} open WO(s)`);
      return res.data ?? [];
    } finally {
      camp.campLogoff();
    }
  }

  /** Pull a CAMP work order's task-card detail (mock GetWODetails). Runs LogIn → call → LogOff. */
  function pullWorkOrder(aircraftId: string, woNumber: string): camp.CampWoDetails | undefined {
    const ac = state.aircraft.find(a => a.id === aircraftId);
    if (!ac) return;
    camp.campLogin();
    logEvent('CAMP', 'LogIn', 'OK', `session opened (${camp.campMeta.env})`);
    try {
      const res = camp.getWODetails(ac.serialNumber, woNumber);
      if (res.ok && res.data) {
        logEvent('CAMP', 'GetWODetails', 'OK', `${ac.tailNumber} ${woNumber}: ${res.data.lines.length} line(s)`);
        return res.data;
      }
      logEvent('CAMP', 'GetWODetails', 'ERROR', `${res.errorCode} — ${res.errorMsg}`);
      return undefined;
    } finally {
      camp.campLogoff();
      logEvent('CAMP', 'LogOff', 'OK', 'session closed');
    }
  }

  /** Read CAMP's discrepancy list (GetAircraftDiscrepancies) and reconcile vs the off-ledger correlation table. */
  function reconcile(aircraftId: string): (ReconcileResult & { tail: string }) | undefined {
    const ac = state.aircraft.find(a => a.id === aircraftId);
    if (!ac) return;
    const entityIds = new Set<string>([
      ...state.defects.filter(d => d.aircraftId === aircraftId).map(d => d.id),
      ...state.deferrals.filter(d => d.aircraftId === aircraftId).map(d => d.id),
    ]);
    const correlations = state.campCorrelation.filter(c => entityIds.has(c.mygfoEntityId));
    const pushedRefs = correlations.filter(c => c.pushState === 'PUSHED' && c.campDiscrepancyRef).map(c => c.campDiscrepancyRef as string);
    camp.campLogin();
    logEvent('CAMP', 'LogIn', 'OK', `session opened (${camp.campMeta.env})`);
    try {
      const res = camp.getAircraftDiscrepancies(ac.serialNumber, pushedRefs);
      const result = reconcileDiscrepancies(res.data ?? [], correlations);
      logEvent('CAMP', 'GetAircraftDiscrepancies', res.ok ? 'OK' : 'ERROR',
        `${ac.tailNumber}: ${result.matched.length} matched · ${result.campOnly.length} CAMP-only · ${result.mygfoOnly.length} myGFO-only`);
      return { ...result, tail: ac.tailNumber };
    } finally {
      camp.campLogoff();
      logEvent('CAMP', 'LogOff', 'OK', 'session closed');
    }
  }

  /**
   * Utilization push — intentionally BLOCKED (Open Question 1: CAMP op undocumented).
   * Validates the guards + prepares the minutes payload, logs a BLOCKED event, and NEVER transmits.
   */
  function pushUtilization(aircraftId: string): camp.CampResult<camp.UtilizationPushResult> | undefined {
    const ac = state.aircraft.find(a => a.id === aircraftId);
    if (!ac) return;
    const res = camp.pushUtilization_TODO_UNDOCUMENTED(
      // landings are not yet tracked on Aircraft (Phase-2+); 0 is illustrative and never transmitted.
      { serial: ac.serialNumber, airframeHours: ac.airframeTotalHours, cycles: ac.airframeTotalCycles, landings: 0 },
      ac.serialNumber,
    );
    logEvent('CAMP', 'PushUtilization (OQ1: fn undocumented)', 'BLOCKED', `${ac.tailNumber}: blocked — prepared ${res.data?.preparedPayload?.totalTimeMinutes ?? '—'} min, not transmitted`);
    toast.warning(`Utilization push blocked — CAMP function undocumented (OQ1). Nothing transmitted for ${ac.tailNumber}.`);
    return res;
  }

  /** Run a CAMP call under the documented session discipline (re-login once on SESSION_NOT_VALID; stop on L100/L102). */
  function callWithSession<T>(call: () => camp.CampResult<T>, opLabel: string): camp.CampResult<T> | undefined {
    const outcome = runWithSession({ login: camp.campLogin, call, logoff: camp.campLogoff });
    if (outcome.kind === 'FATAL') { logEvent('CAMP', opLabel, 'ERROR', `${outcome.errorCode} — ${outcome.alert}`); toast.error(outcome.alert); return undefined; }
    if (outcome.kind === 'TRANSIENT') { logEvent('CAMP', opLabel, 'ERROR', `${outcome.errorCode} — ${outcome.alert}`); toast.warning(outcome.alert); return undefined; }
    if (outcome.reLoggedIn) logEvent('CAMP', 'LogIn (retry)', 'OK', 'session re-established after SESSION_NOT_VALID; call retried');
    return outcome.data;
  }

  /** Demo: inject a CAMP error and exercise the taxonomy handling via callWithSession. Watch the Integration log. */
  function demoErrorHandling(aircraftId: string, kind: 'session' | 'lockout' | 'maintenance') {
    const ac = state.aircraft.find(a => a.id === aircraftId);
    if (!ac) return;
    if (kind === 'session') camp.injectNextCallError(CAMP_ERROR.SESSION_NOT_VALID.code, CAMP_ERROR.SESSION_NOT_VALID.msg);
    else if (kind === 'lockout') camp.injectNextLoginError(CAMP_ERROR.LOGIN_INVALID.code, CAMP_ERROR.LOGIN_INVALID.msg);
    else camp.injectNextLoginError(CAMP_ERROR.APP_MAINTENANCE.code, CAMP_ERROR.APP_MAINTENANCE.msg);
    const res = callWithSession(() => camp.getAircraftState(ac.serialNumber, 'Green'), `GetAircraftState [demo:${kind}]`);
    if (res?.ok) toast.success(`${ac.tailNumber}: recovered — CAMP read succeeded after one re-login`);
  }

  function campEnv() { return camp.getCampEnv(); }
  /** Human-gated sandbox→production promotion (typed confirmation). Demo only — no real prod endpoint. */
  function promoteToProduction(confirmText: string): boolean {
    const okp = camp.promoteToProduction(confirmText);
    if (okp) { logEvent('CAMP', 'PromoteToProduction', 'OK', 'env → PRODUCTION (human-gated; demo only — no real prod endpoint)'); toast.warning('CAMP promoted to PRODUCTION (simulated) — pushes now target the production contract.'); }
    else toast.error(`Promotion refused — type "${camp.PROMOTION_CONFIRM_PHRASE}" exactly to confirm.`);
    return okp;
  }
  function revertToSandbox() { camp.revertToSandbox(); logEvent('CAMP', 'RevertToSandbox', 'OK', 'env → sandbox'); toast.success('Reverted to CAMP sandbox.'); }

  /** Receive a (simulated) myairops webhook: verify HMAC / replay window / idempotency, then apply pull-only. Never writes back. */
  function receiveWebhook(eventType: Parameters<typeof simulateWebhook>[0], opts?: Parameters<typeof simulateWebhook>[1]): WebhookEnvelope {
    const env = simulateWebhook(eventType, opts);
    const v = env.verification;
    if (!v.signatureValid) { logEvent('MYAIROPS', 'Webhook', 'ERROR', `${eventType} ${env.event.id}: HMAC signature INVALID — rejected`); toast.error('Webhook rejected — bad HMAC signature.'); }
    else if (!v.timestampWithinWindow) { logEvent('MYAIROPS', 'Webhook', 'ERROR', `${eventType} ${env.event.id}: timestamp outside replay window — rejected`); toast.error('Webhook rejected — replay window exceeded.'); }
    else if (v.duplicate) { logEvent('MYAIROPS', 'Webhook', 'EMPTY', `${eventType} ${env.event.id}: duplicate CloudEvents id — idempotently skipped`); toast.info('Duplicate webhook — idempotently skipped.'); }
    else { logEvent('MYAIROPS', 'Webhook', 'OK', `${eventType} ${env.event.id}: verified + applied (pull-only)`); toast.success(`Webhook applied — ${String(eventType).split('.').pop()}`); }
    return env;
  }

  // Airworthiness read-views (documented CAMP fns GetAircraftDueList / GetLatestAircraftTimes per-profile;
  // the AD/SB read is UNDOCUMENTED — Open Question). Delegated here so pages don't import campClient directly,
  // keeping the live-client swap boundary + OQ labelling centralized in this hook.
  function readForecast(aircraftId: string) {
    const ac = state.aircraft.find(a => a.id === aircraftId);
    return ac ? camp.campForecast(ac.serialNumber, { hours: ac.airframeTotalHours, cycles: ac.airframeTotalCycles }) : [];
  }
  function readComponentTimes(aircraftId: string) {
    const ac = state.aircraft.find(a => a.id === aircraftId);
    return ac ? camp.campComponentTimes(ac.serialNumber, ac.airframeTotalHours, ac.airframeTotalCycles) : null;
  }
  function readAdSb(aircraftId: string) {
    const ac = state.aircraft.find(a => a.id === aircraftId);
    return { items: ac ? camp.campAdSb(ac.serialNumber) : [], unconfirmed: true, openQuestion: camp.CAMP_ADSB_OPEN_QUESTION };
  }
  function readClosedWorkOrders(aircraftId: string) {
    const ac = state.aircraft.find(a => a.id === aircraftId);
    return ac ? (camp.getClosedWorkOrders(ac.serialNumber).data ?? []) : [];
  }

  return { pushDiscrepancy, refreshCampReads, refreshAirworthiness, prefillFlight, listWorkOrders, pullWorkOrder, pushUtilization, reconcile, demoErrorHandling, campEnv, promoteToProduction, revertToSandbox, receiveWebhook, readForecast, readComponentTimes, readAdSb, readClosedWorkOrders };
}
