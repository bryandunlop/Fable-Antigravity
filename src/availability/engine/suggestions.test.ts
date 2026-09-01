import { describe, expect, it } from 'vitest';
import type { CrewRecord } from '../../components/crew/crewRecords';
import type { TripRecord } from '../../scheduling/store/types';
import type { MaintenanceDowntimeBlock, SchedulerOverlay } from '../types';
import { buildFleetAvailability, type AvailabilityInput } from './availability';
import { deriveReleaseSuggestions, isDismissed, overlayFromSuggestion } from './suggestions';

const NOW = '2026-09-01T12:00:00.000Z';

function pilot(id: string, role: CrewRecord['role']): CrewRecord {
  return {
    id, name: `Pilot ${id}`, role,
    dutyHoursUsed: 0, dutyLimitHours: 14, flightHours30d: 10, flightHoursLimit30d: 100,
    currencyExpiresUtc: '2027-01-01T00:00:00.000Z',
    medicalExpiresUtc: '2027-01-01T00:00:00.000Z',
    trainingDueUtc: '2027-01-01T00:00:00.000Z',
  };
}

const ROSTER = [pilot('P1', 'PIC'), pilot('P2', 'PIC'), pilot('S1', 'SIC'), pilot('S2', 'SIC')];

function block(over: Partial<MaintenanceDowntimeBlock> = {}): MaintenanceDowntimeBlock {
  return {
    id: 'mx-1', tail: 'N1PG', maintenanceType: 'Scheduled inspection', category: 'Inspection',
    description: 'inspection', airportIcao: 'KLUK', vendorName: 'Vendor', woNumber: 'WO-1',
    scheduledStartUtc: '2026-09-02T08:00:00.000Z', scheduledEndUtc: '2026-09-06T18:00:00.000Z',
    actualStartUtc: '2026-09-02T08:00:00.000Z', actualEndUtc: null,
    cancelled: false, released: false,
    createdBy: 'USR005', createdAtUtc: NOW, modifiedBy: null, modifiedAtUtc: null,
    source: 'local', sourceRef: null,
    ...over,
  };
}

function trip(over: Partial<TripRecord> = {}): TripRecord {
  return {
    id: 't1', tripNumber: 'TRP-001', sourceSystem: 'manual', sourceTripRef: null,
    tail: 'N1PG', aircraftType: 'G650ER', tripType: 'domestic', priority: 'standard',
    status: 'confirmed', startDate: '2026-09-03T00:00:00.000Z', endDate: '2026-09-04T00:00:00.000Z',
    legs: [], createdBy: 'test', createdAtUtc: NOW,
    ...over,
  };
}

function hold(over: Partial<SchedulerOverlay> = {}): SchedulerOverlay {
  return {
    id: 'ov-1', kind: 'hold', tail: 'N1PG',
    fromDateUtc: '2026-09-03', toDateUtc: '2026-09-04',
    reasonNote: 'Board week', publicLabel: 'Held by scheduling',
    createdBy: 'Dana Whitfield', createdByRole: 'scheduling', createdAtUtc: '2026-08-25T09:00:00.000Z',
    ...over,
  };
}

function input(over: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    tails: [{ tail: 'N1PG', type: 'G650ER' }],
    trips: [], downtime: [], crewRoster: ROSTER, crewCoverage: [], overlays: [],
    tailStatus: {}, tailHeadline: {}, tripAlerts: [],
    ...over,
  };
}

function suggest(over: Partial<AvailabilityInput> = {}, nowUtc = NOW) {
  const args = input(over);
  const fleet = buildFleetAvailability(args, nowUtc, 10);
  return deriveReleaseSuggestions(args, fleet, args.overlays, nowUtc);
}

describe('downtime-ended-early', () => {
  it('fires when the actual end beat the scheduled one', () => {
    const s = suggest({ downtime: [block({ actualEndUtc: '2026-09-03T10:00:00.000Z' })] });
    expect(s.map(x => x.trigger)).toContain('downtime-ended-early');
    const found = s.find(x => x.trigger === 'downtime-ended-early')!;
    expect(found.fromDateUtc).toBe('2026-09-04');
    expect(found.toDateUtc).toBe('2026-09-06');
  });

  it('fires when the ops-board released flag is set mid-window', () => {
    expect(suggest({ downtime: [block({ released: true })] }).map(x => x.trigger))
      .toContain('downtime-ended-early');
  });

  it('fires when the block was cancelled', () => {
    expect(suggest({ downtime: [block({ cancelled: true })] }).map(x => x.trigger))
      .toContain('downtime-ended-early');
  });

  it('does NOT fire on a block running exactly to schedule', () => {
    expect(suggest({ downtime: [block()] }).map(x => x.trigger))
      .not.toContain('downtime-ended-early');
  });

  it('does NOT fire on a block whose window has already passed', () => {
    const past = block({ scheduledStartUtc: '2026-08-01T08:00:00.000Z', scheduledEndUtc: '2026-08-05T18:00:00.000Z', released: true });
    expect(suggest({ downtime: [past] })).toHaveLength(0);
  });

  it('does NOT fire on an overrun — the aeroplane is still in the hangar', () => {
    expect(suggest({ downtime: [block({ actualEndUtc: '2026-09-08T10:00:00.000Z' })] }).map(x => x.trigger))
      .not.toContain('downtime-ended-early');
  });
});

describe('hold-unclaimed', () => {
  it('fires on a near hold nothing is booked against', () => {
    expect(suggest({ overlays: [hold()] }).map(x => x.trigger)).toContain('hold-unclaimed');
  });

  it('does NOT fire when a trip has been booked into the held window', () => {
    expect(suggest({ overlays: [hold()], trips: [trip()] }).map(x => x.trigger))
      .not.toContain('hold-unclaimed');
  });

  it('ignores a CANCELLED trip in the window — that is not a claim', () => {
    const s = suggest({ overlays: [hold()], trips: [trip({ status: 'cancelled' })] });
    expect(s.map(x => x.trigger)).toContain('hold-unclaimed');
  });

  it('does NOT fire on a hold still far out', () => {
    const far = hold({ fromDateUtc: '2026-10-20', toDateUtc: '2026-10-22' });
    expect(suggest({ overlays: [far] }).map(x => x.trigger)).not.toContain('hold-unclaimed');
  });

  it('does NOT fire on a hold already superseded by a release', () => {
    const s = suggest({
      overlays: [hold(), { ...hold(), id: 'ov-2', kind: 'release', supersedesOverlayId: 'ov-1', createdAtUtc: NOW }],
    });
    expect(s.map(x => x.trigger)).not.toContain('hold-unclaimed');
  });
});

describe('crew-resolvable', () => {
  it('fires when crews exist but are all committed — a scheduler can rejig that', () => {
    // One crew formable, two trips flying that day: the tail reads no-crew, but the shortfall
    // is a rostering problem rather than a legality one.
    const s = suggest({
      crewRoster: [pilot('P1', 'PIC'), pilot('S1', 'SIC')],
      trips: [
        trip({ id: 'a', tail: 'N9XX', startDate: '2026-09-03T00:00:00.000Z', endDate: '2026-09-03T00:00:00.000Z' }),
        trip({ id: 'b', tail: 'N8XX', startDate: '2026-09-03T00:00:00.000Z', endDate: '2026-09-03T00:00:00.000Z' }),
      ],
    });
    const found = s.filter(x => x.trigger === 'crew-resolvable');
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].rationale).toContain('committed');
  });

  it('does NOT fire when no crew can be formed at all — no approval can fix that', () => {
    // A single PIC and no SIC: crewsFormable is 0, so the day is not resolvable by reassignment.
    expect(suggest({ crewRoster: [pilot('P1', 'PIC')] }).map(x => x.trigger))
      .not.toContain('crew-resolvable');
  });

  it('does NOT fire on a day that is already available', () => {
    expect(suggest().map(x => x.trigger)).not.toContain('crew-resolvable');
  });
});

describe('trip-cancelled', () => {
  it('fires when a cancelled trip leaves days still reading held', () => {
    const s = suggest({ trips: [trip({ status: 'cancelled' })], overlays: [hold()] });
    expect(s.map(x => x.trigger)).toContain('trip-cancelled');
  });

  it('does NOT fire when the freed days already read available', () => {
    expect(suggest({ trips: [trip({ status: 'cancelled' })] }).map(x => x.trigger))
      .not.toContain('trip-cancelled');
  });
});

describe('the safety line', () => {
  it('never proposes freeing a RED tail with no block', () => {
    const s = suggest({
      tailStatus: { N1PG: 'RED' }, tailHeadline: { N1PG: 'gear' },
      overlays: [hold()], trips: [trip({ status: 'cancelled' })],
      crewRoster: [pilot('P1', 'PIC')],
    });
    expect(s).toHaveLength(0);
  });

  it('never proposes freeing days inside a live downtime window', () => {
    const live = block({ scheduledStartUtc: '2026-09-01T00:00:00.000Z', scheduledEndUtc: '2026-09-10T00:00:00.000Z' });
    expect(suggest({ downtime: [live], overlays: [hold()] })).toHaveLength(0);
  });
});

describe('dismissal and de-duplication', () => {
  const dismissal = (over: Partial<SchedulerOverlay> = {}): SchedulerOverlay => ({
    ...hold(), id: 'ov-dis', kind: 'dismissal', fromDateUtc: '2026-09-03', toDateUtc: '2026-09-04',
    publicLabel: null, createdAtUtc: NOW, ...over,
  });

  it('a dismissal covering the range retires the suggestion', () => {
    expect(suggest({ overlays: [hold(), dismissal()] }).map(x => x.trigger))
      .not.toContain('hold-unclaimed');
  });

  it('a dismissal covering only part of the range does not retire it', () => {
    expect(suggest({ overlays: [hold(), dismissal({ toDateUtc: '2026-09-03' })] }).map(x => x.trigger))
      .toContain('hold-unclaimed');
  });

  it('an existing release covering the range retires it', () => {
    const released: SchedulerOverlay = { ...hold(), id: 'ov-rel', kind: 'release', createdAtUtc: NOW };
    expect(suggest({ downtime: [block({ released: true })], overlays: [
      { ...released, fromDateUtc: '2026-09-01', toDateUtc: '2026-09-30' },
    ] })).toHaveLength(0);
  });

  it('ids are deterministic, so a dismissal keeps matching across reads', () => {
    const a = suggest({ overlays: [hold()] });
    const b = suggest({ overlays: [hold()] });
    expect(a.map(x => x.id)).toEqual(b.map(x => x.id));
  });

  it('returns suggestions ordered by the start of their window', () => {
    const s = suggest({
      downtime: [block({ actualEndUtc: '2026-09-05T10:00:00.000Z', scheduledEndUtc: '2026-09-09T00:00:00.000Z', scheduledStartUtc: '2026-09-05T00:00:00.000Z' })],
      overlays: [hold()],
    });
    expect(s.map(x => x.fromDateUtc)).toEqual([...s.map(x => x.fromDateUtc)].sort());
  });
});

describe('overlayFromSuggestion', () => {
  const s = { id: 'sug-x', tail: 'N1PG', fromDateUtc: '2026-09-03', toDateUtc: '2026-09-04',
    trigger: 'hold-unclaimed' as const, rationale: 'why', proposedPublicLabel: 'Released back to the fleet' };
  const by = { name: 'Dana Whitfield', role: 'scheduling' };

  it('approval appends a release carrying the suggestion id and the public label', () => {
    const o = overlayFromSuggestion(s, 'approve', by, NOW);
    expect(o.kind).toBe('release');
    expect(o.fromSuggestionId).toBe('sug-x');
    expect(o.publicLabel).toBe('Released back to the fleet');
    expect(o.createdBy).toBe('Dana Whitfield');
  });

  it('an author-written label overrides the proposed one', () => {
    expect(overlayFromSuggestion(s, 'approve', by, NOW, 'Open for booking').publicLabel).toBe('Open for booking');
  });

  it('dismissal appends a dismissal with no public label — nothing is published', () => {
    const o = overlayFromSuggestion(s, 'dismiss', by, NOW);
    expect(o.kind).toBe('dismissal');
    expect(o.publicLabel).toBeNull();
  });

  it('a dismissal built this way actually retires its own suggestion', () => {
    expect(isDismissed(s, [overlayFromSuggestion(s, 'dismiss', by, NOW)])).toBe(true);
  });
});
