import { describe, it, expect } from 'vitest';
import {
  mapBookingTripToTripRecord, mapBookingStatus, deriveTripType, type BookingTripWithLegs,
} from './bookingAdapter';

const NOW = '2026-07-21T12:00:00.000Z';

function baseTrip(overrides: Partial<BookingTripWithLegs> = {}): BookingTripWithLegs {
  return {
    id: 7301,
    reference: 'MAO-7301',
    clientId: 1,
    aircraft: 'N1PG',
    aircraftType: 'GLF6',
    status: 'Booked',
    requiresQuotation: false,
    legs: [
      {
        id: 90311,
        tripId: 7301,
        departureAirport: { id: 1, icao: 'KLUK', iata: 'LUK', name: 'Cincinnati Municipal' },
        arrivalAirport: { id: 2, icao: 'KTEB', iata: 'TEB', name: 'Teterboro' },
        departureDateTime: '2026-07-22T13:00:00.000Z',
        arrivalDateTime: '2026-07-22T14:40:00.000Z',
        adults: 3, children: 1, crew: 2, cabinCrew: 1,
        flyingTime: 100,
      },
      {
        id: 90312,
        tripId: 7301,
        departureAirport: { id: 2, icao: 'KTEB', iata: 'TEB', name: 'Teterboro' },
        arrivalAirport: { id: 1, icao: 'KLUK', iata: 'LUK', name: 'Cincinnati Municipal' },
        departureDateTime: '2026-07-22T21:00:00.000Z',
        arrivalDateTime: '2026-07-22T22:45:00.000Z',
        adults: 2, children: 0, crew: 2, cabinCrew: 1,
        flyingTime: 105,
      },
    ],
    ...overrides,
  } as BookingTripWithLegs;
}

describe('mapBookingTripToTripRecord', () => {
  it('maps a booked round-trip into a myairops-sourced TripRecord mirror', () => {
    const rec = mapBookingTripToTripRecord(baseTrip(), { nowUtc: NOW });
    expect(rec.id).toBe('mao-trip-7301');
    expect(rec.tripNumber).toBe('MAO-7301');
    expect(rec.sourceSystem).toBe('myairops');
    expect(rec.sourceTripRef).toBe('MAO-7301');
    expect(rec.tail).toBe('N1PG');
    expect(rec.aircraftType).toBe('G650ER'); // GLF6 designator -> fleet label
    expect(rec.status).toBe('confirmed');
    expect(rec.tripType).toBe('domestic');
    expect(rec.legs).toHaveLength(2);
    expect(rec.legs[0]).toMatchObject({
      sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB',
      departureTimeUtc: '2026-07-22T13:00:00.000Z', paxCount: 4, filedStatus: 'unfiled',
    });
    expect(rec.startDate).toBe('2026-07-22T13:00:00.000Z');
    expect(rec.endDate).toBe('2026-07-22T22:45:00.000Z');
    expect(rec.createdBy).toBe('myairops-sync');
    expect(rec.createdAtUtc).toBe(NOW);
  });

  it('keeps an unknown type designator verbatim instead of inventing a label', () => {
    const rec = mapBookingTripToTripRecord(baseTrip({ aircraftType: 'BE30' }), { nowUtc: NOW });
    expect(rec.aircraftType).toBe('BE30');
  });

  it('rejects a trip with no aircraft registration', () => {
    expect(() => mapBookingTripToTripRecord(baseTrip({ aircraft: null }), { nowUtc: NOW }))
      .toThrow(/missing aircraft registration/);
  });

  it('rejects an unpinned leg (null departureDateTime) rather than inventing a time', () => {
    const t = baseTrip();
    (t.legs![0] as { departureDateTime: string | null }).departureDateTime = null;
    expect(() => mapBookingTripToTripRecord(t, { nowUtc: NOW })).toThrow(/unpinned/);
  });

  it('rejects a legless trip', () => {
    expect(() => mapBookingTripToTripRecord(baseTrip({ legs: [] }), { nowUtc: NOW })).toThrow(/no legs/);
  });
});

describe('mapBookingStatus', () => {
  it('maps the vendor status ladder onto myGFO trip statuses', () => {
    expect(mapBookingStatus('New')).toBe('planning');
    expect(mapBookingStatus('CheckFeasibility')).toBe('planning');
    expect(mapBookingStatus('Hold')).toBe('planning');
    expect(mapBookingStatus('Booked')).toBe('confirmed');
    expect(mapBookingStatus('InProgress')).toBe('in_progress');
    expect(mapBookingStatus('Completed')).toBe('completed');
    expect(mapBookingStatus('Invoiced')).toBe('completed');
    expect(mapBookingStatus('Paid')).toBe('completed');
    expect(mapBookingStatus('Cancelled')).toBe('cancelled');
    expect(mapBookingStatus(undefined)).toBe('planning');
  });
});

describe('deriveTripType', () => {
  const leg = (dep: string, arr: string) => ({ departureIcao: dep, arrivalIcao: arr });
  it('flags KDCA as dca_dassp regardless of other legs', () => {
    expect(deriveTripType([leg('KLUK', 'KDCA'), leg('KDCA', 'EGGW')])).toBe('dca_dassp');
  });
  it('flags non-K ICAOs as international', () => {
    expect(deriveTripType([leg('KLUK', 'EGGW'), leg('EGGW', 'KLUK')])).toBe('international');
  });
  it('defaults to domestic for all-K routings', () => {
    expect(deriveTripType([leg('KLUK', 'KTEB')])).toBe('domestic');
  });
});
