import { describe, expect, it } from 'vitest';

import { buildOfficerWorklist } from './worklist';
import { ProposalWorkflow } from './proposals';
import {
  InMemoryCompanyAirportPageStore,
  type CompanyAirportPageContent,
  type StoreClock,
} from './pageStore';

const EMPTY: CompanyAirportPageContent = {
  ppr: null,
  curfew: null,
  opsNotes: null,
  fboPreference: null,
  rampHandlingLimits: null,
  referenceAnnotations: [],
};

function ctx(start = '2026-01-01T12:00:00.000Z') {
  let at = start;
  let seq = 0;
  const clock: StoreClock = { now: () => at, nextId: () => `id-${++seq}` };
  const pages = new InMemoryCompanyAirportPageStore(clock);
  const workflow = new ProposalWorkflow(pages, clock);

  return {
    pages,
    workflow,
    set: (iso: string) => {
      at = iso;
    },
    publish: (icao: string, content: Partial<CompanyAirportPageContent>) => {
      const current = pages.getLatest(icao);
      return pages.publish({
        icao,
        content: { ...(current?.content ?? EMPTY), ...content },
        publishedBy: 'officer-1',
        basedOnVersion: current?.version,
      });
    },
  };
}

describe('officer worklist (LG-83)', () => {
  it('is empty when there is nothing to do', () => {
    const t = ctx();
    const list = buildOfficerWorklist(t.pages, t.workflow, 'airport-evaluator', {
      todayIso: '2026-01-02',
    });

    expect(list.counts.total).toBe(0);
  });

  it('surfaces proposals this role still owes a decision on', () => {
    const t = ctx();
    t.publish('KTEB', { opsNotes: 'Note' });
    t.workflow.submit({
      icao: 'KTEB',
      submittedBy: 'crew-1',
      reason: 'Saw it change',
      changes: { opsNotes: 'New note' },
    });

    const officer = buildOfficerWorklist(t.pages, t.workflow, 'airport-evaluator', {
      todayIso: '2026-01-02',
    });
    expect(officer.counts.awaitingDecision).toBe(1);

    // opsNotes is a standard field, so the chief pilot is not required on it.
    const chief = buildOfficerWorklist(t.pages, t.workflow, 'chief-pilot', {
      todayIso: '2026-01-02',
    });
    expect(chief.counts.awaitingDecision).toBe(0);
  });

  it('routes a safety-field proposal to the chief pilot too', () => {
    const t = ctx();
    t.publish('KTEB', { opsNotes: 'Note' });
    t.workflow.submit({
      icao: 'KTEB',
      submittedBy: 'crew-1',
      reason: 'PPR changed',
      changes: { ppr: 'PPR 48h' },
    });

    const chief = buildOfficerWorklist(t.pages, t.workflow, 'chief-pilot', {
      todayIso: '2026-01-02',
    });
    expect(chief.counts.awaitingDecision).toBe(1);
  });

  it('surfaces approved-but-unpublished proposals to either role', () => {
    const t = ctx();
    t.publish('KTEB', { opsNotes: 'Note' });
    const proposal = t.workflow.submit({
      icao: 'KTEB',
      submittedBy: 'crew-1',
      reason: 'Saw it change',
      changes: { opsNotes: 'New note' },
    });
    t.workflow.decide({
      proposalId: proposal.id,
      role: 'airport-evaluator',
      reviewerOid: 'officer-1',
      decision: 'approve',
    });

    const list = buildOfficerWorklist(t.pages, t.workflow, 'airport-evaluator', {
      todayIso: '2026-01-02',
    });
    expect(list.counts.readyToPublish).toBe(1);
    // It is decided, so it is no longer awaiting a decision.
    expect(list.counts.awaitingDecision).toBe(0);
  });

  it('lists an airport nobody has ever confirmed as never-reviewed', () => {
    const t = ctx();
    t.publish('KTEB', { opsNotes: 'Note' });

    const list = buildOfficerWorklist(t.pages, t.workflow, 'airport-evaluator', {
      todayIso: '2026-01-02',
    });
    expect(list.neverReviewed.map((row) => row.icao)).toEqual(['KTEB']);
    expect(list.counts.stale).toBe(0);
  });

  it('moves an airport out of never-reviewed once a field is confirmed', () => {
    const t = ctx();
    t.publish('KTEB', { opsNotes: 'Note' });
    t.pages.confirm({
      icao: 'KTEB',
      field: 'opsNotes',
      confirmedBy: 'officer-1',
      source: 'officer',
    });

    const list = buildOfficerWorklist(t.pages, t.workflow, 'airport-evaluator', {
      todayIso: '2026-01-02',
    });
    expect(list.counts.neverReviewed).toBe(0);
    expect(list.counts.total).toBe(0);
  });

  it('never counts one airport in both never-reviewed and stale', () => {
    const t = ctx();
    t.publish('KTEB', { opsNotes: 'Note' });

    // Well past the 180-day opsNotes cadence, and still never confirmed.
    const list = buildOfficerWorklist(t.pages, t.workflow, 'airport-evaluator', {
      todayIso: '2027-01-01',
    });

    expect(list.counts.neverReviewed).toBe(1);
    expect(list.counts.stale).toBe(0);
    expect(list.counts.total).toBe(1);
  });

  it('lists a confirmed-then-aged airport as stale', () => {
    const t = ctx();
    t.publish('KTEB', { opsNotes: 'Note' });
    t.pages.confirm({
      icao: 'KTEB',
      field: 'opsNotes',
      confirmedBy: 'officer-1',
      source: 'officer',
    });

    const list = buildOfficerWorklist(t.pages, t.workflow, 'airport-evaluator', {
      todayIso: '2027-01-01',
    });
    expect(list.stale.map((row) => row.icao)).toEqual(['KTEB']);
    expect(list.counts.neverReviewed).toBe(0);
  });

  it('separates due-soon from stale', () => {
    const t = ctx();
    t.publish('KTEB', { opsNotes: 'Note' });
    t.pages.confirm({
      icao: 'KTEB',
      field: 'opsNotes',
      confirmedBy: 'officer-1',
      source: 'officer',
    });

    // opsNotes cadence is 180 days from 2026-01-01 → due 2026-06-30.
    const dueSoon = buildOfficerWorklist(t.pages, t.workflow, 'airport-evaluator', {
      todayIso: '2026-06-15',
    });
    expect(dueSoon.counts.dueSoon).toBe(1);
    expect(dueSoon.counts.stale).toBe(0);
  });

  it('scores only airports on the roster', () => {
    const t = ctx();
    t.publish('KTEB', { opsNotes: 'Note' });
    t.publish('KASE', { opsNotes: 'Note' });

    const all = buildOfficerWorklist(t.pages, t.workflow, 'airport-evaluator', {
      todayIso: '2026-01-02',
    });
    expect(all.counts.neverReviewed).toBe(2);

    const narrowed = buildOfficerWorklist(t.pages, t.workflow, 'airport-evaluator', {
      todayIso: '2026-01-02',
      rosterIcaos: ['KTEB'],
    });
    expect(narrowed.counts.neverReviewed).toBe(1);
  });

  it('does not list an airport with no page at all', () => {
    const t = ctx();
    const list = buildOfficerWorklist(t.pages, t.workflow, 'airport-evaluator', {
      todayIso: '2026-01-02',
      rosterIcaos: ['KTEB'],
    });

    // No page means nothing to review — it is not a stale fact, it is an absent one.
    expect(list.counts.total).toBe(0);
  });

  it('carries the open-proposal count as context on a row', () => {
    const t = ctx();
    t.publish('KTEB', { opsNotes: 'Note' });
    t.workflow.submit({
      icao: 'KTEB',
      submittedBy: 'crew-1',
      reason: 'Saw it change',
      changes: { opsNotes: 'New note' },
    });

    const list = buildOfficerWorklist(t.pages, t.workflow, 'airport-evaluator', {
      todayIso: '2026-01-02',
    });
    expect(list.neverReviewed[0].openProposals).toBe(1);
  });

  it('totals every bucket so a nav badge has one number', () => {
    const t = ctx();
    t.publish('KTEB', { opsNotes: 'Note' });
    t.publish('KASE', { opsNotes: 'Note' });
    t.workflow.submit({
      icao: 'KTEB',
      submittedBy: 'crew-1',
      reason: 'Saw it change',
      changes: { opsNotes: 'New note' },
    });

    const list = buildOfficerWorklist(t.pages, t.workflow, 'airport-evaluator', {
      todayIso: '2026-01-02',
    });
    expect(list.counts.total).toBe(list.counts.awaitingDecision + list.counts.neverReviewed);
    expect(list.counts.total).toBe(3);
  });
});

describe('confirming a field through the store', () => {
  it('refuses to confirm a field that carries no value', () => {
    const t = ctx();
    t.publish('KTEB', { opsNotes: 'Note' });

    expect(() =>
      t.pages.confirm({
        icao: 'KTEB',
        field: 'curfew',
        confirmedBy: 'officer-1',
        source: 'officer',
      }),
    ).toThrow(/carries no value/);
  });

  it('refuses to confirm an airport with no page', () => {
    const t = ctx();
    expect(() =>
      t.pages.confirm({
        icao: 'KTEB',
        field: 'opsNotes',
        confirmedBy: 'officer-1',
        source: 'officer',
      }),
    ).toThrow(/no published company page/);
  });

  it('pins the version it confirmed', () => {
    const t = ctx();
    const version = t.publish('KTEB', { opsNotes: 'Note' });
    const confirmation = t.pages.confirm({
      icao: 'KTEB',
      field: 'opsNotes',
      confirmedBy: 'officer-1',
      source: 'officer',
    });

    expect(confirmation.versionIdSeen).toBe(version.id);
  });
});
