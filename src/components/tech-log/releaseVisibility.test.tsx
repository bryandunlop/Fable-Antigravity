import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { TechLogProvider, useTechLog, useRehydrateTechLog } from './TechLogContext';
import { releaseSchedulingTripToPreflight } from './bridge';

/**
 * A release must reach the pilot WITHOUT a page reload.
 *
 * `bridge.ts` writes through localStorage directly (loadState -> project -> saveState), so the
 * mounted provider never heard about a release. A scheduler saw "Released to preflight", and the
 * pilot workspace went on saying "not released to preflight" until a full reload — and in the demo
 * a reload re-seeds the date-relative trips and throws the release away, so a released multi-leg
 * trip could not be reached at all. Found by driving it, 2026-08-19.
 */
function Probe({ tripNumber }: { tripNumber: string }) {
  const { state } = useTechLog();
  const rehydrate = useRehydrateTechLog();
  const trip = state.trips.find((t) => t.tripNumber === tripNumber);
  return (
    <div>
      <span data-testid="legs">{trip ? (trip.legs ?? []).length : 'absent'}</span>
      <button onClick={rehydrate}>rehydrate</button>
    </div>
  );
}

const TRIP = {
  tripNumber: 'T-TEST-0001',
  name: 'T-TEST-0001',
  tail: 'N2PG',
  aircraftType: 'G650ER',
  createdByOid: 'scheduling',
  nowUtc: '2026-08-19T09:00:00.000Z',
  legs: [
    { sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KLGA', departureTimeUtc: '2026-08-22T14:00:00.000Z', arrivalTimeUtc: '2026-08-22T15:45:00.000Z' },
    { sequence: 2, departureIcao: 'KLGA', arrivalIcao: 'KBOS', departureTimeUtc: '2026-08-22T19:00:00.000Z', arrivalTimeUtc: '2026-08-22T19:55:00.000Z' },
    { sequence: 3, departureIcao: 'KBOS', arrivalIcao: 'KLUK', departureTimeUtc: '2026-08-22T22:00:00.000Z', arrivalTimeUtc: '2026-08-22T23:50:00.000Z' },
  ],
};

describe('a release reaches the live state without a reload', () => {
  beforeEach(() => localStorage.clear());

  it('is invisible to a mounted provider until it rehydrates, and visible after', () => {
    render(
      <TechLogProvider userRole="pilot">
        <Probe tripNumber={TRIP.tripNumber} />
      </TechLogProvider>,
    );
    expect(screen.getByTestId('legs')).toHaveTextContent('absent');

    // The scheduler releases. This writes storage, not the reducer — which is the whole seam.
    act(() => { releaseSchedulingTripToPreflight(TRIP); });
    expect(screen.getByTestId('legs')).toHaveTextContent('absent');

    act(() => { screen.getByRole('button', { name: 'rehydrate' }).click(); });
    expect(screen.getByTestId('legs')).toHaveTextContent('3');
  });

  it('carries every leg through, not just the first', () => {
    render(
      <TechLogProvider userRole="pilot">
        <Probe tripNumber={TRIP.tripNumber} />
      </TechLogProvider>,
    );
    act(() => { releaseSchedulingTripToPreflight(TRIP); });
    act(() => { screen.getByRole('button', { name: 'rehydrate' }).click(); });

    // The multi-leg case is the one that had never been seen in the running app.
    expect(screen.getByTestId('legs')).toHaveTextContent('3');
  });
});
