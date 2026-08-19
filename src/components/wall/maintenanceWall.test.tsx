import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MaintenanceWallView } from './MaintenanceWall';
import { OpsWallView } from './OpsWall';
import type { UnifiedFleetAircraft } from '../hooks/useUnifiedFleetStatus';
import { TODAY_LEGS, DUTY_WINDOWS } from '../../services/todaysOpsMock';

// Leaflet needs a real DOM layout engine; the map panel is not what these tests
// verify, so stub it out.
vi.mock('../ops-wall/FleetMapPanel', () => ({
  default: () => <div data-testid="fleet-map" />,
}));

function tail(p: {
  tailNumber: string;
  status: 'GREEN' | 'AMBER' | 'RED';
  headline?: string | null;
  daysRemaining?: number;
}): UnifiedFleetAircraft {
  return {
    tailNumber: p.tailNumber,
    model: 'Gulfstream G500',
    airworthiness: {
      tailNumber: p.tailNumber, type: 'G500', isProvisional: false, status: p.status,
      openAffectingDefects: p.status === 'RED' ? 1 : 0,
      activeDeferrals: p.status === 'AMBER' ? 1 : 0,
      headline: p.headline ?? null,
      ataChapter: p.status === 'RED' ? '79' : null,
      deferralClock:
        p.status === 'AMBER'
          ? {
              category: 'C', repairDueDateUtc: '2026-08-26T03:59:00Z',
              daysRemaining: p.daysRemaining ?? 6, intervalDays: 10,
            }
          : null,
    },
    flightStatus: 'parked',
    location: 'KLUK - Ramp',
    unacknowledgedAlerts: 0,
  } as UnifiedFleetAircraft;
}

const DIRTY_FLEET = [
  tail({ tailNumber: 'N1PG', status: 'GREEN' }),
  tail({ tailNumber: 'N2PG', status: 'RED', headline: 'Chip detector indication' }),
  tail({ tailNumber: 'N5PG', status: 'AMBER', headline: 'Galley chiller' }),
];
const CLEAN_FLEET = [
  tail({ tailNumber: 'N1PG', status: 'GREEN' }),
  tail({ tailNumber: 'N2PG', status: 'GREEN' }),
];

describe('MaintenanceWallView (D88)', () => {
  it('with open items: grounded + MEL sections, map demoted to the side column', () => {
    render(<MaintenanceWallView fleet={DIRTY_FLEET} legs={TODAY_LEGS} />);
    expect(screen.getByText('GROUNDED')).toBeInTheDocument();
    expect(screen.getByText('MEL CLOCKS')).toBeInTheDocument();
    expect(screen.getByText(/Chip detector indication/)).toBeInTheDocument();
    expect(screen.getByText(/Galley chiller/)).toBeInTheDocument();
    expect(screen.getByText('FLEET MAP')).toBeInTheDocument();
    expect(screen.getByTestId('fleet-map')).toBeInTheDocument();
  });

  it('MEL clock text owns the due date; the bar owns remaining (house contract)', () => {
    render(<MaintenanceWallView fleet={DIRTY_FLEET} legs={TODAY_LEGS} />);
    expect(screen.getByText(/expires .*ET/)).toBeInTheDocument();
    expect(screen.queryByText(/days left/)).not.toBeInTheDocument();
  });

  it('clear day: the map and ETD/ETAs fill the screen, no maintenance sections', () => {
    render(<MaintenanceWallView fleet={CLEAN_FLEET} legs={TODAY_LEGS} />);
    expect(screen.queryByText('GROUNDED')).not.toBeInTheDocument();
    expect(screen.queryByText('MEL CLOCKS')).not.toBeInTheDocument();
    expect(screen.getByTestId('fleet-map')).toBeInTheDocument();
    // All three movements render as the big clear-day tiles, ETA/ETD visible.
    expect(screen.getAllByText(/ETA|ETD/).length).toBeGreaterThanOrEqual(3);
  });
});

describe('OpsWallView (D88)', () => {
  it('renders a lane per tail with grounded and MEL lane text', () => {
    render(<OpsWallView fleet={DIRTY_FLEET} legs={TODAY_LEGS} duty={DUTY_WINDOWS} etMinutes={605} />);
    expect(screen.getByText('GROUNDED')).toBeInTheDocument();
    expect(screen.getByText(/maintenance release required before dispatch/)).toBeInTheDocument();
    // N5PG (AMBER) flies today, so its lane shows the flight block and the MEL
    // note lives in the lane label.
    expect(screen.getByText(/MEL C · 6d left/)).toBeInTheDocument();
    expect(screen.getByText('LUK → MIA')).toBeInTheDocument();
    expect(screen.getByText('CREW DUTY')).toBeInTheDocument();
    expect(screen.getByText('NOW')).toBeInTheDocument();
  });

  it('hides the NOW line outside the 0600–2200 axis', () => {
    render(<OpsWallView fleet={CLEAN_FLEET} legs={[]} duty={DUTY_WINDOWS} etMinutes={120} />);
    expect(screen.queryByText('NOW')).not.toBeInTheDocument();
  });
});
