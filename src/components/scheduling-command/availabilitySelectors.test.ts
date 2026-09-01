import { describe, expect, it } from 'vitest';
import { buildFleetAvailability, type AvailabilityInput } from '../../availability/engine/availability';
import type { CrewRecord } from '../crew/crewRecords';
import type { MaintenanceDowntimeBlock, SchedulerOverlay } from '../../availability/types';
import type { TripRecord } from '../../scheduling/store/types';
import { cellAt, groupConflicts, summarizeAvailability, tailsNeedingEtr } from './availabilitySelectors';

const NOW = '2026-09-01T12:00:00.000Z';

const pilot = (id: string, role: CrewRecord['role']): CrewRecord => ({
  id, name: id, role, dutyHoursUsed: 0, dutyLimitHours: 14,
  flightHours30d: 0, flightHoursLimit30d: 100,
  currencyExpiresUtc: '2027-01-01T00:00:00.000Z',
  medicalExpiresUtc: '2027-01-01T00:00:00.000Z',
  trainingDueUtc: '2027-01-01T00:00:00.000Z',
});

const ROSTER = [pilot('P1', 'PIC'), pilot('P2', 'PIC'), pilot('S1', 'SIC'), pilot('S2', 'SIC')];

const BLOCK: MaintenanceDowntimeBlock = {
  id: 'mx-1', tail: 'N1PG', maintenanceType: 'Inspection', category: 'Inspection',
  description: 'inspection', airportIcao: 'KLUK', vendorName: 'V', woNumber: 'WO-1',
  scheduledStartUtc: '2026-09-02T08:00:00.000Z', scheduledEndUtc: '2026-09-04T18:00:00.000Z',
  actualStartUtc: null, actualEndUtc: null, cancelled: false, released: false,
  createdBy: 'x', createdAtUtc: NOW, modifiedBy: null, modifiedAtUtc: null,
  source: 'local', sourceRef: null,
};

const TRIP: TripRecord = {
  id: 't1', tripNumber: 'TRP-001', sourceSystem: 'manual', sourceTripRef: null,
  tail: 'N1PG', aircraftType: 'G650ER', tripType: 'domestic', priority: 'standard',
  status: 'confirmed', startDate: '2026-09-03T00:00:00.000Z', endDate: '2026-09-03T00:00:00.000Z',
  legs: [], createdBy: 'x', createdAtUtc: NOW,
};

const HOLD: SchedulerOverlay = {
  id: 'ov-1', kind: 'hold', tail: 'N2PG', fromDateUtc: '2026-09-05', toDateUtc: '2026-09-06',
  reasonNote: 'board week', publicLabel: 'Held by scheduling',
  createdBy: 'Dana', createdByRole: 'scheduling', createdAtUtc: NOW,
};

function fleetWith(over: Partial<AvailabilityInput> = {}) {
  return buildFleetAvailability({
    tails: [{ tail: 'N1PG', type: 'G650ER' }, { tail: 'N2PG', type: 'G650ER' }],
    trips: [], downtime: [], crewRoster: ROSTER, crewCoverage: [], overlays: [],
    tailStatus: {}, tailHeadline: {}, tripAlerts: [],
    ...over,
  }, NOW, 7);
}

describe('summarizeAvailability', () => {
  it('counts an all-clear fleet as fully open', () => {
    const s = summarizeAvailability(fleetWith());
    expect(s.totalTailDays).toBe(14);
    expect(s.openTailDays).toBe(14);
    expect(s.tailsDown).toBe(0);
    expect(s.conflictCount).toBe(0);
  });

  it('counts a tail down and does not list it as needing an ETR when it has a block', () => {
    const s = summarizeAvailability(fleetWith({ downtime: [BLOCK] }));
    expect(s.tailsDown).toBe(1);
    expect(s.tailsDownWithoutEtr).toEqual([]);
  });

  it('lists a RED tail with no block as needing an ETR — the LG-308 prompt', () => {
    const s = summarizeAvailability(fleetWith({ tailStatus: { N2PG: 'RED' } }));
    expect(s.tailsDownWithoutEtr).toEqual(['N2PG']);
  });

  it('counts held tail-days', () => {
    expect(summarizeAvailability(fleetWith({ overlays: [HOLD] })).heldTailDays).toBe(2);
  });

  it('counts distinct days with no crew, not tail-days', () => {
    const s = summarizeAvailability(fleetWith({ crewRoster: [pilot('P1', 'PIC')] }));
    expect(s.daysWithNoCrew).toBe(7);
  });
});

describe('groupConflicts', () => {
  it('groups a trip booked into a maintenance window under its own heading', () => {
    const groups = groupConflicts(fleetWith({ downtime: [BLOCK], trips: [TRIP] }));
    expect(groups.map(g => g.kind)).toContain('trip-in-downtime');
    expect(groups.find(g => g.kind === 'trip-in-downtime')!.label).toContain('maintenance window');
  });

  it('returns nothing when there is nothing to resolve', () => {
    expect(groupConflicts(fleetWith())).toEqual([]);
  });

  it('orders groups most-severe first', () => {
    const groups = groupConflicts(fleetWith({ downtime: [BLOCK], trips: [TRIP] }));
    expect(groups[0].kind).toBe('trip-in-downtime');
  });
});

describe('helpers', () => {
  it('tailsNeedingEtr names a RED tail with no block at all', () => {
    expect(tailsNeedingEtr(fleetWith({ tailStatus: { N1PG: 'RED' } }))).toEqual(['N1PG']);
  });

  it('still names a RED tail whose block covers only PART of the window', () => {
    // BLOCK runs 2 Sep - 4 Sep; the tail is RED for all seven days, so 5-7 Sep have no booked
    // return. The prompt is correct: scheduling needs a second window, or a longer one.
    expect(tailsNeedingEtr(fleetWith({ tailStatus: { N1PG: 'RED' }, downtime: [BLOCK] })))
      .toEqual(['N1PG']);
  });

  it('does NOT name a tail whose block covers the whole window', () => {
    const wide = { ...BLOCK, scheduledStartUtc: '2026-09-01T00:00:00.000Z', scheduledEndUtc: '2026-09-30T00:00:00.000Z' };
    expect(tailsNeedingEtr(fleetWith({ tailStatus: { N1PG: 'RED' }, downtime: [wide] }))).toEqual([]);
  });

  it('cellAt finds a cell and returns null for an unknown tail or day', () => {
    const fleet = fleetWith();
    expect(cellAt(fleet, 'N1PG', '2026-09-02')?.dateUtc).toBe('2026-09-02');
    expect(cellAt(fleet, 'N9XX', '2026-09-02')).toBeNull();
    expect(cellAt(fleet, 'N1PG', '2030-01-01')).toBeNull();
  });
});
