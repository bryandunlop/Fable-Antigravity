import { toast } from 'sonner';
import { useTechLog } from '../TechLogContext';
import { newId } from '../util/id';
import * as camp from './campClient';
import { odataPullLatestFlight } from './myairopsClient';
import type { IntegrationEvent, CampCorrelation } from '../types';
import type { DiscrepancyType, MelFlag } from './campTaxonomy';

export function useIntegration() {
  const { state, dispatch } = useTechLog();

  const logEvent = (system: IntegrationEvent['system'], op: string, outcome: IntegrationEvent['outcome'], summary: string) =>
    dispatch({ type: 'ADD_INTEGRATION_EVENT', payload: { id: newId('int'), system, op, outcome, summary, atUtc: new Date().toISOString() } });
  const setCorrelation = (c: CampCorrelation) => dispatch({ type: 'UPSERT_CAMP_CORRELATION', payload: c });

  /** Push a defect/deferral to CAMP via IntegrateDiscrepancies (mock). Runs LogIn → call → LogOff. */
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
  }): camp.CampResult<{ discrepancyId: string }> | undefined {
    const ac = state.aircraft.find(a => a.id === input.aircraftId);
    if (!ac) return;
    const existing = state.campCorrelation.find(c => c.mygfoEntityId === input.entityId)?.campDiscrepancyRef;

    setCorrelation({ mygfoEntityId: input.entityId, entityType: input.entityType, pushState: 'PENDING' });
    camp.campLogin();
    logEvent('CAMP', 'LogIn', 'OK', `session opened (${camp.campMeta.env})`);
    try {
      const res = camp.integrateDiscrepancies(
        {
          serial: ac.serialNumber,
          mode: existing ? 'EDIT' : 'INSERT',
          discrepancyType: (input.entityType === 'DEFERRAL' ? 'MEL' : 'NON-DEFERRED') as DiscrepancyType,
          melFlag: input.category,
          ata: input.ata,
          description: input.description,
          restriction: input.restriction,
          nextDue: input.nextDue,
          riiItem: false,
          technician: input.technician,
          existingDiscrepancyId: existing,
        },
        ac.serialNumber,
      );
      if (res.ok && res.data) {
        setCorrelation({ mygfoEntityId: input.entityId, entityType: input.entityType, campDiscrepancyRef: res.data.discrepancyId, pushState: 'PUSHED', lastPushedUtc: new Date().toISOString() });
        logEvent('CAMP', `IntegrateDiscrepancies (${existing ? 'EDIT' : 'INSERT'})`, 'OK', `${ac.tailNumber} ${input.entityType} → ${res.data.discrepancyId}`);
        toast.success(`Pushed to CAMP (sandbox) — discrepancy ${res.data.discrepancyId}`);
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

  return { pushDiscrepancy, refreshCampReads, refreshAirworthiness, prefillFlight, listWorkOrders, pullWorkOrder, pushUtilization };
}
