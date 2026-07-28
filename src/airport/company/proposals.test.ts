import { beforeEach, describe, expect, it } from 'vitest';

import { InMemoryCompanyAirportPageStore } from './pageStore';
import {
  AlreadyDecidedError,
  NotApprovedError,
  ProposalWorkflow,
  SameReviewerTwiceError,
  UnrequiredApproverError,
} from './proposals';

function makeWorkflow() {
  let n = 0;
  let t = 0;
  const clock = {
    now: () => new Date(Date.UTC(2026, 6, 27, 12, 0, t++)).toISOString(),
    nextId: () => `id-${++n}`,
  };
  const pages = new InMemoryCompanyAirportPageStore(clock);
  return { pages, workflow: new ProposalWorkflow(pages, clock) };
}

describe('ProposalWorkflow — submission', () => {
  let ctx: ReturnType<typeof makeWorkflow>;

  beforeEach(() => {
    ctx = makeWorkflow();
  });

  it('requires only the officer for a standard change', () => {
    const proposal = ctx.workflow.submit({
      icao: 'KASE',
      submittedBy: 'pilot-1',
      reason: 'FBO changed hands',
      changes: { fboPreference: 'Atlantic' },
    });

    expect(proposal.requiredApprovals).toEqual(['airport-evaluator']);
    expect(proposal.status).toBe('pending');
  });

  it('requires the chief pilot when a safety field changes (D46)', () => {
    const proposal = ctx.workflow.submit({
      icao: 'KASE',
      submittedBy: 'pilot-1',
      reason: 'Tower advised a new curfew',
      changes: { curfew: 'No departures 2200-0600 local' },
    });

    expect(proposal.requiredApprovals).toEqual(['airport-evaluator', 'chief-pilot']);
  });

  it('records what it was drafted against, so a stale publish can be caught', () => {
    ctx.pages.publish({
      icao: 'KASE',
      content: {
        ppr: null,
        curfew: null,
        opsNotes: 'existing',
        fboPreference: null,
        rampHandlingLimits: null,
        referenceAnnotations: [],
      },
      publishedBy: 'evaluator-1',
    });

    const proposal = ctx.workflow.submit({
      icao: 'KASE',
      submittedBy: 'pilot-1',
      reason: 'update',
      changes: { opsNotes: 'revised' },
    });

    expect(proposal.basedOnVersion).toBe(1);
  });
});

describe('ProposalWorkflow — review', () => {
  let ctx: ReturnType<typeof makeWorkflow>;
  let safetyProposalId: string;

  beforeEach(() => {
    ctx = makeWorkflow();
    safetyProposalId = ctx.workflow.submit({
      icao: 'KASE',
      submittedBy: 'pilot-1',
      reason: 'Noise complaint from the town',
      changes: { curfew: 'No departures 2200-0600 local' },
    }).id;
  });

  it('stays pending while an approval is outstanding', () => {
    const after = ctx.workflow.decide({
      proposalId: safetyProposalId,
      role: 'airport-evaluator',
      reviewerOid: 'evaluator-1',
      decision: 'approve',
    });

    expect(after.status).toBe('pending');
  });

  it('becomes approved once every required role has approved', () => {
    ctx.workflow.decide({
      proposalId: safetyProposalId,
      role: 'airport-evaluator',
      reviewerOid: 'evaluator-1',
      decision: 'approve',
    });
    const after = ctx.workflow.decide({
      proposalId: safetyProposalId,
      role: 'chief-pilot',
      reviewerOid: 'chief-1',
      decision: 'approve',
    });

    expect(after.status).toBe('approved');
  });

  it('is denied outright by a single denial', () => {
    const after = ctx.workflow.decide({
      proposalId: safetyProposalId,
      role: 'airport-evaluator',
      reviewerOid: 'evaluator-1',
      decision: 'deny',
      comments: 'Tower says otherwise',
    });

    expect(after.status).toBe('denied');
  });

  it('refuses a second decision from the same role', () => {
    ctx.workflow.decide({
      proposalId: safetyProposalId,
      role: 'airport-evaluator',
      reviewerOid: 'evaluator-1',
      decision: 'approve',
    });

    expect(() =>
      ctx.workflow.decide({
        proposalId: safetyProposalId,
        role: 'airport-evaluator',
        reviewerOid: 'evaluator-2',
        decision: 'approve',
      }),
    ).toThrow(AlreadyDecidedError);
  });

  it('refuses an approval from a role the proposal does not require', () => {
    const standard = ctx.workflow.submit({
      icao: 'KTEB',
      submittedBy: 'pilot-1',
      reason: 'new FBO',
      changes: { fboPreference: 'Signature' },
    });

    expect(() =>
      ctx.workflow.decide({
        proposalId: standard.id,
        role: 'chief-pilot',
        reviewerOid: 'chief-1',
        decision: 'approve',
      }),
    ).toThrow(UnrequiredApproverError);
  });

  it('refuses to let one person satisfy both required approvals', () => {
    // Four eyes is the entire point of a two-role gate. Someone holding both
    // roles approving twice is one pair of eyes wearing two hats — the same
    // separation the project enforces for RII performer vs inspector.
    ctx.workflow.decide({
      proposalId: safetyProposalId,
      role: 'airport-evaluator',
      reviewerOid: 'wears-both-hats',
      decision: 'approve',
    });

    expect(() =>
      ctx.workflow.decide({
        proposalId: safetyProposalId,
        role: 'chief-pilot',
        reviewerOid: 'wears-both-hats',
        decision: 'approve',
      }),
    ).toThrow(SameReviewerTwiceError);
  });

  it('keeps every decision as an audit trail, including a denial', () => {
    ctx.workflow.decide({
      proposalId: safetyProposalId,
      role: 'airport-evaluator',
      reviewerOid: 'evaluator-1',
      decision: 'deny',
      comments: 'not corroborated',
    });

    const proposal = ctx.workflow.get(safetyProposalId);
    expect(proposal?.decisions).toHaveLength(1);
    expect(proposal?.decisions[0]).toMatchObject({
      role: 'airport-evaluator',
      reviewerOid: 'evaluator-1',
      decision: 'deny',
      comments: 'not corroborated',
    });
  });
});

describe('ProposalWorkflow — publish', () => {
  let ctx: ReturnType<typeof makeWorkflow>;
  let approvedId: string;

  beforeEach(() => {
    ctx = makeWorkflow();
    approvedId = ctx.workflow.submit({
      icao: 'KASE',
      submittedBy: 'pilot-1',
      reason: 'FBO changed hands',
      changes: { fboPreference: 'Atlantic Aviation' },
    }).id;
  });

  it('refuses to publish a proposal that is not approved', () => {
    expect(() => ctx.workflow.publish(approvedId, 'evaluator-1')).toThrow(NotApprovedError);
  });

  it('writes an approved proposal through as a new page version', () => {
    ctx.workflow.decide({
      proposalId: approvedId,
      role: 'airport-evaluator',
      reviewerOid: 'evaluator-1',
      decision: 'approve',
    });

    const version = ctx.workflow.publish(approvedId, 'evaluator-1');

    expect(version.version).toBe(1);
    expect(version.content.fboPreference).toBe('Atlantic Aviation');
    expect(ctx.pages.getLatest('KASE')?.content.fboPreference).toBe('Atlantic Aviation');
  });

  it('carries forward fields the proposal did not touch', () => {
    ctx.pages.publish({
      icao: 'KTEB',
      content: {
        ppr: 'PPR required',
        curfew: null,
        opsNotes: 'Existing note',
        fboPreference: null,
        rampHandlingLimits: null,
        referenceAnnotations: [],
      },
      publishedBy: 'evaluator-1',
    });
    const proposal = ctx.workflow.submit({
      icao: 'KTEB',
      submittedBy: 'pilot-1',
      reason: 'new FBO',
      changes: { fboPreference: 'Signature' },
    });
    ctx.workflow.decide({
      proposalId: proposal.id,
      role: 'airport-evaluator',
      reviewerOid: 'evaluator-1',
      decision: 'approve',
    });

    const version = ctx.workflow.publish(proposal.id, 'evaluator-1');

    // A proposal is a patch, not a replacement. Publishing one that only touched
    // the FBO must not silently wipe the PPR nobody edited.
    expect(version.content.ppr).toBe('PPR required');
    expect(version.content.opsNotes).toBe('Existing note');
    expect(version.version).toBe(2);
  });

  it('refuses to publish the same proposal twice', () => {
    ctx.workflow.decide({
      proposalId: approvedId,
      role: 'airport-evaluator',
      reviewerOid: 'evaluator-1',
      decision: 'approve',
    });
    ctx.workflow.publish(approvedId, 'evaluator-1');

    expect(() => ctx.workflow.publish(approvedId, 'evaluator-1')).toThrow();
  });

  it('links the published version back to the proposal', () => {
    ctx.workflow.decide({
      proposalId: approvedId,
      role: 'airport-evaluator',
      reviewerOid: 'evaluator-1',
      decision: 'approve',
    });
    const version = ctx.workflow.publish(approvedId, 'evaluator-1');

    expect(ctx.workflow.get(approvedId)?.publishedVersionId).toBe(version.id);
    expect(ctx.workflow.get(approvedId)?.status).toBe('published');
  });
});

describe('ProposalWorkflow — surviving a reload', () => {
  it('round-trips in-flight proposals through a snapshot', () => {
    // A submitted proposal that disappears on refresh is worse than no workflow:
    // the submitter believes it is with a reviewer, and it is nowhere.
    const first = makeWorkflow();
    const submitted = first.workflow.submit({
      icao: 'KASE',
      submittedBy: 'pilot-1',
      reason: 'curfew',
      changes: { curfew: 'No departures 2200-0600' },
    });
    first.workflow.decide({
      proposalId: submitted.id,
      role: 'airport-evaluator',
      reviewerOid: 'evaluator-1',
      decision: 'approve',
    });

    const restored = new ProposalWorkflow(
      first.pages,
      { now: () => '2026-07-27T13:00:00.000Z', nextId: () => 'later' },
      first.workflow.snapshot(),
    );

    const proposal = restored.get(submitted.id);
    expect(proposal?.status).toBe('pending');
    expect(proposal?.decisions).toHaveLength(1);
    // Still owed by the chief pilot, and the officer's decision is not replayable.
    expect(restored.awaiting('chief-pilot').map((p) => p.id)).toEqual([submitted.id]);
    expect(restored.awaiting('airport-evaluator')).toEqual([]);
  });

  it('does not let a restored proposal be decided twice by the same person', () => {
    const first = makeWorkflow();
    const submitted = first.workflow.submit({
      icao: 'KASE',
      submittedBy: 'pilot-1',
      reason: 'curfew',
      changes: { curfew: 'No departures 2200-0600' },
    });
    first.workflow.decide({
      proposalId: submitted.id,
      role: 'airport-evaluator',
      reviewerOid: 'wears-both-hats',
      decision: 'approve',
    });

    const restored = new ProposalWorkflow(
      first.pages,
      { now: () => '2026-07-27T13:00:00.000Z', nextId: () => 'later' },
      first.workflow.snapshot(),
    );

    expect(() =>
      restored.decide({
        proposalId: submitted.id,
        role: 'chief-pilot',
        reviewerOid: 'wears-both-hats',
        decision: 'approve',
      }),
    ).toThrow(SameReviewerTwiceError);
  });
});

describe('ProposalWorkflow — queues', () => {
  it('lists what is waiting on a given role, and nothing else', () => {
    const ctx = makeWorkflow();
    ctx.workflow.submit({
      icao: 'KASE',
      submittedBy: 'pilot-1',
      reason: 'curfew',
      changes: { curfew: 'No departures 2200-0600' },
    });
    ctx.workflow.submit({
      icao: 'KTEB',
      submittedBy: 'pilot-1',
      reason: 'fbo',
      changes: { fboPreference: 'Signature' },
    });

    expect(ctx.workflow.awaiting('chief-pilot').map((p) => p.icao)).toEqual(['KASE']);
    expect(ctx.workflow.awaiting('airport-evaluator').map((p) => p.icao)).toEqual(['KASE', 'KTEB']);
  });

  it('drops a proposal off a queue once that role has decided', () => {
    const ctx = makeWorkflow();
    const proposal = ctx.workflow.submit({
      icao: 'KASE',
      submittedBy: 'pilot-1',
      reason: 'curfew',
      changes: { curfew: 'No departures 2200-0600' },
    });
    ctx.workflow.decide({
      proposalId: proposal.id,
      role: 'airport-evaluator',
      reviewerOid: 'evaluator-1',
      decision: 'approve',
    });

    expect(ctx.workflow.awaiting('airport-evaluator')).toEqual([]);
    expect(ctx.workflow.awaiting('chief-pilot').map((p) => p.icao)).toEqual(['KASE']);
  });

  it('lists what is approved and waiting to be published', () => {
    const ctx = makeWorkflow();
    const proposal = ctx.workflow.submit({
      icao: 'KTEB',
      submittedBy: 'pilot-1',
      reason: 'fbo',
      changes: { fboPreference: 'Signature' },
    });
    ctx.workflow.decide({
      proposalId: proposal.id,
      role: 'airport-evaluator',
      reviewerOid: 'evaluator-1',
      decision: 'approve',
    });

    expect(ctx.workflow.readyToPublish().map((p) => p.icao)).toEqual(['KTEB']);
  });
});
