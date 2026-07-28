/**
 * The propose → review → publish workflow for company airport pages (D46).
 *
 * A proposal is mutable workflow state, deliberately unlike the page versions it
 * produces. Versions are an append-only ledger (D47); a proposal is a queue item
 * that moves through states and is then done with. Conflating the two would make
 * every draft an immutable record, which helps nobody.
 *
 * Three rules here are the ones that matter:
 *
 *   1. Required approvals are computed from the CHANGED FIELDS at submit time
 *      (approvalRouting, D46). Safety fields — PPR, curfews, ramp limits, and any
 *      annotation contradicting FAA data — pull in the chief pilot.
 *   2. One person cannot satisfy two required approvals. A two-role gate exists
 *      to get two pairs of eyes; someone holding both roles approving twice is
 *      one pair wearing two hats, and defeats the control entirely.
 *   3. A proposal is a PATCH, not a replacement. Publishing one that touched only
 *      the FBO preference must not wipe a PPR nobody edited.
 */

import { requiredApprovals, type ApproverRole } from './approvalRouting';
import type {
  CompanyAirportPageContent,
  CompanyAirportPageStore,
  CompanyAirportPageVersion,
  StoreClock,
} from './pageStore';

export type ProposalStatus = 'pending' | 'approved' | 'denied' | 'published';

export interface ProposalDecision {
  role: ApproverRole;
  reviewerOid: string;
  decision: 'approve' | 'deny';
  comments?: string;
  decidedAtUtc: string;
  /**
   * The decider is also the proposer (D52).
   *
   * Bryan's call: permitted, because in a small flight department the officer is
   * often the only person who knows the airport — but recorded, because the
   * record must not read as though two people looked at it. Anyone auditing this
   * later can see at a glance which changes had no second pair of eyes.
   */
  selfApproved: boolean;
}

export interface CompanyAirportProposal {
  id: string;
  icao: string;
  submittedBy: string;
  submittedAtUtc: string;
  /** Why the change is being proposed. Required — an unexplained edit is not reviewable. */
  reason: string;
  /** The version this was drafted against, so a stale publish can be caught. */
  basedOnVersion: number | null;
  changes: Partial<CompanyAirportPageContent>;
  requiredApprovals: ApproverRole[];
  decisions: ProposalDecision[];
  status: ProposalStatus;
  publishedVersionId: string | null;
}

export interface SubmitRequest {
  icao: string;
  submittedBy: string;
  reason: string;
  changes: Partial<CompanyAirportPageContent>;
}

export interface DecideRequest {
  proposalId: string;
  role: ApproverRole;
  reviewerOid: string;
  decision: 'approve' | 'deny';
  comments?: string;
}

export class UnknownProposalError extends Error {
  constructor(id: string) {
    super(`No such proposal: ${id}.`);
    this.name = 'UnknownProposalError';
  }
}

export class UnrequiredApproverError extends Error {
  constructor(role: ApproverRole) {
    super(`This proposal does not require approval from ${role}.`);
    this.name = 'UnrequiredApproverError';
  }
}

export class AlreadyDecidedError extends Error {
  constructor(role: ApproverRole) {
    super(`${role} has already decided this proposal.`);
    this.name = 'AlreadyDecidedError';
  }
}

export class SameReviewerTwiceError extends Error {
  constructor(reviewerOid: string) {
    super(
      `${reviewerOid} has already decided this proposal in another role. ` +
        `A two-role approval needs two people.`,
    );
    this.name = 'SameReviewerTwiceError';
  }
}

export class NotApprovedError extends Error {
  constructor(status: ProposalStatus) {
    super(`Cannot publish a proposal that is ${status}.`);
    this.name = 'NotApprovedError';
  }
}

function copy(proposal: CompanyAirportProposal): CompanyAirportProposal {
  return {
    ...proposal,
    changes: { ...proposal.changes },
    requiredApprovals: [...proposal.requiredApprovals],
    decisions: proposal.decisions.map((d) => ({ ...d })),
  };
}

const EMPTY_CONTENT: CompanyAirportPageContent = {
  ppr: null,
  curfew: null,
  opsNotes: null,
  fboPreference: null,
  rampHandlingLimits: null,
  referenceAnnotations: [],
};

export class ProposalWorkflow {
  private readonly proposals: CompanyAirportProposal[] = [];

  constructor(
    private readonly pages: CompanyAirportPageStore,
    private readonly clock: StoreClock,
    seed?: readonly CompanyAirportProposal[],
  ) {
    if (seed) this.proposals.push(...seed.map(copy));
  }

  /**
   * Everything in flight, deep-copied.
   *
   * Proposals are workflow state rather than a ledger, but losing them is not
   * acceptable: a submitter who refreshes and finds their proposal gone believes
   * it is sitting with a reviewer when it is nowhere.
   */
  snapshot(): CompanyAirportProposal[] {
    return this.proposals.map(copy);
  }

  submit(request: SubmitRequest): CompanyAirportProposal {
    const changedFields = Object.keys(request.changes);
    const current = this.pages.getLatest(request.icao);

    const proposal: CompanyAirportProposal = {
      id: this.clock.nextId(),
      icao: request.icao,
      submittedBy: request.submittedBy,
      submittedAtUtc: this.clock.now(),
      reason: request.reason,
      basedOnVersion: current?.version ?? null,
      changes: { ...request.changes },
      requiredApprovals: requiredApprovals(changedFields),
      decisions: [],
      status: 'pending',
      publishedVersionId: null,
    };

    this.proposals.push(proposal);
    return copy(proposal);
  }

  decide(request: DecideRequest): CompanyAirportProposal {
    const proposal = this.find(request.proposalId);

    if (!proposal.requiredApprovals.includes(request.role)) {
      throw new UnrequiredApproverError(request.role);
    }
    if (proposal.decisions.some((d) => d.role === request.role)) {
      throw new AlreadyDecidedError(request.role);
    }
    if (proposal.decisions.some((d) => d.reviewerOid === request.reviewerOid)) {
      throw new SameReviewerTwiceError(request.reviewerOid);
    }

    proposal.decisions.push({
      role: request.role,
      reviewerOid: request.reviewerOid,
      decision: request.decision,
      comments: request.comments,
      decidedAtUtc: this.clock.now(),
      selfApproved: request.reviewerOid === proposal.submittedBy,
    });

    // One denial ends it. Requiring the remaining approvers to also weigh in on
    // something already rejected wastes their time and muddies the record.
    if (request.decision === 'deny') {
      proposal.status = 'denied';
    } else if (
      proposal.requiredApprovals.every((role) =>
        proposal.decisions.some((d) => d.role === role && d.decision === 'approve'),
      )
    ) {
      proposal.status = 'approved';
    }

    return copy(proposal);
  }

  publish(proposalId: string, publishedBy: string): CompanyAirportPageVersion {
    const proposal = this.find(proposalId);
    if (proposal.status !== 'approved') throw new NotApprovedError(proposal.status);

    const current = this.pages.getLatest(proposal.icao);
    const version = this.pages.publish({
      icao: proposal.icao,
      // The patch, applied over whatever is current — not over what was current
      // when the proposal was drafted.
      content: { ...(current?.content ?? EMPTY_CONTENT), ...proposal.changes },
      publishedBy,
      basedOnVersion: current?.version,
    });

    proposal.status = 'published';
    proposal.publishedVersionId = version.id;
    return version;
  }

  get(proposalId: string): CompanyAirportProposal | null {
    const found = this.proposals.find((p) => p.id === proposalId);
    return found ? copy(found) : null;
  }

  /** Pending proposals this role still owes a decision on. */
  awaiting(role: ApproverRole): CompanyAirportProposal[] {
    return this.proposals
      .filter(
        (p) =>
          p.status === 'pending' &&
          p.requiredApprovals.includes(role) &&
          !p.decisions.some((d) => d.role === role),
      )
      .map(copy);
  }

  readyToPublish(): CompanyAirportProposal[] {
    return this.proposals.filter((p) => p.status === 'approved').map(copy);
  }

  forAirport(icao: string): CompanyAirportProposal[] {
    return this.proposals.filter((p) => p.icao === icao).map(copy);
  }

  private find(proposalId: string): CompanyAirportProposal {
    const found = this.proposals.find((p) => p.id === proposalId);
    if (!found) throw new UnknownProposalError(proposalId);
    return found;
  }
}
