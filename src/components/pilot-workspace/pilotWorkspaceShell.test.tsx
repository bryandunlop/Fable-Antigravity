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

  it('takes the viewport minus every piece of chrome above and below it', () => {
    // The split view only works if it owns a bounded height: the two columns scroll independently
    // and the detail pane pins a bottom bar. Anything left over becomes page scroll, which is the
    // exact defect this slice exists to remove.
    const { container } = renderAt('/pilot-workspace/trips/demo-trip-domestic');
    const shell = container.firstElementChild as HTMLElement;

    expect(shell.className).toMatch(/4\.5625rem/);   // app header, 73px
    expect(shell.className).toMatch(/2\.375rem/);    // BreadcrumbNav, 21.43px row + mb-4
    expect(shell.className).toMatch(/5rem\)/);       // <main>'s pb-20 below md
    expect(shell.className).toMatch(/md:h-\[calc\(100dvh(-[\d.]+rem){4}\)\]/); // ...pb-6 at md+
    expect(shell.className).toMatch(/overflow-hidden/);
    // NOT the inventory-v2 negative-margin idiom: App's page-transition wrapper means a negative
    // bottom margin here cancels nothing, and measuring showed it left 13px of page overflow.
    expect(shell.className).not.toMatch(/-m-6|-mb-20/);
  });

  it('spends no vertical space on a page title or subtitle', () => {
    renderAt('/pilot-workspace/trips/demo-trip-domestic');

    // The heading + lede cost ~80pt above the fold on a 1194x834 iPad and named nothing the
    // trip header does not already say.
    expect(screen.queryByRole('heading', { name: /^flight hub$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/one place, linked back to every role/i)).not.toBeInTheDocument();
  });
});
