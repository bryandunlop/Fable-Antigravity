import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TechLogProvider } from '../TechLogContext';
import { STORAGE_KEY, VERSION_KEY, DATA_VERSION } from '../persistence';
import Metrics from './Metrics';
import type { WorkCard } from '../types';

/**
 * LG-100 / D61 §5 — the rollup page. What is pinned here is what would otherwise rot silently:
 * that it is reachable by a PILOT as well as maintenance, and that every number offers the cards
 * behind it.
 */

const iso = (daysAgo: number, hour = 8) => {
  const d = new Date(Date.now() - daysAgo * 86400000);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
};

const CARD: WorkCard = {
  id: 'wc-m1', cardNumber: 'WC-7001', aircraftId: 'ac-n1pg', title: 'Battery will not hold charge',
  ataChapter: '24', description: '', steps: [], source: 'MANUAL', headerStatusCode: 0,
  scheduled: false, riiRequired: false, status: 'COMPLETED',
  createdAtUtc: iso(10, 6),
  completedAtUtc: iso(8, 18),
  statusTags: [
    { tag: 'DIAGNOSING', atUtc: iso(10, 8), byOid: 'USR010' },
    { tag: 'WAITING_PARTS', atUtc: iso(10, 12), byOid: 'USR010', note: 'POO — battery, GAC Savannah' },
    { tag: 'IN_WORK', atUtc: iso(8, 10), byOid: 'USR010' },
  ],
  partsOrders: [{
    id: 'po-m1', description: 'Main ship battery', partNumber: '24-3200-01',
    vendor: 'Gulfstream', orderedAtUtc: iso(10, 12), receivedAtUtc: iso(8, 12),
  }],
};

const OLD_CARD: WorkCard = { ...CARD, id: 'wc-m2', cardNumber: 'WC-7002', createdAtUtc: iso(200, 6), statusTags: [], partsOrders: [] };

function renderMetrics(role: 'pilot' | 'maintenance', cards: WorkCard[] = [CARD, OLD_CARD]) {
  localStorage.setItem(VERSION_KEY, DATA_VERSION);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ workCards: cards }));
  return render(
    <MemoryRouter initialEntries={['/tech-log/metrics']}>
      <TechLogProvider userRole={role}>
        <Routes><Route path="/tech-log/metrics" element={<Metrics />} /></Routes>
      </TechLogProvider>
    </MemoryRouter>,
  );
}

describe('Maintenance time rollup (LG-100 / D61 §5)', () => {
  beforeEach(() => localStorage.clear());

  it('renders for a PILOT — D61 §5 makes this everyone\'s page, not maintenance-only', () => {
    renderMetrics('pilot');
    expect(screen.getByText('Maintenance time')).toBeInTheDocument();
    expect(screen.getByText(/Time to diagnose \(median\)/i)).toBeInTheDocument();
  });

  it('answers the three questions Bryan named from one screen', () => {
    renderMetrics('maintenance');
    expect(screen.getByText(/Time to diagnose \(median\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Parts lead \(median\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Install \/ wrench time/i)).toBeInTheDocument();
  });

  it('links every rolled-up tail back to the cards behind it', () => {
    renderMetrics('maintenance');
    // Two routes to the same card: the per-tail card list, and the vendor order row.
    const links = screen.getAllByRole('link', { name: 'WC-7001' });
    expect(links.length).toBeGreaterThan(0);
    links.forEach(l => expect(l).toHaveAttribute('href', '/tech-log/work-cards/wc-m1'));
    expect(screen.getByRole('link', { name: 'N1PG' })).toHaveAttribute('href', '/tech-log/aircraft/N1PG');
  });

  it('rolls parts lead time up by vendor', () => {
    renderMetrics('maintenance');
    expect(screen.getAllByText('Gulfstream').length).toBeGreaterThan(0);
    expect(screen.getByText(/Main ship battery/)).toBeInTheDocument();
  });

  it('the period picker changes the population — a 200-day-old card is out of a 90-day window', async () => {
    const user = userEvent.setup();
    renderMetrics('maintenance');
    expect(screen.getByText(/1 card raised in the period/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '12 months' }));
    expect(screen.getByText(/2 cards raised in the period/)).toBeInTheDocument();
  });

  it('says out loud that these are elapsed hours, not man-hours — the two axes stay separate', () => {
    renderMetrics('maintenance');
    expect(screen.getByText(/Elapsed wall-clock state, not man-hours/i)).toBeInTheDocument();
  });

  it('an empty period reports nothing to roll up rather than zeroes that look like facts', () => {
    renderMetrics('maintenance', [OLD_CARD]);
    expect(screen.getByText(/No work cards raised in this period/i)).toBeInTheDocument();
  });
});
