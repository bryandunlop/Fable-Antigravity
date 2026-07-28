import { describe, expect, it } from 'vitest';

import type { AirportRecord } from '../types';
import { FLAG_FIELDS, airportFacts, evaluateRule, operatorsFor, type FlagRule } from './rules';

function airport(overrides: Partial<AirportRecord> = {}): AirportRecord {
  return {
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
    runways: [
      {
        runwayId: '01/19',
        lengthFt: 6997,
        widthFt: 150,
        surfaceTypeCode: 'ASPH',
        condition: 'GOOD',
        treatmentCode: 'GRVD',
        lightingCode: 'HIGH',
        pavement: { classification: null, alsoPublished: null, grossWeight: null },
        ends: [
          {
            endId: '01',
            trueAlignmentDeg: 3,
            elevationFt: 8.3,
            displacedThresholdFt: 770,
            gradientPct: null,
            approachLightingCode: null,
            ilsType: null,
            markingTypeCode: null,
            declaredDistances: { toraFt: 6997, todaFt: 6997, asdaFt: 6929, ldaFt: 6159 },
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

function rule(overrides: Partial<FlagRule> = {}): FlagRule {
  return {
    id: 'r1',
    label: 'Short runway',
    severity: 'caution',
    appliesTo: [],
    showOnPilotWorkspace: true,
    group: { combine: 'AND', conditions: [] },
    ...overrides,
  };
}

describe('airportFacts', () => {
  it('derives the runway numbers a rule can be written against', () => {
    const facts = airportFacts(airport());

    expect(facts.longestRunwayFt).toBe(6997);
    expect(facts.shortestLdaFt).toBe(6159);
    expect(facts.hasDeclaredDistances).toBe(true);
  });

  it('reports no declared distances rather than inventing them', () => {
    const bare = airport({
      runways: [
        {
          runwayId: '02/20',
          lengthFt: 5003,
          widthFt: 100,
          surfaceTypeCode: 'ASPH',
          condition: 'GOOD',
          treatmentCode: null,
          lightingCode: 'MED',
          pavement: { classification: null, alsoPublished: null, grossWeight: null },
          ends: [
            {
              endId: '02',
              trueAlignmentDeg: null,
              elevationFt: null,
              displacedThresholdFt: null,
              gradientPct: null,
              approachLightingCode: null,
              ilsType: null,
              markingTypeCode: null,
              declaredDistances: null,
            },
          ],
        },
      ],
    });

    const facts = airportFacts(bare);
    expect(facts.hasDeclaredDistances).toBe(false);
    // Must be null, never the runway length standing in for a distance nobody published.
    expect(facts.shortestLdaFt).toBeNull();
    expect(facts.longestRunwayFt).toBe(5003);
  });
});

describe('the field allow-list', () => {
  it('excludes weight-bearing fields until the unit is confirmed (TL-31)', () => {
    // A rule comparing an unlabelled number against an aircraft weight is exactly
    // the 1000x error TL-31 exists to prevent, so the field must not be offerable.
    const names = FLAG_FIELDS.map((field) => field.key.toLowerCase());

    expect(names.some((n) => n.includes('weight') || n.includes('grosswt'))).toBe(false);
  });

  it('offers only operators that suit the field type', () => {
    expect(operatorsFor('longestRunwayFt')).toContain('lt');
    expect(operatorsFor('longestRunwayFt')).not.toContain('contains');
    expect(operatorsFor('surfaces')).toContain('contains');
    expect(operatorsFor('surfaces')).not.toContain('lt');
    expect(operatorsFor('customsAvailable')).toEqual(['isTrue', 'isFalse']);
  });
});

describe('evaluateRule', () => {
  it('matches a short-runway rule', () => {
    const shortRunway = rule({
      group: {
        combine: 'AND',
        conditions: [{ field: 'longestRunwayFt', operator: 'lt', value: 7000 }],
      },
    });

    expect(evaluateRule(shortRunway, airport())).toBe(true);
  });

  it('does not match when the condition is not met', () => {
    const shortRunway = rule({
      group: {
        combine: 'AND',
        conditions: [{ field: 'longestRunwayFt', operator: 'lt', value: 6000 }],
      },
    });

    expect(evaluateRule(shortRunway, airport())).toBe(false);
  });

  it('requires every condition under AND', () => {
    const both = rule({
      group: {
        combine: 'AND',
        conditions: [
          { field: 'longestRunwayFt', operator: 'lt', value: 7000 },
          { field: 'customsAvailable', operator: 'isTrue' },
        ],
      },
    });

    expect(evaluateRule(both, airport())).toBe(false);
  });

  it('requires only one condition under OR', () => {
    const either = rule({
      group: {
        combine: 'OR',
        conditions: [
          { field: 'longestRunwayFt', operator: 'lt', value: 7000 },
          { field: 'customsAvailable', operator: 'isTrue' },
        ],
      },
    });

    expect(evaluateRule(either, airport())).toBe(true);
  });

  it('matches on a list field with contains', () => {
    const noJetA = rule({
      group: {
        combine: 'AND',
        conditions: [{ field: 'fuelTypes', operator: 'notContains', value: 'A' }],
      },
    });

    expect(evaluateRule(noJetA, airport())).toBe(false);
    expect(evaluateRule(noJetA, airport({ fuelTypes: ['100LL'] }))).toBe(true);
  });

  it('matches an untowered airport', () => {
    const untowered = rule({
      group: {
        combine: 'AND',
        conditions: [{ field: 'towerTypeCode', operator: 'isEmpty' }],
      },
    });

    expect(evaluateRule(untowered, airport())).toBe(false);
    expect(evaluateRule(untowered, airport({ towerTypeCode: null }))).toBe(true);
  });

  it('flags an airport that publishes no declared distances', () => {
    const unpublished = rule({
      group: {
        combine: 'AND',
        conditions: [{ field: 'hasDeclaredDistances', operator: 'isFalse' }],
      },
    });

    expect(evaluateRule(unpublished, airport())).toBe(false);
  });

  it('never matches on an empty condition set', () => {
    // An empty rule matching everything would flag all 2,128 airports the moment
    // someone opened the builder and saved without adding a condition.
    expect(evaluateRule(rule(), airport())).toBe(false);
  });

  it('does not match when the fact is null rather than comparing against null', () => {
    const highField = rule({
      group: {
        combine: 'AND',
        conditions: [{ field: 'shortestLdaFt', operator: 'lt', value: 5000 }],
      },
    });

    const noDistances = airport({
      runways: [
        {
          ...airport().runways[0],
          ends: [{ ...airport().runways[0].ends[0], declaredDistances: null }],
        },
      ],
    });

    // shortestLdaFt is null — unknown is not "less than 5000".
    expect(evaluateRule(highField, noDistances)).toBe(false);
  });
});

describe('aircraft applicability', () => {
  it('applies to every type when appliesTo is empty', () => {
    const anyType = rule({
      appliesTo: [],
      group: {
        combine: 'AND',
        conditions: [{ field: 'longestRunwayFt', operator: 'lt', value: 7000 }],
      },
    });

    expect(evaluateRule(anyType, airport(), 'G650ER')).toBe(true);
  });

  it('does not apply to a type outside its list', () => {
    const g650Only = rule({
      appliesTo: ['G650ER'],
      group: {
        combine: 'AND',
        conditions: [{ field: 'longestRunwayFt', operator: 'lt', value: 7000 }],
      },
    });

    expect(evaluateRule(g650Only, airport(), 'G650ER')).toBe(true);
    expect(evaluateRule(g650Only, airport(), 'G500')).toBe(false);
  });
});
