import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TailStatusCards from './TailStatusCards';
import type { UnifiedFleetAircraft } from '../hooks/useUnifiedFleetStatus';
import type { TodayLeg } from '../../services/todaysOpsMock';

function tail(p: Partial<UnifiedFleetAircraft>): UnifiedFleetAircraft {
  return {
    tailNumber: 'N1PG',
    model: 'Gulfstream G650ER',
    airworthiness: {
      tailNumber: 'N1PG', type: 'G650ER', isProvisional: false, status: 'GREEN',
      openAffectingDefects: 0, activeDeferrals: 0, headline: null, ataChapter: null, deferralClock: null,
    },
    flightStatus: 'parked',
    location: 'KLUK - Ramp',
    unacknowledgedAlerts: 0,
    ...p,
  } as UnifiedFleetAircraft;
}

const FLEET: UnifiedFleetAircraft[] = [
  tail({ tailNumber: 'N1PG', flightStatus: 'in-flight', location: 'En Route KLUK-KPBI' }),
  tail({
    tailNumber: 'N2PG',
    model: 'Gulfstream G500',
    airworthiness: {
      tailNumber: 'N2PG', type: 'G500', isProvisional: false, status: 'RED',
      openAffectingDefects: 1, activeDeferrals: 0,
      headline: 'Chip detector indication', ataChapter: '79', deferralClock: null,
    },
  }),
  tail({
    tailNumber: 'N5PG',
    model: 'Gulfstream G500',
    airworthiness: {
      tailNumber: 'N5PG', type: 'G500', isProvisional: false, status: 'AMBER',
      openAffectingDefects: 0, activeDeferrals: 1,
      headline: 'Galley chiller', ataChapter: '25',
      deferralClock: { category: 'C', repairDueDateUtc: '2026-08-25T03:59:00Z', governingTimezone: 'America/New_York', daysRemaining: 6, intervalDays: 10 },
    },
  }),
];

const LEGS: TodayLeg[] = [
  {
    id: 'L1', flightNumber: 'PG330', tail: 'N1PG', depIcao: 'KLUK', arrIcao: 'KMIA',
    depIata: 'LUK', arrIata: 'MIA', schedDep: '15:45', schedArr: '18:20', eta: '18:20',
    etaStatus: 'on-time', status: 'Scheduled', pax: 6,
  },
];
// 18:00Z on a summer day = 14:00 ET, so the 15:45 departure is 1h 45m out.
const NOW = new Date('2026-08-19T18:00:00Z');

function renderCards() {
  return render(
    <MemoryRouter>
      <TailStatusCards fleet={FLEET} legs={LEGS} now={NOW} />
    </MemoryRouter>,
  );
}

describe('TailStatusCards (D88)', () => {
  it('renders one card per tail with the RAG status word', () => {
    renderCards();
    expect(screen.getByText('DISPATCHABLE')).toBeInTheDocument();
    expect(screen.getByText('GROUNDED')).toBeInTheDocument();
    expect(screen.getByText(/DEFERRED/)).toBeInTheDocument();
  });

  it('RED card carries the driving defect headline (card and phone-list variants)', () => {
    renderCards();
    // Both responsive variants render in jsdom; the headline must be in each.
    expect(screen.getAllByText(/Chip detector indication/)).toHaveLength(2);
  });

  it('AMBER card carries the MEL clock in both variants (days remaining of interval)', () => {
    renderCards();
    expect(screen.getAllByText(/6 of 10d left/)).toHaveLength(2);
    expect(screen.getAllByText(/Galley chiller/).length).toBeGreaterThanOrEqual(1);
  });

  it('GREEN card reads clean', () => {
    renderCards();
    expect(screen.getByText(/No open defects/)).toBeInTheDocument();
  });

  it('shows the next scheduled leg with a departure countdown', () => {
    renderCards();
    expect(screen.getAllByText(/Next: LUK–MIA 15:45 ET/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/in 1h 45m/).length).toBeGreaterThanOrEqual(1);
  });

  it('every card links to the aircraft board', () => {
    renderCards();
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(3);
    links.forEach(l => expect(l).toHaveAttribute('href', '/aircraft'));
  });
});
