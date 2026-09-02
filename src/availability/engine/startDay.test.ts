/**
 * LG-330: after 20:00 Eastern the UTC day has already rolled over, so a calendar drawn on the
 * operator's day (D24: America/New_York) asked a UTC-keyed engine for a row it never built — the
 * month grid's first row started tomorrow, and "today" had no cell (seen 2026-09-01 on
 * /fleet-schedule). The engine now takes the day the caller means to start on.
 */
import { describe, it, expect } from 'vitest';
import { buildFleetAvailability } from './availability';
import { referenceDayKey } from '../../components/trips/engine/referenceDay';
import type { AvailabilityInput } from './availability';

// 2026-09-02T01:30Z is 2026-09-01 21:30 EDT — the window where the two calendars disagree.
const EVENING_ET = '2026-09-02T01:30:00.000Z';

const emptyInput: AvailabilityInput = {
  tails: [],
  trips: [],
  downtime: [],
  crewRoster: [],
  crewCoverage: [],
  overlays: [],
  tailStatus: {},
  tailHeadline: {},
  tripAlerts: [],
};

describe('buildFleetAvailability start day', () => {
  it('starts on the UTC day when no start day is given — the old behaviour, unchanged', () => {
    const fleet = buildFleetAvailability(emptyInput, EVENING_ET, 3);
    expect(fleet.days[0].dateUtc).toBe('2026-09-02');
  });

  it('starts on the operator day when the caller names one, so today has a row', () => {
    const fleet = buildFleetAvailability(emptyInput, EVENING_ET, 3, referenceDayKey(EVENING_ET));
    expect(fleet.days[0].dateUtc).toBe('2026-09-01');
    expect(fleet.days.map(d => d.dateUtc)).toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
  });

  it('changes nothing during the working day, when the two calendars agree', () => {
    const midday = '2026-09-01T15:00:00.000Z';
    const withStart = buildFleetAvailability(emptyInput, midday, 2, referenceDayKey(midday));
    const without = buildFleetAvailability(emptyInput, midday, 2);
    expect(withStart.days.map(d => d.dateUtc)).toEqual(without.days.map(d => d.dateUtc));
  });
});
