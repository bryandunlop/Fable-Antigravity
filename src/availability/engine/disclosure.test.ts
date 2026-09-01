import { describe, expect, it } from 'vitest';
import type { CrewRecord } from '../../components/crew/crewRecords';
import type { TripRecord } from '../../scheduling/store/types';
import type { Audience, MaintenanceDowntimeBlock, SchedulerOverlay } from '../types';
import { buildFleetAvailability, type AvailabilityInput } from './availability';
import { categoryLabel, disclose, discloseCell, shortDate } from './disclosure';

const NOW = '2026-09-01T12:00:00.000Z';

// Every operator-only string in the fixture is a unique sentinel, so the leakage tests assert on
// actual values rather than on a hand-maintained list of field names.
//
// Two classes, and the distinction is load-bearing:

/** Reaches the cell model (as reason.detail / conflict.detail) and is withheld at disclosure. */
const MODEL_SECRETS = [
  'SENTINEL_DEFECT_TEXT',
  'SENTINEL_HOLD_NOTE',
  'SENTINEL_HEADLINE',
  'SENTINEL_ALERT_DETAIL',
];

/**
 * Never enters the cell model at all — a stronger guarantee than withholding, because there is
 * nothing to withhold. Vendor, work order and crew names live on the block and the roster; only
 * surfaces that read those directly (the downtime dialog, the scheduler hover card) ever see
 * them, and no availability cell can carry them to an executive by accident.
 */
const NEVER_IN_MODEL_SECRETS = ['SENTINEL_VENDOR', 'SENTINEL_WO', 'SENTINEL_CREW'];

function pilot(id: string, role: CrewRecord['role']): CrewRecord {
  return {
    id, name: `SENTINEL_CREW_${id}`, role,
    dutyHoursUsed: 0, dutyLimitHours: 14, flightHours30d: 10, flightHoursLimit30d: 100,
    currencyExpiresUtc: '2027-01-01T00:00:00.000Z',
    medicalExpiresUtc: '2027-01-01T00:00:00.000Z',
    trainingDueUtc: '2027-01-01T00:00:00.000Z',
  };
}

const BLOCK: MaintenanceDowntimeBlock = {
  id: 'mx-1', tail: 'N1PG', maintenanceType: 'Scheduled inspection', category: 'Inspection',
  description: 'SENTINEL_DEFECT_TEXT', airportIcao: 'KLUK',
  vendorName: 'SENTINEL_VENDOR', woNumber: 'SENTINEL_WO',
  scheduledStartUtc: '2026-09-05T08:00:00.000Z', scheduledEndUtc: '2026-09-07T18:00:00.000Z',
  actualStartUtc: null, actualEndUtc: null, cancelled: false, released: false,
  createdBy: 'USR005', createdAtUtc: NOW, modifiedBy: null, modifiedAtUtc: null,
  source: 'local', sourceRef: null,
};

const TRIP: TripRecord = {
  id: 't1', tripNumber: 'TRP-001', sourceSystem: 'manual', sourceTripRef: null,
  tail: 'N1PG', aircraftType: 'G650ER', tripType: 'domestic', priority: 'standard',
  status: 'confirmed', startDate: '2026-09-02T00:00:00.000Z', endDate: '2026-09-03T00:00:00.000Z',
  legs: [{ id: 'l1', sequence: 1, departureIcao: 'KCVG', arrivalIcao: 'KTEB', departureTimeUtc: '2026-09-02T14:00:00.000Z', paxCount: 4 }],
  createdBy: 'test', createdAtUtc: NOW,
};

/**
 * A trip booked INTO the maintenance window (BLOCK runs 5-7 Sep). This is the trip-in-downtime
 * conflict the model already raises, and it is the case that makes the maintenance-day disclosure
 * assertions non-vacuous: the committed reason stays in the stack while maintenance wins.
 */
const TRIP_IN_DOWNTIME: TripRecord = {
  ...TRIP,
  id: 't2', tripNumber: 'TRP-002',
  startDate: '2026-09-05T00:00:00.000Z', endDate: '2026-09-06T00:00:00.000Z',
  legs: [{ id: 'l2', sequence: 1, departureIcao: 'KCVG', arrivalIcao: 'KTEB', departureTimeUtc: '2026-09-05T14:00:00.000Z', paxCount: 4 }],
};

const HOLD: SchedulerOverlay = {
  id: 'ov-1', kind: 'hold', tail: 'N2PG',
  fromDateUtc: '2026-09-04', toDateUtc: '2026-09-05',
  reasonNote: 'SENTINEL_HOLD_NOTE', publicLabel: 'Held by scheduling — board week',
  createdBy: 'Dana Whitfield', createdByRole: 'scheduling', createdAtUtc: '2026-09-01T09:00:00.000Z',
};

/** A grid exercising every reason category at once. */
const INPUT: AvailabilityInput = {
  tails: [{ tail: 'N1PG', type: 'G650ER' }, { tail: 'N2PG', type: 'G650ER' }, { tail: 'N5PG', type: 'G500' }],
  trips: [TRIP, TRIP_IN_DOWNTIME],
  downtime: [BLOCK],
  crewRoster: [pilot('P1', 'PIC'), pilot('S1', 'SIC')],
  crewCoverage: [{ crewId: 'P1', dateUtc: '2026-09-09', status: 'leave', note: 'SENTINEL_CREW_LEAVE' }],
  overlays: [HOLD],
  tailStatus: { N5PG: 'RED' },
  tailHeadline: { N5PG: 'SENTINEL_HEADLINE' },
  tripAlerts: [{
    kind: 'RED_AT_ETD', severity: 'red', tripId: 't1', tripNumber: 'TRP-001', tail: 'N1PG',
    etdUtc: '2026-09-02T14:00:00.000Z', detail: 'SENTINEL_ALERT_DETAIL',
  }],
};

const FLEET = buildFleetAvailability(INPUT, NOW, 10);

function categoriesSeen(audience: Audience): Set<string> {
  return new Set(disclose(FLEET, audience).rows.flatMap(r => r.cells.map(c => c.category)));
}

describe('the fixture actually exercises the whole model', () => {
  it('produces every reason category, so the leakage test is not vacuous', () => {
    const seen = categoriesSeen('operator');
    for (const c of ['maintenance', 'committed', 'held', 'no-crew', 'none']) {
      expect(seen, `fixture never produced ${c}`).toContain(c);
    }
  });

  it('the operator view really does carry the withheld text — otherwise nothing is being withheld', () => {
    const json = JSON.stringify(disclose(FLEET, 'operator'));
    for (const secret of MODEL_SECRETS) {
      expect(json, `operator view lost ${secret}`).toContain(secret);
    }
  });

  it('vendor, work order and crew names never enter the model, for any audience', () => {
    for (const audience of ['executive', 'executive-full', 'operator'] as const) {
      const json = JSON.stringify(disclose(FLEET, audience));
      for (const secret of NEVER_IN_MODEL_SECRETS) {
        expect(json, `${audience} carried ${secret}, which should never reach a cell`).not.toContain(secret);
      }
    }
  });
});

describe('leakage — the gate for this slice', () => {
  for (const audience of ['executive', 'executive-full'] as const) {
    it(`${audience} sees no operator-only text anywhere in the grid`, () => {
      const json = JSON.stringify(disclose(FLEET, audience));
      for (const secret of [...MODEL_SECRETS, ...NEVER_IN_MODEL_SECRETS]) {
        expect(json, `${audience} leaked ${secret}`).not.toContain(secret);
      }
    });

    it(`${audience} carries no reasons, conflicts, overlay note or crew counts`, () => {
      for (const row of disclose(FLEET, audience).rows) {
        for (const cell of row.cells) {
          expect(cell.reasons).toBeUndefined();
          expect(cell.conflicts).toBeUndefined();
          expect(cell.overlayNote).toBeUndefined();
          expect(cell.crew).toBeUndefined();
        }
      }
    });
  }
});

describe('what each audience does get', () => {
  const maintenanceCell = () =>
    FLEET.rows[0].cells.find(c => c.reason.category === 'maintenance')!;
  const committedCell = () =>
    FLEET.rows[0].cells.find(c => c.reason.category === 'committed')!;
  const heldCell = () =>
    FLEET.rows[1].cells.find(c => c.reason.category === 'held')!;

  it('executive gets the category sentence and the ETR, and nothing else', () => {
    const c = discloseCell(maintenanceCell(), 'executive');
    expect(c.label).toBe('In maintenance until 7 Sep');
    expect(c.untilUtc).toBe('2026-09-07T18:00:00.000Z');
    expect(c.scheduleLabel).toBeUndefined();
    expect(c.tripId).toBeUndefined();
    expect(c.publicLabel).toBeUndefined();
  });

  it('executive sees no route on a committed day', () => {
    expect(discloseCell(committedCell(), 'executive').scheduleLabel).toBeUndefined();
  });

  it('executive-full sees the route and the trip', () => {
    const c = discloseCell(committedCell(), 'executive-full');
    expect(c.scheduleLabel).toContain('KCVG → KTEB');
    expect(c.tripId).toBe('t1');
  });

  it('executive-full sees the hold label but not the hold note', () => {
    const c = discloseCell(heldCell(), 'executive-full');
    expect(c.publicLabel).toBe('Held by scheduling — board week');
    expect(c.overlayNote).toBeUndefined();
  });

  it('the maintenance cell really does have a trip underneath it — otherwise the next test is vacuous', () => {
    const cell = maintenanceCell();
    expect(cell.reason.category).toBe('maintenance');
    expect(cell.reasons.some(r => r.category === 'committed')).toBe(true);
    expect(cell.tripId).toBe('t2');
    expect(cell.conflicts.map(c => c.kind)).toContain('trip-in-downtime');
  });

  it('executive-full discloses NO schedule text and NO trip id on a maintenance day', () => {
    const disclosed = discloseCell(maintenanceCell(), 'executive-full');
    expect(disclosed.scheduleLabel).toBeNull();
    expect(disclosed.tripId).toBeNull();
    expect(JSON.stringify(disclosed)).not.toContain('TRP-002');
  });

  it('operator still sees the trip underneath a maintenance day — that is the conflict to resolve', () => {
    const disclosed = discloseCell(maintenanceCell(), 'operator');
    expect(disclosed.reasons?.some(r => r.category === 'committed')).toBe(true);
    expect(disclosed.conflicts?.map(c => c.kind)).toContain('trip-in-downtime');
  });

  it('operator sees the ranked stack, the conflicts and the crew counts', () => {
    const c = discloseCell(committedCell(), 'operator');
    expect(c.reasons?.length).toBeGreaterThan(0);
    expect(c.conflicts?.map(x => x.kind)).toContain('trip-on-red-tail');
    expect(c.crew).toBeDefined();
  });

  it('every audience agrees on state and category — only detail differs', () => {
    const cell = maintenanceCell();
    const states = (['executive', 'executive-full', 'operator'] as const)
      .map(a => discloseCell(cell, a));
    expect(new Set(states.map(s => s.state)).size).toBe(1);
    expect(new Set(states.map(s => s.category)).size).toBe(1);
    expect(new Set(states.map(s => s.label)).size).toBe(1);
  });
});

describe('categoryLabel is composed, never looked up', () => {
  it('says maintenance with a date when there is one', () => {
    expect(categoryLabel('maintenance', '2026-09-12T18:00:00.000Z')).toBe('In maintenance until 12 Sep');
  });

  it('says so plainly when there is no return date — the LG-308 prompt', () => {
    expect(categoryLabel('maintenance', null)).toBe('Unavailable — no return date set');
  });

  it('covers the remaining categories', () => {
    expect(categoryLabel('no-crew', null)).toBe('No crew that day');
    expect(categoryLabel('held', '2026-09-05')).toBe('Held by scheduling');
    expect(categoryLabel('committed', null)).toBe('Already committed');
    expect(categoryLabel('committed', '2026-09-04T00:00:00.000Z')).toBe('Already committed until 4 Sep');
    expect(categoryLabel('none', null)).toBeNull();
  });

  it('tolerates an unparseable date rather than rendering NaN', () => {
    expect(shortDate('not-a-date')).toBeNull();
    expect(categoryLabel('maintenance', 'not-a-date')).toBe('Unavailable — no return date set');
  });
});
