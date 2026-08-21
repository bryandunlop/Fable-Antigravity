import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrepMatrix } from './panels/PrepMatrix';

/**
 * "Not released to preflight yet" and "this trip has no itinerary" are different facts, and the
 * matrix used to report both as "No legs on this trip yet". On a trip scheduling had fully planned
 * that reads as data loss — the Flight Hub header said "0 legs" beside it, for the same reason.
 */
describe('PrepMatrix with no preflight legs', () => {
  const noop = () => {};

  it('says prep has not opened yet when scheduling already has an itinerary', () => {
    render(<PrepMatrix rows={[]} scheduledLegCount={2} onOpenFrat={noop} onOpenAirport={noop} onOpenFuel={noop} />);
    expect(screen.getByText(/2 legs planned/)).toBeTruthy();
    expect(screen.queryByText(/No legs on this trip yet/)).toBeNull();
  });

  it('still says there are no legs when the trip genuinely has none', () => {
    render(<PrepMatrix rows={[]} onOpenFrat={noop} onOpenAirport={noop} onOpenFuel={noop} />);
    expect(screen.getByText(/No legs on this trip yet/)).toBeTruthy();
  });
});
