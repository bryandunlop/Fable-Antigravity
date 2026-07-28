import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it } from 'vitest';

import type { AirportRecord } from '../../airport/types';
import AirportProposalQueue from './AirportProposalQueue';
import AirportReferenceDetail from './AirportReferenceDetail';
import { CompanyAirportProvider } from './CompanyAirportContext';
import { ProposeChangeDialog } from './ProposeChangeDialog';

/**
 * The propose → review → publish round trip, through the real provider (D46).
 *
 * This exists because of a bug clicking Approve found and no unit test could:
 * the context value was memoised on a stable dependency, so a mutation updated
 * the store and re-rendered nothing. Every assertion below that reads a screen
 * *after* a mutation is guarding that propagation.
 */

const airport = {
  id: 'TEB',
  icaoId: 'KTEB',
  siteNo: '14349.',
  siteTypeCode: 'A',
  name: 'TETERBORO',
  city: 'TETERBORO',
  stateCode: 'NJ',
  countyName: 'BERGEN',
  countryCode: 'US',
  latitude: 40.85,
  longitude: -74.06,
  elevationFt: 8.3,
  magneticVariation: '12W',
  trafficPatternAltitudeFt: null,
  status: 'O',
  ownershipTypeCode: 'PU',
  facilityUseCode: 'PU',
  towerTypeCode: 'ATCT',
  artccId: 'ZNY',
  notamId: 'TEB',
  notamDFlag: true,
  customsAvailable: false,
  landingRightsAvailable: true,
  landingFee: true,
  far139TypeCode: 'IV A',
  fuelTypes: ['100LL', 'A'],
  otherServices: [],
  contractFuelAvailable: null,
  airportLightingSchedule: 'SS-SR',
  beaconLightingSchedule: 'SS-SR',
  lastInspection: '2025/10/28',
  runways: [],
  attendance: [],
  contacts: [],
  effectiveDate: '2026/07/09',
} satisfies AirportRecord;

/**
 * Mirrors how the app composes these: the dialog is opened by the page's own
 * button and closed on submit. It cannot be left permanently open — Radix's
 * dialog is modal and aria-hidden's the rest of the tree, which would make the
 * review queue invisible to both a screen reader and these queries.
 */
function Harness({ reviewerOid = 'evaluator-1' }: { reviewerOid?: string }) {
  const [proposing, setProposing] = React.useState(false);
  return (
    <CompanyAirportProvider>
      <AirportReferenceDetail
        airport={airport}
        onBack={() => {}}
        onSubmitCorrection={() => setProposing(true)}
      />
      <ProposeChangeDialog
        icao="KTEB"
        airportName="TETERBORO"
        currentUserOid="pilot-1"
        open={proposing}
        onOpenChange={setProposing}
      />
      <AirportProposalQueue role="airport-evaluator" currentUserOid={reviewerOid} />
    </CompanyAirportProvider>
  );
}

async function proposeOpsNote(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.click(screen.getByRole('button', { name: /propose a change/i }));
  await user.type(screen.getByLabelText(/operations notes/i), text);
  await user.type(screen.getByLabelText(/reason for the change/i), 'Confirmed with airport ops.');
  await user.click(screen.getByRole('button', { name: /submit for review/i }));
}

describe('company page round trip', () => {
  it('carries a proposal from submit through approval to a published page', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByText(/nothing has been published for this airport yet/i)).toBeInTheDocument();

    await proposeOpsNote(user, 'Ramp 3 closed for resurfacing.');

    // Reached the reviewer — this read is only correct if the mutation propagated.
    expect(screen.getByText(/changed: opsNotes/i)).toBeInTheDocument();
    expect(screen.getByText(/1 awaiting review/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /approve/i }));

    expect(screen.getByText(/approved, ready to publish/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^publish$/i }));

    // Landed on the airport page as a published company page.
    expect(screen.getByText('Ramp 3 closed for resurfacing.')).toBeInTheDocument();
    expect(
      screen.queryByText(/nothing has been published for this airport yet/i),
    ).not.toBeInTheDocument();
  });

  it('will not publish until the proposal is approved', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await proposeOpsNote(user, 'Not yet approved.');

    expect(screen.queryByRole('button', { name: /^publish$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/nothing approved is waiting to publish/i)).toBeInTheDocument();
  });

  it('shows a denial in the trail and publishes nothing', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await proposeOpsNote(user, 'Hearsay.');
    await user.click(screen.getByRole('button', { name: /deny/i }));

    expect(screen.getByText(/nothing is waiting on you/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing approved is waiting to publish/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing has been published for this airport yet/i)).toBeInTheDocument();
  });
});
