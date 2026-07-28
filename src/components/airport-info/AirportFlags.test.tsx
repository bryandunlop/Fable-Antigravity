import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import type { AirportRecord } from '../../airport/types';
import { AirportFlags } from './AirportFlags';
import { CompanyAirportProvider, RULES_KEY } from './CompanyAirportContext';

function airport(overrides: Partial<AirportRecord> = {}): AirportRecord {
  return {
    id: 'ASE',
    icaoId: 'KASE',
    siteNo: '02517.',
    siteTypeCode: 'A',
    name: 'ASPEN-PITKIN COUNTY/SARDY FLD',
    city: 'ASPEN',
    stateCode: 'CO',
    countyName: 'PITKIN',
    countryCode: 'US',
    latitude: 39.22,
    longitude: -106.86,
    elevationFt: 7820,
    magneticVariation: '9E',
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
    fuelTypes: ['100LL', 'A'],
    otherServices: [],
    contractFuelAvailable: null,
    airportLightingSchedule: null,
    beaconLightingSchedule: null,
    lastInspection: null,
    runways: [
      {
        runwayId: '15/33',
        lengthFt: 8006,
        widthFt: 100,
        surfaceTypeCode: 'ASPH',
        condition: 'GOOD',
        treatmentCode: null,
        lightingCode: 'HIGH',
        pavement: { classification: null, alsoPublished: null, grossWeight: null },
        ends: [
          {
            endId: '15',
            trueAlignmentDeg: 160,
            elevationFt: 7680,
            displacedThresholdFt: null,
            gradientPct: null,
            approachLightingCode: 'MALSF',
            ilsType: null,
            markingTypeCode: null,
            declaredDistances: { toraFt: 7006, todaFt: 7006, asdaFt: 7006, ldaFt: 7006 },
          },
        ],
      },
    ],
    attendance: [],
    contacts: [],
    effectiveDate: '2026/07/09',
    ...overrides,
  };
}

describe('AirportFlags', () => {
  beforeEach(() => {
    localStorage.removeItem(RULES_KEY);
  });

  it('flags a high-elevation airport from the seeded rules', () => {
    render(
      <CompanyAirportProvider>
        <AirportFlags airport={airport()} />
      </CompanyAirportProvider>,
    );

    expect(screen.getByText('High elevation')).toBeInTheDocument();
    expect(screen.getByText(/density altitude will bite/i)).toBeInTheDocument();
  });

  it('renders nothing for an airport no rule matches', () => {
    const { container } = render(
      <CompanyAirportProvider>
        <AirportFlags airport={airport({ elevationFt: 20 })} />
      </CompanyAirportProvider>,
    );

    expect(screen.queryByText('High elevation')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('does not flag a short runway on an 8,006 ft field', () => {
    render(
      <CompanyAirportProvider>
        <AirportFlags airport={airport()} />
      </CompanyAirportProvider>,
    );

    expect(screen.queryByText('Short runway')).not.toBeInTheDocument();
  });

  it('flags an airport publishing no declared distances', () => {
    const noDistances = airport({
      elevationFt: 20,
      runways: [
        {
          ...airport().runways[0],
          ends: [{ ...airport().runways[0].ends[0], declaredDistances: null }],
        },
      ],
    });

    render(
      <CompanyAirportProvider>
        <AirportFlags airport={noDistances} />
      </CompanyAirportProvider>,
    );

    expect(screen.getByText(/no declared distances published/i)).toBeInTheDocument();
    expect(screen.getByText(/do not substitute runway length/i)).toBeInTheDocument();
  });
});
