import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { requiredApprovals, type ApproverRole } from '../../airport/company/approvalRouting';
import type { CompanyAirportPageContent, CompanyAirportPageVersion } from '../../airport/company/pageStore';
import { PersistentCompanyAirportPageStore } from '../../airport/company/persistence';
import {
  ProposalWorkflow,
  type CompanyAirportProposal,
  type DecideRequest,
  type SubmitRequest,
} from '../../airport/company/proposals';
import { defaultStorage, memoryStorage, type StorageLike } from '../../notifications/storage';

export const PROPOSALS_KEY = 'airport-company-proposals';

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
    };
  }

  /** Persist the in-flight queue and re-render. Pages persist themselves. */
  const commit = useCallback(() => {
    const { workflow, storage } = engine.current!;
    try {
      storage.setItem(PROPOSALS_KEY, JSON.stringify(workflow.snapshot()));
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
      awaiting: (role) => workflow.awaiting(role),
      readyToPublish: () => workflow.readyToPublish(),
      forAirport: (icao) => workflow.forAirport(icao),
      approvalsFor: (changedFields) => requiredApprovals(changedFields),
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
