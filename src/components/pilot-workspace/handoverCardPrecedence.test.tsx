import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * The prep pane's Aircraft card must not offer to accept a grounded aircraft either.
 *
 * Found on screen 2026-08-19, on a real released trip: "Unserviceable — grounded" sat directly above
 * a button reading "Review & accept". This is the SAME defect the day-of hero had, in a component
 * written a month earlier — which is the point worth recording: the precedence rule lives in
 * CLAUDE.md and in `moduleStatus.handoverModule`, and each new surface has to re-earn it by hand.
 */
vi.mock('../tech-log/TechLogContext', () => ({
  useTechLog: () => ({
    state: {
      trips: [{ id: 'tl1', tripNumber: 'T-1', aircraftId: 'ac-1', legs: [] }],
      aircraft: [{ id: 'ac-1', tailNumber: 'N2PG', homeBase: 'KLUK' }],
      deferrals: [],
    },
  }),
}));
let sv = 'RED';
let cust = 'OFFERED';
vi.mock('../tech-log/engine/serviceability', () => ({ deriveServiceability: () => ({ status: sv }) }));
vi.mock('../tech-log/engine/custody', () => ({ deriveCustody: () => ({ state: cust }) }));

import { HandoverCard } from './panels/HandoverCard';

const TRIP = { id: 't1', tripNumber: 'T-1', tail: 'N2PG' } as never;

describe('handover card precedence', () => {
  it('never offers to accept a grounded aircraft, even when it is released to the crew', () => {
    sv = 'RED'; cust = 'OFFERED';
    render(<HandoverCard trip={TRIP} onOpenHandover={() => {}} />);

    expect(screen.getByText(/Unserviceable — grounded/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /review & accept/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open handover/i })).toBeInTheDocument();
  });

  it('still offers acceptance when the aircraft is dispatchable', () => {
    sv = 'AMBER'; cust = 'OFFERED';
    render(<HandoverCard trip={TRIP} onOpenHandover={() => {}} />);

    expect(screen.getByRole('button', { name: /review & accept/i })).toBeInTheDocument();
  });
});
