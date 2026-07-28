/**
 * The Airport Evaluation Officer's worklist (LG-83) — one board of what needs
 * their attention, derived from state rather than stored as a queue.
 *
 * Bryan chose a worklist over a data-entry console: the FAA reference layer is
 * not ours to overwrite, and D46 already provides the annotate-with-signoff path
 * for disagreeing with it. So this board never edits airport facts; it routes the
 * officer to the decision only they can make.
 *
 * THE ROSTER IS AIRPORTS THAT HAVE A COMPANY PAGE — not all 2,128 in the NASR
 * bundle. "Never reviewed" therefore means "we wrote a page and nobody has ever
 * gone back and checked it", not "an airport exists that we have not documented".
 * Scoring 2,128 airports against a cadence would open the board with two thousand
 * red rows, which is the wall-of-red failure that made the ranked-confidence
 * option (D54) worth keeping on the table. When trip history is available the
 * roster should widen to airports the operator actually flies to — `rosterIcaos`
 * is the seam for that and is deliberately a parameter.
 */

import { pageConfirmationSummary, type PageConfirmationSummary } from './confirmations';
import type { ApproverRole } from './approvalRouting';
import type { CompanyAirportProposal, ProposalWorkflow } from './proposals';
import type { CompanyAirportPageStore } from './pageStore';
import { operatorTodayIso } from '../../lib/operatorDate';

export interface AirportReviewRow {
  icao: string;
  summary: PageConfirmationSummary;
  /** Pending proposals sitting against this airport — context, not a bucket. */
  openProposals: number;
}

export interface OfficerWorklist {
  /** Proposals this role still owes a decision on. */
  awaitingDecision: CompanyAirportProposal[];
  /** Approved by everyone required, but nobody has pressed publish. */
  readyToPublish: CompanyAirportProposal[];
  /** Has a page; no human has ever confirmed any field on it. */
  neverReviewed: AirportReviewRow[];
  /** At least one present field is past its cadence. */
  stale: AirportReviewRow[];
  /** At least one present field falls due within the warning window. */
  dueSoon: AirportReviewRow[];
  counts: {
    awaitingDecision: number;
    readyToPublish: number;
    neverReviewed: number;
    stale: number;
    dueSoon: number;
    /** Everything above — the single number worth putting on a nav badge. */
    total: number;
  };
}

export interface WorklistOptions {
  todayIso?: string;
  /**
   * Airports to score. Defaults to those with a company page.
   * See the module comment before widening this to the whole NASR bundle.
   */
  rosterIcaos?: readonly string[];
}

export function buildOfficerWorklist(
  pages: CompanyAirportPageStore,
  workflow: ProposalWorkflow,
  role: ApproverRole,
  options: WorklistOptions = {},
): OfficerWorklist {
  const todayIso = options.todayIso ?? operatorTodayIso();
  const roster = options.rosterIcaos ?? pages.icaosWithPages();

  const awaitingDecision = workflow.awaiting(role);
  const readyToPublish = workflow.readyToPublish();

  const openByIcao = new Map<string, number>();
  for (const proposal of workflow.snapshot()) {
    if (proposal.status === 'pending' || proposal.status === 'approved') {
      openByIcao.set(proposal.icao, (openByIcao.get(proposal.icao) ?? 0) + 1);
    }
  }

  const rows: AirportReviewRow[] = [...roster].sort().map((icao) => ({
    icao,
    summary: pageConfirmationSummary(
      pages.versionsFor(icao),
      pages.confirmationsFor(icao),
      todayIso,
    ),
    openProposals: openByIcao.get(icao) ?? 0,
  }));

  // A page nobody has ever confirmed belongs in exactly one bucket. Listing it
  // under both "never reviewed" and "stale" would double-count the board and
  // make the total meaningless.
  const neverReviewed = rows.filter(
    (row) => row.summary.status !== 'no-page' && row.summary.neverConfirmed,
  );
  const reviewed = rows.filter(
    (row) => row.summary.status !== 'no-page' && !row.summary.neverConfirmed,
  );

  const stale = reviewed.filter((row) => row.summary.status === 'overdue');
  const dueSoon = reviewed.filter((row) => row.summary.status === 'due-soon');

  return {
    awaitingDecision,
    readyToPublish,
    neverReviewed,
    stale,
    dueSoon,
    counts: {
      awaitingDecision: awaitingDecision.length,
      readyToPublish: readyToPublish.length,
      neverReviewed: neverReviewed.length,
      stale: stale.length,
      dueSoon: dueSoon.length,
      total:
        awaitingDecision.length +
        readyToPublish.length +
        neverReviewed.length +
        stale.length +
        dueSoon.length,
    },
  };
}
