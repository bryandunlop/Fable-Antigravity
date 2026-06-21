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

  /** myairops OData prefill (pull-only, faked). */
  function prefillFlight(tailNumber: string, dateUtc: string) {
    const p = odataPullLatestFlight(tailNumber, dateUtc);
    logEvent('MYAIROPS', 'OData pull', 'OK', `prefilled ${tailNumber} movement ${p.origin}→${p.destination}`);
    return p;
  }

  return { pushDiscrepancy, refreshCampReads, prefillFlight };
}
