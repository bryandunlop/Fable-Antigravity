import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { requiredApprovals, type ApproverRole } from '../../airport/company/approvalRouting';
import type { FlagRule } from '../../airport/flags/rules';
import type {
  AirportReviewAcknowledgement,
  CompanyAirportPageContent,
  CompanyAirportPageVersion,
  ConfirmFieldRequest,
  FieldConfirmation,
  SaveFieldRequest,
  SaveFieldResult,
} from '../../airport/company/pageStore';
import { confirmationStates, type FieldConfirmationState } from '../../airport/company/confirmations';
import { buildOfficerWorklist, type OfficerWorklist } from '../../airport/company/worklist';
import { PersistentCompanyAirportPageStore } from '../../airport/company/persistence';
import {
  ProposalWorkflow,
  type CompanyAirportProposal,
  type DecideRequest,
  type SubmitRequest,
} from '../../airport/company/proposals';
import { defaultStorage, memoryStorage, type StorageLike } from '../../notifications/storage';

export const PROPOSALS_KEY = 'airport-company-proposals';
export const RULES_KEY = 'airport-flag-rules';

function loadRules(storage: StorageLike): FlagRule[] {
  const raw = storage.getItem(RULES_KEY);
  if (!raw) return DEFAULT_RULES;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FlagRule[]) : DEFAULT_RULES;
  } catch {
    return DEFAULT_RULES;
  }
}

/**
 * Seed rules, so the builder opens with worked examples rather than a blank page.
 * They are ordinary rules — editable and deletable like any other, not special.
 */
const DEFAULT_RULES: FlagRule[] = [
  {
    id: 'seed-short-runway',
    label: 'Short runway',
    severity: 'caution',
    appliesTo: [],
    showOnPilotWorkspace: true,
    guidance: 'Check performance for the day. Runway is short for this fleet.',
    group: { combine: 'AND', conditions: [{ field: 'longestRunwayFt', operator: 'lt', value: 6000 }] },
  },
  {
    id: 'seed-no-declared-distances',
    label: 'No declared distances published',
    severity: 'info',
    appliesTo: [],
    showOnPilotWorkspace: true,
    guidance:
      'The FAA publishes no TORA/TODA/ASDA/LDA here. Do not substitute runway length.',
    group: {
      combine: 'AND',
      conditions: [{ field: 'hasDeclaredDistances', operator: 'isFalse' }],
    },
  },
  {
    id: 'seed-high-elevation',
    label: 'High elevation',
    severity: 'caution',
    appliesTo: [],
    showOnPilotWorkspace: true,
    guidance: 'Density altitude will bite. Recheck takeoff and climb performance.',
    group: { combine: 'AND', conditions: [{ field: 'elevationFt', operator: 'gt', value: 5000 }] },
  },
  {
    id: 'seed-untowered',
    label: 'Untowered',
    severity: 'info',
    appliesTo: [],
    showOnPilotWorkspace: true,
    group: { combine: 'AND', conditions: [{ field: 'towerTypeCode', operator: 'isEmpty' }] },
  },
];

function loadProposals(storage: StorageLike): CompanyAirportProposal[] {
  const raw = storage.getItem(PROPOSALS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CompanyAirportProposal[]) : [];
  } catch {
    return [];
  }
}

/**
 * Holds the company-page store and the proposal workflow for the app (D46, D47).
 *
 * Deliberately thin: every rule lives in the tested engine underneath, and this
 * layer only owns React wiring and a revision counter so mutations re-render.
 * The store persists synchronously, so there is nothing to flush on unmount.
 */

interface CompanyAirportApi {
  getLatest(icao: string): CompanyAirportPageVersion | null;
  submit(request: SubmitRequest): CompanyAirportProposal;
  decide(request: DecideRequest): CompanyAirportProposal;
  publish(proposalId: string, publishedBy: string): CompanyAirportPageVersion;
  awaiting(role: ApproverRole): CompanyAirportProposal[];
  readyToPublish(): CompanyAirportProposal[];
  forAirport(icao: string): CompanyAirportProposal[];
  approvalsFor(changedFields: string[]): ApproverRole[];
  rules(): FlagRule[];
  saveRule(rule: FlagRule): void;
  deleteRule(ruleId: string): void;
  /** Record that a field was checked and is still true (D54). */
  confirm(request: ConfirmFieldRequest): FieldConfirmation;
  /**
   * Write one station-support field (D96). Publishes and confirms in one act,
   * with no approver in the path — see SUPPORT_FIELDS for why that is safe.
   */
  saveField(request: SaveFieldRequest): SaveFieldResult;
  /** Every published version for an airport, oldest first — the change record. */
  versionsFor(icao: string): CompanyAirportPageVersion[];
  /** Every explicit confirmation for an airport, for the change record's notes. */
  confirmationsFor(icao: string): FieldConfirmation[];
  /** Per-field confirmation state for an airport, derived — never stored. */
  confirmationStates(icao: string, todayIso?: string): FieldConfirmationState[];
  /** Record that a crew READ the current version. A read receipt, not a confirmation (D47). */
  acknowledge(icao: string, crewOid: string, nasrCycleEffDate: string | null): AirportReviewAcknowledgement;
  acknowledgements(icao: string): AirportReviewAcknowledgement[];
  worklist(role: ApproverRole, todayIso?: string): OfficerWorklist;
}

const CompanyAirportContext = createContext<CompanyAirportApi | null>(null);

let idCounter = 0;

export function CompanyAirportProvider({ children }: { children: React.ReactNode }) {
  const [revision, setRevision] = useState(0);
  const bump = useCallback(() => setRevision((n) => n + 1), []);

  const engine = useRef<{
    pages: PersistentCompanyAirportPageStore;
    workflow: ProposalWorkflow;
    storage: StorageLike;
    rules: FlagRule[];
  } | null>(null);
  if (!engine.current) {
    const clock = {
      now: () => new Date().toISOString(),
      nextId: () =>
        `cap-${Date.now().toString(36)}-${(idCounter += 1).toString(36)}`,
    };
    const storage = defaultStorage() ?? memoryStorage();
    const pages = new PersistentCompanyAirportPageStore(storage, clock);
    engine.current = {
      pages,
      workflow: new ProposalWorkflow(pages, clock, loadProposals(storage)),
      storage,
      rules: loadRules(storage),
    };
  }

  /** Persist the in-flight queue and the rule set, then re-render. Pages persist themselves. */
  const commit = useCallback(() => {
    const { workflow, storage, rules } = engine.current!;
    try {
      storage.setItem(PROPOSALS_KEY, JSON.stringify(workflow.snapshot()));
      storage.setItem(RULES_KEY, JSON.stringify(rules));
    } catch {
      /* quota or private browsing — the session is still correct in memory */
    }
    bump();
  }, [bump]);

  const api = useMemo<CompanyAirportApi>(() => {
    const { pages, workflow } = engine.current!;
    return {
      getLatest: (icao) => pages.getLatest(icao),
      submit: (request) => {
        const proposal = workflow.submit(request);
        commit();
        return proposal;
      },
      decide: (request) => {
        const proposal = workflow.decide(request);
        commit();
        return proposal;
      },
      publish: (proposalId, publishedBy) => {
        const version = workflow.publish(proposalId, publishedBy);
        commit();
        return version;
      },
      saveField: (request) => {
        const result = pages.saveField(request);
        // The store persists itself; this is only to re-render every reader.
        commit();
        return result;
      },
      versionsFor: (icao) => pages.versionsFor(icao),
      confirmationsFor: (icao) => pages.confirmationsFor(icao),
      awaiting: (role) => workflow.awaiting(role),
      readyToPublish: () => workflow.readyToPublish(),
      forAirport: (icao) => workflow.forAirport(icao),
      approvalsFor: (changedFields) => requiredApprovals(changedFields),
      rules: () => engine.current!.rules,
      saveRule: (rule) => {
        const current = engine.current!.rules;
        const index = current.findIndex((r) => r.id === rule.id);
        engine.current!.rules =
          index >= 0
            ? current.map((r) => (r.id === rule.id ? rule : r))
            : [...current, rule];
        commit();
      },
      deleteRule: (ruleId) => {
        engine.current!.rules = engine.current!.rules.filter((r) => r.id !== ruleId);
        commit();
      },
      confirm: (request) => {
        const confirmation = pages.confirm(request);
        // The store persisted it synchronously; commit() is here only to bump
        // the revision so the card and the worklist re-render.
        commit();
        return confirmation;
      },
      confirmationStates: (icao, todayIso) =>
        confirmationStates(pages.versionsFor(icao), pages.confirmationsFor(icao), todayIso),
      acknowledge: (icao, crewOid, nasrCycleEffDate) => {
        const acknowledgement = pages.acknowledge({ icao, crewOid, nasrCycleEffDate });
        commit();
        return acknowledgement;
      },
      acknowledgements: (icao) => pages.acknowledgementsFor(icao),
      worklist: (role, todayIso) => buildOfficerWorklist(pages, workflow, role, { todayIso }),
    };
    // `revision` IS a real dependency, despite not being read here.
    //
    // The provider's `children` is a stable element, so a state change in this
    // component does not by itself re-render the subtree — React bails out. What
    // reaches a consumer is a change in the CONTEXT VALUE's identity. Memoising
    // on [bump] alone produced a value that never changed, so approving a
    // proposal mutated the store and updated nothing on screen. Found by
    // clicking Approve in the browser; no unit test would have caught it.
  }, [commit, revision]);

  return <CompanyAirportContext.Provider value={api}>{children}</CompanyAirportContext.Provider>;
}

export function useCompanyAirport(): CompanyAirportApi {
  const api = useContext(CompanyAirportContext);
  if (!api) {
    throw new Error('useCompanyAirport must be used inside a CompanyAirportProvider.');
  }
  return api;
}

export type { CompanyAirportPageContent, CompanyAirportProposal };
