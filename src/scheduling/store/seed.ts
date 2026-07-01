// Seed data: the real Scheduler Daily / Monthly / Quarterly checklists + the Domestic
// per-trip checklist, transcribed from docs/scheduling/foundation-scheduling-workspace-design.md
// (§1, "the nine source checklists") as editable template DATA. Nothing about checklist
// content lives in engine/store logic — this file is the seam the department will edit
// via a UI in a later slice (D9: templates are editable data, role-gated, versioned).
import type { ChecklistTemplate } from '../engine';
import type { SchedulingStore } from './types';
import { parseTemplate } from './validate';

const EFFECTIVE_FROM = '2026-01-01T00:00:00.000Z';

const SCHEDULER_DAILY: ChecklistTemplate = {
  id: 'scheduler-daily',
  name: 'Scheduler Daily Checklist',
  triggerType: 'recurring',
  scope: 'daily',
  version: 1,
  status: 'published',
  effectiveFrom: EFFECTIVE_FROM,
  taskDefinitions: [
    {
      id: 'notams-weather-intake',
      title: 'Pull NOTAMs & weather for tomorrow’s departures',
      ownerRole: 'scheduling',
      category: 'ops-intake',
      order: 1,
      dueRule: { kind: 'dayOfTimeLocal', time: '08:00' },
      requiresAck: false,
    },
    {
      id: 'fuel-luk',
      title: 'Update Lunken (LUK) fuel price in FuelerLinx',
      ownerRole: 'scheduling',
      category: 'fuel',
      order: 2,
      dueRule: { kind: 'weekday', day: 'MON' },
      requiresAck: false,
    },
    {
      id: 'currency-report-mon',
      title: 'Run pilot currency report',
      ownerRole: 'scheduling',
      category: 'crew',
      order: 3,
      dueRule: { kind: 'weekday', day: 'MON' },
      requiresAck: false,
    },
    {
      id: 'currency-report-thu',
      title: 'Run pilot currency report',
      ownerRole: 'scheduling',
      category: 'crew',
      order: 4,
      dueRule: { kind: 'weekday', day: 'THU' },
      requiresAck: false,
    },
    {
      id: 'trip-sheet-to-ea',
      title: 'Hand off trip sheet to Executive Assistant',
      ownerRole: 'scheduling',
      category: 'handoff',
      order: 5,
      dueRule: { kind: 'dayOfTimeLocal', time: '14:00' },
      requiresAck: true,
      handoffTarget: { kind: 'role', value: 'executive-assistant', channel: 'email' },
    },
    {
      id: 'brief',
      title: 'Send next-day crew brief',
      ownerRole: 'scheduling',
      category: 'crew',
      order: 6,
      dueRule: { kind: 'dayOfTimeLocal', time: '15:00' },
      requiresAck: true,
      escalation: {
        deadline: { kind: 'dayOfTimeLocal', time: '17:00' },
        notifyRole: 'scheduling',
        reason: 'Crew has not acknowledged the next-day brief',
      },
      handoffTarget: { kind: 'role', value: 'pilot', channel: 'teams' },
    },
  ],
};

const SCHEDULER_MONTHLY: ChecklistTemplate = {
  id: 'scheduler-monthly',
  name: 'Scheduler Monthly Checklist',
  triggerType: 'recurring',
  scope: 'monthly',
  version: 1,
  status: 'published',
  effectiveFrom: EFFECTIVE_FROM,
  taskDefinitions: [
    {
      id: 'flight-log-audit',
      title: 'Audit flight logs for the prior month',
      description: 'Gate item — downstream monthly reports depend on a clean flight-log audit.',
      ownerRole: 'scheduling',
      category: 'compliance',
      order: 1,
      dueRule: { kind: 'dayOfMonth', day: 5, when: 'onOrBefore' },
      requiresAck: true,
    },
    {
      id: 'imputed-income-report',
      title: 'Prepare and distribute imputed income report',
      ownerRole: 'scheduling',
      category: 'finance',
      order: 2,
      dueRule: { kind: 'dayOfMonth', day: 15, when: 'before' },
      requiresAck: true,
      handoffTarget: { kind: 'dept', value: 'payroll', channel: 'email' },
    },
    {
      id: 'chargeback-report',
      title: 'Prepare and distribute chargeback report',
      ownerRole: 'scheduling',
      category: 'finance',
      order: 3,
      dueRule: { kind: 'dayOfMonth', day: 25, when: 'around' },
      requiresAck: true,
      handoffTarget: { kind: 'dept', value: 'finance', channel: 'email' },
    },
    {
      id: 'pilot-logbook-distribution',
      title: 'Distribute pilot logbooks for the prior month',
      ownerRole: 'scheduling',
      category: 'crew',
      order: 4,
      dueRule: { kind: 'dayOfMonth', day: 5, when: 'onOrBefore' },
      requiresAck: false,
      handoffTarget: { kind: 'role', value: 'pilot', channel: 'email' },
    },
  ],
};

const SCHEDULER_QUARTERLY: ChecklistTemplate = {
  id: 'scheduler-quarterly',
  name: 'Scheduler Quarterly Checklist',
  triggerType: 'recurring',
  scope: 'quarterly',
  version: 1,
  status: 'published',
  effectiveFrom: EFFECTIVE_FROM,
  taskDefinitions: [
    {
      id: 'fos-access-audit',
      title: 'Audit FOS user access list',
      ownerRole: 'scheduling',
      category: 'compliance',
      order: 1,
      dueRule: { kind: 'quarterWeek', week: 1 },
      requiresAck: true,
    },
    {
      id: 'eu-ets-update',
      title: 'File EU ETS emissions update',
      description: 'Annual item, tracked on the quarterly board so it is never missed.',
      ownerRole: 'scheduling',
      category: 'compliance',
      order: 2,
      dueRule: { kind: 'annualDate', month: 3, day: 31 },
      requiresAck: true,
      handoffTarget: { kind: 'dept', value: 'compliance', channel: 'email' },
    },
    {
      id: 'sifl-rate-update',
      title: 'Update SIFL rates',
      ownerRole: 'scheduling',
      category: 'finance',
      order: 3,
      dueRule: { kind: 'quarterWeek', week: 1 },
      requiresAck: false,
    },
    {
      id: 'passport-review',
      title: 'Review crew & frequent-passenger passport expirations',
      ownerRole: 'scheduling',
      category: 'crew',
      order: 4,
      dueRule: { kind: 'quarterWeek', week: 2 },
      requiresAck: true,
    },
  ],
};

const DOMESTIC_PER_TRIP: ChecklistTemplate = {
  id: 'domestic-per-trip',
  name: 'Domestic Flight Checklist',
  triggerType: 'per_trip',
  scope: 'domestic',
  version: 1,
  status: 'published',
  effectiveFrom: EFFECTIVE_FROM,
  taskDefinitions: [
    {
      id: 'airport-suitability',
      title: 'Confirm airport suitability for tail/aircraft type',
      ownerRole: 'scheduling',
      category: 'ops',
      order: 1,
      dueRule: { kind: 'hoursBeforeEtd', hours: 24 },
      requiresAck: true,
    },
    {
      id: 'notam-tfr-check',
      title: 'Check NOTAMs/TFRs along the route',
      ownerRole: 'scheduling',
      category: 'ops',
      order: 2,
      dueRule: { kind: 'hoursBeforeEtd', hours: 12 },
      requiresAck: false,
    },
    {
      id: 'fuel-confirm',
      title: 'Confirm Jet-A fuel availability at destination',
      ownerRole: 'scheduling',
      category: 'fuel',
      order: 3,
      dueRule: { kind: 'hoursBeforeEtd', hours: 12 },
      requiresAck: false,
    },
    {
      id: 'seven-pax-g650-handling',
      title: 'Arrange special handling for 7+ pax G650ER departure',
      description: 'Focus item: 7-pax G650 loading requires additional ground handling coordination.',
      ownerRole: 'scheduling',
      category: 'ops',
      order: 4,
      dueRule: { kind: 'hoursBeforeEtd', hours: 24 },
      requiresAck: true,
      condition: {
        kind: 'allOf',
        conditions: [
          { kind: 'paxCountAtLeast', value: 7 },
          { kind: 'aircraftTypeEquals', value: 'G650ER' },
        ],
      },
      handoffTarget: { kind: 'role', value: 'pilot', channel: 'teams' },
    },
  ],
};

export const SEED_TEMPLATES: ChecklistTemplate[] = [
  SCHEDULER_DAILY,
  SCHEDULER_MONTHLY,
  SCHEDULER_QUARTERLY,
  DOMESTIC_PER_TRIP,
];

export async function seedTemplates(store: SchedulingStore): Promise<void> {
  for (const raw of SEED_TEMPLATES) {
    const t = parseTemplate(raw); // validate content before persisting
    await store.saveTemplate(t);
  }
}
