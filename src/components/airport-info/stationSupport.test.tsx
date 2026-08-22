import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useEffect, useState } from 'react';
import { describe, expect, it } from 'vitest';

import type { AirportRecord } from '../../airport/types';
import type { AirportLens } from '../../airport/lens';
import AirportReferenceDetail from './AirportReferenceDetail';
import { CompanyAirportProvider, useCompanyAirport } from './CompanyAirportContext';

/**
 * The claim this file exists to defend (D96): a technician's edit and what a
 * crew reads are the SAME field, so they cannot drift apart.
 *
 * Driven through the real provider and the real store rather than a stub. The
 * company layer has already produced several defects that only appeared when a
 * real component rendered against a real store, so the round trip is exercised
 * end to end here too.
 */

const airport: AirportRecord = {
  id: 'ASE',
  icaoId: 'KASE',
  siteNo: '00001.',
  siteTypeCode: 'A',
  name: 'ASPEN-PITKIN CO/SARDY FLD',
  city: 'ASPEN',
  stateCode: 'CO',
  countyName: 'PITKIN',
  countryCode: 'US',
  latitude: 39.22,
  longitude: -106.86,
  elevationFt: 7820,
  magneticVariation: '09E',
  trafficPatternAltitudeFt: null,
  status: 'O',
  ownershipTypeCode: 'PU',
  facilityUseCode: 'PU',
  towerTypeCode: 'ATCT',
  artccId: 'ZDV',
  notamId: 'ASE',
  notamDFlag: true,
  customsAvailable: false,
  landingRightsAvailable: false,
  landingFee: true,
  far139TypeCode: 'I A',
  fuelTypes: ['A'],
  otherServices: [],
  contractFuelAvailable: null,
  airportLightingSchedule: null,
  beaconLightingSchedule: null,
  lastInspection: '2025/10/28',
  runways: [],
  attendance: [],
  contacts: [],
  effectiveDate: '2026/07/09',
};

/**
 * Seeds through the public API from inside the provider, in an effect — seeding
 * writes to the store, which bumps the provider's revision, and doing that
 * mid-render is a setState-while-rendering warning.
 */
function Seed({ run }: { run: (company: ReturnType<typeof useCompanyAirport>) => void }) {
  const company = useCompanyAirport();
  useEffect(() => {
    run(company);
    // Once, on mount. The callback closes over the store, not over render state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** Holds the lens the way the directory does, so the switch actually switches. */
function Harness({
  initialLens = 'pilot',
  seed,
}: {
  initialLens?: AirportLens;
  seed?: (company: ReturnType<typeof useCompanyAirport>) => void;
}) {
  const [lens, setLens] = useState<AirportLens>(initialLens);
  return (
    <CompanyAirportProvider>
      {seed ? <Seed run={seed} /> : null}
      <AirportReferenceDetail
        airport={airport}
        onBack={() => {}}
        currentUserOid="tech-1"
        lens={lens}
        onLensChange={setLens}
      />
    </CompanyAirportProvider>
  );
}

describe('station support on the airport record (D96)', () => {
  it('tells a crew to assume no support when nobody has written any', async () => {
    render(<Harness />);

    // Absence must never read as "fine". This is the same posture as the
    // default-RED rule for an open defect.
    expect(
      await screen.findByText(/Assume none\.$/),
    ).toBeInTheDocument();
  });

  it('shows a crew the very field maintenance wrote, not a second copy of it', async () => {
    render(
      <Harness
        seed={(company) => {
          company.saveSupportField({
            icao: 'KASE',
            field: 'onFieldCapability',
            value: 'None. No station on the field is rated for our airframe class.',
            savedBy: 'dom-1',
          });
        }}
      />,
    );

    expect(
      await screen.findByText(/No station on the field is rated for our airframe class\./),
    ).toBeInTheDocument();
  });

  it('carries a technician’s edit through to what the crew reads', async () => {
    const user = userEvent.setup();
    render(<Harness initialLens="maintenance" />);

    await user.click(await screen.findByRole('button', { name: /Edit Mobile response/i }));
    await user.type(
      screen.getByLabelText(/Mobile response value/i),
      'Dispatched from KDEN, 3.5 hr road.',
    );
    await user.click(screen.getByRole('button', { name: /^Save$/ }));

    // Now cross to the crew view — no republish, no second write.
    await user.click(screen.getByRole('button', { name: /Flying in/i }));

    await waitFor(() =>
      expect(screen.getByText(/Dispatched from KDEN, 3\.5 hr road\./)).toBeInTheDocument(),
    );
  });

  it('puts the team recommendation in the header under both lenses', async () => {
    const user = userEvent.setup();
    render(
      <Harness
        seed={(company) => {
          company.saveSupportField({
            icao: 'KASE',
            field: 'teamRecommendation',
            value: 'Book the handler and expect a tow. Maintenance goes to KDEN.',
            savedBy: 'dom-1',
          });
        }}
      />,
    );

    expect(await screen.findByText(/What we do here —/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Fixing something/i }));
    expect(screen.getByText(/What we do here —/)).toBeInTheDocument();
  });

  it('does not claim nothing is written while showing something that is', async () => {
    render(
      <Harness
        seed={(company) => {
          // Mobile response written, on-field capability still blank — the exact
          // state that produced a strip contradicting itself in the browser.
          company.saveSupportField({
            icao: 'KASE',
            field: 'mobileResponse',
            value: 'Dispatched from KDEN, 3.5 hr road.',
            savedBy: 'dom-1',
          });
        }}
      />,
    );

    expect(await screen.findByText(/Dispatched from KDEN/)).toBeInTheDocument();
    expect(screen.queryByText(/Nobody has written what maintenance is available/)).toBeNull();
    expect(screen.getByText(/Nothing recorded about on-field capability/)).toBeInTheDocument();
  });

  it('offers no editing affordance on the crew lens', async () => {
    render(
      <Harness
        seed={(company) => {
          company.saveSupportField({
            icao: 'KASE',
            field: 'groundKit',
            value: 'GPU yes, air start no, hangar no.',
            savedBy: 'dom-1',
          });
        }}
      />,
    );

    await screen.findByText(/Maintenance support here/);
    expect(screen.queryByRole('button', { name: /Edit Ground kit/i })).not.toBeInTheDocument();
  });
});
