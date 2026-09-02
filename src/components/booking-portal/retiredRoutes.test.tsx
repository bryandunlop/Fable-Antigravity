/**
 * The booking portal is retired (D109 slice 5). Its scheduling-facing URLs are in people's history
 * and bookmarks, so they redirect to the trips module rather than 404 — a dead link teaches nobody
 * where the page went.
 *
 * These tests are the definition of done for that half of the slice: every old scheduling URL lands
 * somewhere sensible, and the one page still served is the executive's request form.
 */
import { describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import BookingPortalRoutes from './BookingPortalRoutes';

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname}</div>;
}

function landsAt(from: string, userRole = 'scheduling') {
  // Each call is its own navigation; without this the loop below stacks four routers in one DOM.
  cleanup();
  render(
    <MemoryRouter initialEntries={[from]}>
      <Routes>
        <Route path="/booking-portal/*" element={<BookingPortalRoutes userRole={userRole} additionalRoles={[]} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
  return screen.getByTestId('where').textContent;
}

describe('the retired portal URLs land somewhere sensible', () => {
  it('the queue becomes the trips home, which now carries the queue bands', () => {
    expect(landsAt('/booking-portal/queue')).toBe('/trips');
  });

  it('the portal trip list becomes the trips list', () => {
    expect(landsAt('/booking-portal/trips')).toBe('/trips');
  });

  it('a manifest becomes that trip’s workspace, keeping the id', () => {
    expect(landsAt('/booking-portal/trips/trip-42/manifest')).toBe('/trips/trip-42');
  });

  it('the passenger list becomes the people register', () => {
    expect(landsAt('/booking-portal/passengers')).toBe('/people');
  });

  it('watches become the trips module’s watches', () => {
    expect(landsAt('/booking-portal/watches')).toBe('/trips/watches');
  });

  it('empty seats become the fleet schedule', () => {
    expect(landsAt('/booking-portal/seats')).toBe('/fleet-schedule');
  });

  it('anything else — the portal home, the inbox, the cost model — lands on trips', () => {
    for (const p of ['/booking-portal', '/booking-portal/inbox', '/booking-portal/cost-model', '/booking-portal/requests']) {
      expect(landsAt(p), p).toBe('/trips');
    }
  });
});
