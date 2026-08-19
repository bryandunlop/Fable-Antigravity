import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

/**
 * D84 slice 2 — the pane a trip opens in is decided by the clock, and the two panes carry
 * DIFFERENT instruments. This is the wiring test: given a trip whose next departure is days away,
 * the prep matrix is what renders and the leg stepper is not; inside the day-of window it is the
 * other way round.
 *
 * Everything below FlightHub is stubbed so this asserts the SWITCH and nothing else — the matrix's
 * own contents are covered by prepMatrix.test.ts, and the clock by paneMode.test.ts.
 */
vi.mock('./panels/PrepMatrix', () => ({ PrepMatrix: () => <div data-testid="prep-matrix" /> }));
vi.mock('./panels/LegStepper', () => ({ LegStepper: () => <div data-testid="leg-stepper" /> }));
vi.mock('./panels/LegDayOfSection', () => ({ LegDayOfSection: () => <div data-testid="day-of-section" /> }));
vi.mock('./panels/LegFratSection', () => ({ LegFratSection: () => null }));
vi.mock('./panels/LegFuelSection', () => ({ LegFuelSection: () => null }));
vi.mock('./panels/HandoverCard', () => ({ HandoverCard: () => <div data-testid="handover-card" /> }));
vi.mock('./panels/TripBriefPanel', () => ({ default: () => <div data-testid="scheduling-card" /> }));
vi.mock('./panels/MessagesPanel', () => ({ default: () => null }));
vi.mock('./panels/LogNuisanceItemDialog', () => ({ LogNuisanceItemDialog: () => null }));
vi.mock('../tech-log/components/panels/ReportDefectDialog', () => ({ ReportDefectDialog: () => null }));
vi.mock('../tech-log/components/AirportInfoPanel', () => ({ AirportInfoPanel: () => null }));
vi.mock('../tech-log/components/BriefingPanel', () => ({ BriefingPanel: () => null }));

const NOW = '2026-08-18T08:33:00.000Z';
const LEGS = [
  { id: 'l1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB', departureTimeUtc: '2026-08-18T14:20:00.000Z', arrivalTimeUtc: '2026-08-18T16:00:00.000Z', fratStatus: 'NOT_STARTED', airportReviewed: false },
  { id: 'l2', sequence: 2, departureIcao: 'KTEB', arrivalIcao: 'KASE', departureTimeUtc: '2026-08-18T19:05:00.000Z', arrivalTimeUtc: '2026-08-18T22:40:00.000Z', fratStatus: 'NOT_STARTED', airportReviewed: false },
];

vi.mock('../scheduling-workspace/SchedulingWorkspaceContext', () => ({
  useSchedulingWorkspace: () => ({
    ready: true, tick: 0, nowUtc: () => NOW, officeTzOffsetMinutes: -240, bump: () => {},
    store: { listInstancesForTrip: async () => [], getPilotVisibility: async () => [], getTrip: async () => null },
  }),
}));
vi.mock('../tech-log/TechLogContext', () => ({
  useTechLog: () => ({
    state: {
      trips: [{ id: 'tl1', tripNumber: 'T-2026-0718', aircraftId: 'ac-1', legs: LEGS }],
      aircraft: [{ id: 'ac-1', tailNumber: 'N6PG', homeBase: 'KLUK' }],
      defects: [], deferrals: [], maintenanceReleases: [], briefings: [], custodyEvents: [],
    },
    dispatch: () => {},
  }),
  useCurrentUser: () => ({ oid: 'u1', role: 'pilot', displayName: 'Test Pilot' }),
}));
vi.mock('../tech-log/engine/serviceability', () => ({ deriveServiceability: () => ({ status: 'GREEN' }) }));
vi.mock('../tech-log/engine/custody', () => ({ deriveCustody: () => ({ state: 'WITH_CREW' }) }));

import FlightHub from './FlightHub';

const TRIP = { id: 't1', tripNumber: 'T-2026-0718', tail: 'N6PG', aircraftType: 'G500', tripType: 'domestic', legs: [] } as never;

const renderAt = (search: string) =>
  render(
    <MemoryRouter initialEntries={[`/pilot-workspace/trips/t1${search}`]}>
      <Routes>
        <Route path="/pilot-workspace/trips/:tripId" element={<FlightHub trip={TRIP} userRole="pilot" />} />
      </Routes>
    </MemoryRouter>,
  );

describe('prep vs day-of pane (D84)', () => {
  it('opens in day-of inside the threshold: stepper and board, no matrix', () => {
    // Next departure 14:20Z, now 08:33Z — 5h47m out, inside the 12h window.
    renderAt('');
    expect(screen.getByTestId('leg-stepper')).toBeInTheDocument();
    expect(screen.getByTestId('day-of-section')).toBeInTheDocument();
    expect(screen.queryByTestId('prep-matrix')).not.toBeInTheDocument();
  });

  it('shows the matrix — and NOT the leg stepper — when the pilot switches to prep', () => {
    // The stepper is the instrument prep replaces; leaving it visible would be the old design
    // wearing the new one's clothes.
    renderAt('?mode=prep');
    expect(screen.getByTestId('prep-matrix')).toBeInTheDocument();
    expect(screen.queryByTestId('leg-stepper')).not.toBeInTheDocument();
    expect(screen.queryByTestId('day-of-section')).not.toBeInTheDocument();
  });

  it('keeps the per-TRIP cards in prep, because a per-leg matrix cannot hold them', () => {
    renderAt('?mode=prep');
    expect(screen.getByTestId('handover-card')).toBeInTheDocument();
    expect(screen.getByTestId('scheduling-card')).toBeInTheDocument();
  });

  it('names the mode and offers the other one', () => {
    renderAt('?mode=prep');
    expect(screen.getByText('Prep')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^day-of$/i })).toBeInTheDocument();
  });

  it('lets the header chips wrap instead of clipping the mode chip', () => {
    // Measured at 1194x834: custody + a long BLOCKED reason + the mode chip overflow the row, and
    // the right-most chip — the newest one — is what gets cut off.
    const { container } = renderAt('?mode=prep');
    const cluster = container.querySelector('.flex-wrap.items-center.justify-end');
    expect(cluster).not.toBeNull();
    expect(cluster!.className).not.toMatch(/shrink-0/);
  });
});
