import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AirportRecord } from '../../airport/types';
import AirportReferenceDetail from './AirportReferenceDetail';
import { CompanyAirportProvider } from './CompanyAirportContext';

/**
 * Guards against the facade-control failure mode: a primary action that looks
 * live, invites a click in its own body copy, and silently does nothing. A fresh
 * reviewer found exactly that here — "Propose a change" was always enabled while
 * the propose/review/publish flow (D46) is unwired.
 */

const airport: AirportRecord = {
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
};

function renderDetail(onSubmitCorrection?: () => void) {
  return render(
    <CompanyAirportProvider>
      <AirportReferenceDetail
        airport={airport}
        onBack={() => {}}
        onSubmitCorrection={onSubmitCorrection}
      />
    </CompanyAirportProvider>,
  );
}

describe('AirportReferenceDetail — propose a change', () => {
  it('disables the control when no handler is wired', () => {
    renderDetail();

    expect(screen.getByRole('button', { name: /propose a change/i })).toBeDisabled();
    expect(screen.getByText(/not wired up yet/i)).toBeInTheDocument();
  });

  it('does not tell the user to press a control that does nothing', () => {
    renderDetail();

    // The company-page copy must not invite a click on a disabled control.
    expect(screen.queryByText(/use .propose a change./i)).not.toBeInTheDocument();
    expect(screen.getByText(/proposing changes is not available here/i)).toBeInTheDocument();
  });

  it('enables the control once a handler is supplied, and then invites the click', () => {
    renderDetail(vi.fn());

    expect(screen.getByRole('button', { name: /propose a change/i })).toBeEnabled();
    expect(screen.queryByText(/not wired up/i)).not.toBeInTheDocument();
    expect(screen.getByText(/use .propose a change./i)).toBeInTheDocument();
  });
});

describe('AirportReferenceDetail — the NASR cycle is a calendar date', () => {
  it('does not shift the cycle a day earlier west of UTC', () => {
    renderDetail();

    // Formatting 2026/07/09 through a US timezone as an instant renders 8 Jul.
    expect(screen.getAllByText(/Jul 9, 2026/).length).toBeGreaterThan(0);
  });
});
