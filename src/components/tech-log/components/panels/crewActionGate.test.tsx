import { describe, it, expect } from 'vitest';
import { useEffect, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TechLogProvider, useTechLog } from '../../TechLogContext';
import { DeferralCreatePanel } from './DeferralCreatePanel';
import { GatingReleasePanel } from './GatingReleasePanel';
import { CrewActionPanel } from './CrewActionPanel';
import type { Defect, Deferral } from '../../types';

/**
 * D59 — the crew-action compliance gate, driven through the real panels.
 *
 * The authority model under test, stated once so a future edit cannot quietly invert it:
 * **the complied mark is evidence, not authority.** Any pilot OR maintenance user may mark the
 * deferral's (O) crew action complied; the mark flips no state; maintenance's gating-discharge
 * signature alone flips PENDING_PLACARD → ACTIVE. The same person may do both — an (O) action
 * performed by maintenance and then released by maintenance is normal work, not an RII inspection.
 *
 * Seeded G500 MEL items used below (ac-n5pg is a G500):
 *   35-02-02  Cat C, carries an (O) procedure and NOTHING else — the "only-(O)" case that used to
 *             go straight to ACTIVE untouched. This is the hole D59 closes.
 *   24-07-02  Cat C, no (O), no (M), no placard — the case where line maintenance may ADD a crew
 *             action that the MEL item does not carry.
 *   21-01-02  Cat C, carries (O) + (M) + placard — inheritance with the gate already in play.
 */

const openDefect = (p: Partial<Defect> = {}): Defect => ({
  id: 'd-ca', aircraftId: 'ac-n5pg', source: 'PIREP', ataChapter: '35',
  description: 'Cabin oxygen ON warning inoperative.', airworthinessAffecting: true,
  status: 'OPEN', reportedByOid: 'USR001',
  occurredAtUtc: '2026-07-20T12:00:00.000Z', reportedAtUtc: '2026-07-20T12:30:00.000Z',
  signatureId: 'sig-d-ca', ...p,
});

/** Drive the real create panel: pick a MEL item, optionally interact, acknowledge, sign. */
async function signDeferral(melNumber: string, interact?: (u: ReturnType<typeof userEvent.setup>) => Promise<void>) {
  const user = userEvent.setup();
  let signed: Deferral | undefined;
  render(
    <TechLogProvider userRole="maintenance">
      <DeferralCreatePanel defect={openDefect()} onDone={d => { signed = d; }} onCancel={() => {}} />
    </TechLogProvider>,
  );
  await user.clear(screen.getByPlaceholderText(/Search by item number/i));
  await user.type(screen.getByPlaceholderText(/Search by item number/i), melNumber);
  await user.click(await screen.findByText(melNumber));
  await interact?.(user);
  await user.click(screen.getByLabelText(/I have reviewed the governing MEL item/i));
  await user.click(screen.getByRole('button', { name: /sign deferral/i }));
  const ceremony = screen.queryByRole('button', { name: 'Sign' });
  if (ceremony) await user.click(ceremony);
  return { signed, user };
}

/** Puts a deferral row into the ledger before rendering the panel under test — the panels resolve
 *  the deferral from the ledger by id (that is the §1a race fix), not from the prop they were given. */
function Seeded({ rows, children }: { rows: Deferral[]; children: ReactNode }) {
  const { state, dispatch } = useTechLog();
  const ready = rows.every(r => state.deferrals.some(d => d.id === r.id));
  useEffect(() => {
    for (const r of rows) if (!state.deferrals.some(d => d.id === r.id)) dispatch({ type: 'ADD_DEFERRAL', payload: r });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  return ready ? <>{children}</> : null;
}

const pendingDeferral = (p: Partial<Deferral> = {}): Deferral => ({
  id: 'df-ca', defectId: 'd-ca', aircraftId: 'ac-n5pg', melItemId: 'mel-g500-35-02-02',
  governingMmelRevision: 'Rev 1', governingEffectiveDate: '2025-09-03',
  melSubItemNumber: '35-02-02', melTitle: 'Cabin Oxygen ON Warning Systems',
  melOProcedure: 'Flightcrew will verify the cabin oxygen shutoff valve is closed before each flight.',
  crewActionRequired: true,
  category: 'C', dayOfDiscoveryUtc: '2026-07-20T12:00:00.000Z', clockStartDateUtc: '2026-07-21T04:00:00.000Z',
  governingTimezone: 'America/New_York', repairDueDateUtc: '2099-01-01T00:00:00.000Z',
  repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10,
  placardRequired: false, mProcedureRequired: false, extensionUsed: false, riiRequired: false,
  melReviewAcknowledged: true, signedByOid: 'USR002', signatureId: 'sig-df-ca', status: 'PENDING_PLACARD',
  ...p,
});

describe('D59 — crewActionRequired is inherited from the MEL item, and the deferral says so', () => {
  it('an only-(O) deferral now enters PENDING_PLACARD instead of going straight to ACTIVE', async () => {
    const { signed } = await signDeferral('35-02-02');

    expect(signed).toBeDefined();
    expect(signed!.crewActionRequired).toBe(true);
    expect(signed!.status).toBe('PENDING_PLACARD');
    // and the (O) text is FROZEN on the deferral, not read live off the MEL item
    expect(signed!.melOProcedure).toBe('35-02-02: To operate the airplane unpressurized, refer to AFM 03-21-90.');
  });

  it('shows the provenance of the inherited flag — it was authored on the MEL item, not decided here', async () => {
    const user = userEvent.setup();
    render(
      <TechLogProvider userRole="maintenance">
        <DeferralCreatePanel defect={openDefect()} onDone={() => {}} onCancel={() => {}} />
      </TechLogProvider>,
    );
    await user.clear(screen.getByPlaceholderText(/Search by item number/i));
    await user.type(screen.getByPlaceholderText(/Search by item number/i), '35-02-02');
    await user.click(await screen.findByText('35-02-02'));

    expect(screen.getByText(/per MEL item — DOM\/CI/i)).toBeInTheDocument();
  });

  it('offers NO control to clear an inherited crew action — a wrong flag is fixed in MEL management', async () => {
    const user = userEvent.setup();
    render(
      <TechLogProvider userRole="maintenance">
        <DeferralCreatePanel defect={openDefect()} onDone={() => {}} onCancel={() => {}} />
      </TechLogProvider>,
    );
    await user.clear(screen.getByPlaceholderText(/Search by item number/i));
    await user.type(screen.getByPlaceholderText(/Search by item number/i), '35-02-02');
    await user.click(await screen.findByText('35-02-02'));

    expect(screen.queryByLabelText(/crew action required/i)).not.toBeInTheDocument();
    expect(screen.getByText(/corrected in MEL management/i)).toBeInTheDocument();
  });

  it('line maintenance MAY add a crew action to an item that carries none — with an addendum', async () => {
    const { signed } = await signDeferral('24-07-02', async user => {
      await user.click(screen.getByLabelText(/crew action required/i));
      await user.type(screen.getByLabelText(/Crew instructions/i), 'Confirm battery voltage on the OHPTS before each start.');
    });

    expect(signed!.crewActionRequired).toBe(true);
    expect(signed!.crewActionInstructions).toBe('Confirm battery voltage on the OHPTS before each start.');
    // this item has no (M) and no placard — the crew action alone is what gates it
    expect(signed!.mProcedureRequired).toBe(false);
    expect(signed!.placardRequired).toBe(false);
    expect(signed!.status).toBe('PENDING_PLACARD');
  });

  it('leaves an item with no (O) and no added crew action exactly as it was — straight to ACTIVE', async () => {
    const { signed } = await signDeferral('24-07-02');

    expect(signed!.crewActionRequired).toBe(false);
    expect(signed!.status).toBe('ACTIVE');
  });
});

describe('D59 — marking complied: any pilot or maintenance user, and it flips no state', () => {
  const markComplied = async (userRole: 'pilot' | 'maintenance', note: string) => {
    const user = userEvent.setup();
    let marked: Deferral | undefined;
    render(
      <TechLogProvider userRole={userRole}>
        <Seeded rows={[pendingDeferral()]}>
          <CrewActionPanel deferralId="df-ca" onDone={d => { marked = d; }} onCancel={() => {}} />
        </Seeded>
      </TechLogProvider>,
    );
    await user.type(await screen.findByLabelText(/What was done/i), note);
    await user.click(screen.getByRole('button', { name: /mark complied/i }));
    await user.click(await screen.findByRole('button', { name: 'Sign' }));
    return marked;
  };

  it('a PILOT may mark it — on the road the pilots do it', async () => {
    const marked = await markComplied('pilot', 'Shutoff valve confirmed closed.');

    expect(marked).toBeDefined();
    expect(marked!.crewActionCompliance?.note).toBe('Shutoff valve confirmed closed.');
    expect(marked!.crewActionCompliance?.byName).toBeTruthy();
  });

  it('a MAINTENANCE user may mark it too — at base maintenance often performs the action', async () => {
    const marked = await markComplied('maintenance', 'Valve closed and verified by A&P.');

    expect(marked).toBeDefined();
    expect(marked!.crewActionCompliance?.note).toBe('Valve closed and verified by A&P.');
  });

  it('the mark FLIPS NO STATE — the deferral is still PENDING_PLACARD and still un-released', async () => {
    const marked = await markComplied('pilot', 'Done.');

    expect(marked!.status).toBe('PENDING_PLACARD');
    expect(marked!.gatingReleaseId).toBeUndefined();
  });

  it('the mark is a superseding insert — a new row pointing at the signed original', async () => {
    const marked = await markComplied('pilot', 'Done.');

    expect(marked!.id).not.toBe('df-ca');
    expect(marked!.supersedesId).toBe('df-ca');
  });

  it('needs NO step-up (D26) — the mark carries no authority, so it asks for no fresh auth', async () => {
    const user = userEvent.setup();
    render(
      <TechLogProvider userRole="pilot">
        <Seeded rows={[pendingDeferral()]}>
          <CrewActionPanel deferralId="df-ca" onDone={() => {}} onCancel={() => {}} />
        </Seeded>
      </TechLogProvider>,
    );
    await user.click(await screen.findByRole('button', { name: /mark complied/i }));

    expect(await screen.findByRole('button', { name: 'Sign' })).toBeEnabled();
    expect(screen.queryByLabelText(/Step-up re-authentication/i)).not.toBeInTheDocument();
  });

  it('shows the crew the FROZEN (O) text plus maintenance’s addendum', async () => {
    render(
      <TechLogProvider userRole="pilot">
        <Seeded rows={[pendingDeferral({ crewActionInstructions: 'Also log the valve position on the trip sheet.' })]}>
          <CrewActionPanel deferralId="df-ca" onDone={() => {}} onCancel={() => {}} />
        </Seeded>
      </TechLogProvider>,
    );

    expect(await screen.findByText(/cabin oxygen shutoff valve is closed/i)).toBeInTheDocument();
    expect(screen.getByText(/log the valve position on the trip sheet/i)).toBeInTheDocument();
  });
});

describe('D59 — the hard gate on the gating-discharge release', () => {
  const renderGating = (rows: Deferral[], userRole: 'pilot' | 'maintenance' = 'maintenance') =>
    render(
      <TechLogProvider userRole={userRole}>
        <Seeded rows={rows}>
          <GatingReleasePanel deferral={rows[0]} onDone={() => {}} onCancel={() => {}} />
        </Seeded>
      </TechLogProvider>,
    );

  it('BLOCKS the release while the crew action is unmarked, and says why', async () => {
    renderGating([pendingDeferral()]);

    expect(await screen.findByRole('button', { name: /sign discharge release/i })).toBeDisabled();
    expect(screen.getByText(/has not been marked complied/i)).toBeInTheDocument();
  });

  it('OPENS once the action is marked — by whoever marked it', async () => {
    const original = pendingDeferral();
    const marked: Deferral = {
      ...original, id: 'df-ca-2', supersedesId: 'df-ca',
      crewActionCompliance: { id: 'cac1', byOid: 'USR001', byName: 'Capt Sarah Reed', atUtc: '2026-07-21T10:00:00.000Z', signatureId: 'sig-cac1' },
    };
    renderGating([original, marked]);

    expect(await screen.findByRole('button', { name: /sign discharge release/i })).toBeEnabled();
    expect(screen.getByText(/Capt Sarah Reed/)).toBeInTheDocument();
  });

  // Workflow Logic Findings §1a — the live double-discharge race.
  it('RACE: refuses to sign a deferral another actor has already discharged, even with the stale row on screen', async () => {
    const stale = pendingDeferral();
    const discharged: Deferral = { ...stale, id: 'df-ca-2', supersedesId: 'df-ca', status: 'ACTIVE', gatingReleaseId: 'rel-1', crewActionRequired: false };
    renderGating([stale, discharged]);

    expect(await screen.findByText(/no longer awaiting its gating release/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign discharge release/i })).toBeDisabled();
  });
});
