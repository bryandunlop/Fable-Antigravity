import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

/**
 * D84 slice 1 — the pilot workspace is a SPLIT VIEW, not a two-step route.
 *
 * Both panes are stubbed on purpose. Rendering the real MyFlightsPanel and FlightHub would pass
 * just as happily against the old list -> open -> board flow, because both components render in
 * both designs; what this test has to prove is that the list is STILL MOUNTED while a trip is
 * open. Stubs make that the only thing being asserted.
 */
vi.mock('./MyFlightsPanel', () => ({
  default: ({ selectedTripId }: { selectedTripId?: string }) => (
    <div data-testid="flight-list" data-selected={selectedTripId ?? ''} />
  ),
}));
vi.mock('./FlightHub', () => ({
  default: () => <div data-testid="flight-hub" />,
}));
vi.mock('../scheduling-workspace/SchedulingWorkspaceContext', () => ({
  useSchedulingWorkspace: () => ({
    ready: true,
    tick: 0,
    store: { getTrip: async (id: string) => ({ id, tripNumber: 'T-2026-0718', tail: 'N6PG' }) },
  }),
}));

import PilotWorkspace from './PilotWorkspace';

// Mounted exactly as App.tsx mounts it — at `/pilot-workspace/*`, so the workspace's own relative
// routes resolve the way they do in the app.
const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/pilot-workspace/*" element={<PilotWorkspace userRole="pilot" />} />
      </Routes>
    </MemoryRouter>,
  );

describe('pilot workspace shell (D84)', () => {
  it('keeps the flight list mounted while a trip is open', async () => {
    renderAt('/pilot-workspace/trips/demo-trip-domestic');

    // The whole point of the split view: scanning and working are one screen.
    expect(await screen.findByTestId('flight-hub')).toBeInTheDocument();
    expect(screen.getByTestId('flight-list')).toBeInTheDocument();
    expect(screen.getByTestId('flight-list')).toHaveAttribute('data-selected', 'demo-trip-domestic');
  });

  it('shows the list beside an empty detail pane when no trip is selected', () => {
    renderAt('/pilot-workspace');

    expect(screen.getByTestId('flight-list')).toBeInTheDocument();
    expect(screen.queryByTestId('flight-hub')).not.toBeInTheDocument();
    expect(screen.getByText(/select a flight/i)).toBeInTheDocument();
  });

  it('takes the viewport minus the app header AND the breadcrumb, cancelling main\'s padding', () => {
    // The split view only works if it owns a bounded height: the list and the detail pane scroll
    // independently and the detail pane pins a bottom bar. <main> is `flex-1 overflow-auto p-6
    // pb-20 md:pb-6` and renders BreadcrumbNav above the route, so the shell has to cancel that
    // padding and subtract BOTH chrome heights.
    //
    // The inventory-v2 pages use the same idiom but subtract only the header (4.5625rem), so they
    // overflow by the breadcrumb's ~38px. This asserts the pilot workspace does not inherit that
    // bug — and if the header or breadcrumb ever changes height, this is what should fail.
    const { container } = renderAt('/pilot-workspace/trips/demo-trip-domestic');
    const shell = container.firstElementChild as HTMLElement;

    expect(shell.className).toMatch(/-m-6/);          // cancel main's p-6
    expect(shell.className).toMatch(/-mb-20/);        // ...and the phone bottom-nav reserve
    expect(shell.className).toMatch(/4\.5625rem/);    // app header, 73px
    expect(shell.className).toMatch(/2\.375rem/);     // BreadcrumbNav, text-sm row + mb-4
    expect(shell.className).toMatch(/overflow-hidden/);
  });

  it('spends no vertical space on a page title or subtitle', () => {
    renderAt('/pilot-workspace/trips/demo-trip-domestic');

    // The heading + lede cost ~80pt above the fold on a 1194x834 iPad and named nothing the
    // trip header does not already say.
    expect(screen.queryByRole('heading', { name: /^flight hub$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/one place, linked back to every role/i)).not.toBeInTheDocument();
  });
});
