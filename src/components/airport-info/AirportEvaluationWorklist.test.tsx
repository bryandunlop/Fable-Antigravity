import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import AirportEvaluationWorklist from './AirportEvaluationWorklist';
import { CompanyAirportProvider, useCompanyAirport } from './CompanyAirportContext';

/**
 * Drives the real provider, not a stub. The company layer has already produced
 * three defects that only appeared when a real component rendered against a real
 * store — a memoised context that made Approve do nothing among them — so the
 * worklist is exercised end to end here.
 */

const EMPTY = {
  ppr: null,
  curfew: null,
  opsNotes: null,
  fboPreference: null,
  rampHandlingLimits: null,
  referenceAnnotations: [],
};

/**
 * Seeds the store through the public API, from inside the provider. In an effect
 * rather than during render — seeding writes to the store, which bumps the
 * provider's revision, and doing that mid-render is a setState-while-rendering
 * warning.
 */
function Seed({ run }: { run: (company: ReturnType<typeof useCompanyAirport>) => void }) {
  const company = useCompanyAirport();
  const done = React.useRef(false);
  React.useEffect(() => {
    if (done.current) return;
    done.current = true;
    run(company);
  });
  return null;
}

function renderWorklist(
  seed: (company: ReturnType<typeof useCompanyAirport>) => void,
  todayIso = '2026-01-02',
) {
  return render(
    <CompanyAirportProvider>
      <Seed run={seed} />
      <AirportEvaluationWorklist
        role="airport-evaluator"
        currentUserOid="officer-1"
        todayIso={todayIso}
      />
    </CompanyAirportProvider>,
  );
}

function publish(
  company: ReturnType<typeof useCompanyAirport>,
  icao: string,
  changes: Record<string, string>,
) {
  const proposal = company.submit({
    icao,
    submittedBy: 'seed',
    reason: 'seed',
    changes,
  });
  for (const role of proposal.requiredApprovals) {
    company.decide({
      proposalId: proposal.id,
      role,
      reviewerOid: `seed-${role}`,
      decision: 'approve',
    });
  }
  company.publish(proposal.id, 'seed-publisher');
}

describe('AirportEvaluationWorklist', () => {
  it('says so when nothing needs attention', () => {
    renderWorklist(() => {});
    expect(screen.getByText(/Nothing needs your attention/i)).toBeInTheDocument();
  });

  it('lists a published-but-never-confirmed airport under Never reviewed', () => {
    renderWorklist((company) => {
      publish(company, 'KTEB', { opsNotes: 'Watch the taxiway' });
    });

    expect(screen.getByRole('heading', { name: /Never reviewed/i })).toBeInTheDocument();
    expect(screen.getByText('KTEB')).toBeInTheDocument();
    expect(screen.getByText(/Ops notes/i)).toBeInTheDocument();
  });

  it('clears the row when the officer confirms the fact is still true', async () => {
    const user = userEvent.setup();
    renderWorklist((company) => {
      publish(company, 'KTEB', { opsNotes: 'Watch the taxiway' });
    });

    expect(screen.getByText('KTEB')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Still true/i }));

    // This is the assertion the memoised-context bug would have failed: the
    // store changes, and the screen must follow.
    expect(screen.getByText(/Nothing needs your attention/i)).toBeInTheDocument();
    expect(screen.queryByText('KTEB')).not.toBeInTheDocument();
  });

  it('marks an aged fact overdue and says when it was last confirmed', () => {
    renderWorklist((company) => {
      publish(company, 'KTEB', { opsNotes: 'Watch the taxiway' });
      company.confirm({
        icao: 'KTEB',
        field: 'opsNotes',
        confirmedBy: 'officer-1',
        source: 'officer',
      });
    }, '2027-06-01');

    expect(screen.getByRole('heading', { name: /Review overdue/i })).toBeInTheDocument();
    expect(screen.getByText('overdue')).toBeInTheDocument();
    expect(screen.getByText(/confirmed by officer-1/i)).toBeInTheDocument();
  });

  it('does not list an airport in both Never reviewed and Review overdue', () => {
    renderWorklist((company) => {
      publish(company, 'KTEB', { opsNotes: 'Watch the taxiway' });
    }, '2027-06-01');

    expect(screen.getAllByText('KTEB')).toHaveLength(1);
  });

  it('surfaces an approved proposal that nobody has published', async () => {
    const user = userEvent.setup();
    renderWorklist((company) => {
      publish(company, 'KTEB', { opsNotes: 'First' });
      const proposal = company.submit({
        icao: 'KTEB',
        submittedBy: 'crew-1',
        reason: 'It changed',
        changes: { opsNotes: 'Second' },
      });
      company.decide({
        proposalId: proposal.id,
        role: 'airport-evaluator',
        reviewerOid: 'officer-9',
        decision: 'approve',
      });
    });

    expect(screen.getByRole('heading', { name: /Approved, ready to publish/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Publish/i }));
    expect(screen.queryByRole('heading', { name: /Approved, ready to publish/i })).toBeNull();
  });

  it('shows a proposal still awaiting this role', () => {
    renderWorklist((company) => {
      publish(company, 'KTEB', { opsNotes: 'First' });
      company.submit({
        icao: 'KTEB',
        submittedBy: 'crew-1',
        reason: 'It changed',
        changes: { opsNotes: 'Second' },
      });
    });

    expect(screen.getByRole('heading', { name: /Awaiting your decision/i })).toBeInTheDocument();
    expect(screen.getByText(/submitted by crew-1/i)).toBeInTheDocument();
  });

  it('flags a safety-field proposal on the board', () => {
    renderWorklist((company) => {
      publish(company, 'KTEB', { opsNotes: 'First' });
      company.submit({
        icao: 'KTEB',
        submittedBy: 'crew-1',
        reason: 'PPR changed',
        changes: { ppr: 'PPR 48h' },
      });
    });

    expect(screen.getByText(/safety field/i)).toBeInTheDocument();
  });

  it('never offers to edit an airport fact — this board routes, it does not author', () => {
    renderWorklist((company) => {
      publish(company, 'KTEB', { opsNotes: 'Watch the taxiway' });
    });

    expect(screen.getByText(/it does not change it/i)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
