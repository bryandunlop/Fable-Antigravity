import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TechLogProvider } from '../TechLogContext';
import { STORAGE_KEY, VERSION_KEY, DATA_VERSION } from '../persistence';
import WorkQueue from './WorkQueue';
import type { Defect } from '../types';

/**
 * D24 — a regulatory instant is rendered through `formatRegulatoryCompact`, never through raw
 * locale formatting.
 *
 * `toLocaleDateString()` reads the instant in the *device's* zone and prints a bare numeric date, so
 * the same defect shows a different calendar day on a ramp iPad in Los Angeles than on a desk in
 * Savannah, with nothing on screen to say which zone was meant. Every other defect-date renderer on
 * this page was converted; the watch-item row was missed.
 *
 * The occurrence below is chosen so the two renderings disagree on the calendar day itself, not just
 * on formatting: 02:30Z on Jul 16 is 22:30 EDT on Jul 15.
 */

const WATCHED: Defect = {
  id: 'd-watch-fmt',
  aircraftId: 'ac-n5pg',
  source: 'PIREP',
  ataChapter: '25',
  description: 'Cabin sidewall trim panel loose.',
  airworthinessAffecting: false,
  status: 'WATCHLISTED',
  reportedByOid: 'USR001',
  occurredAtUtc: '2026-07-16T01:00:00.000Z',
  reportedAtUtc: '2026-07-16T02:30:00.000Z',
  signatureId: 'sig-d-watch-fmt',
};

function renderQueueWithWatchItem() {
  localStorage.setItem(VERSION_KEY, DATA_VERSION);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ defects: [WATCHED] }));
  render(
    <MemoryRouter initialEntries={['/tech-log/work-queue']}>
      <TechLogProvider userRole="maintenance">
        <WorkQueue />
      </TechLogProvider>
    </MemoryRouter>,
  );
}

describe('WorkQueue watch-item row renders its reported date through the D24 display layer', () => {
  it('shows the governing-zone calendar day with its zone label', () => {
    renderQueueWithWatchItem();

    expect(screen.getByText(/· reported Jul 15, 2026 · 22:30 EDT$/)).toBeInTheDocument();
  });

  it('never prints a bare device-local numeric date', () => {
    renderQueueWithWatchItem();

    expect(screen.queryByText(/reported \d{1,2}\/\d{1,2}\/\d{4}/)).not.toBeInTheDocument();
  });
});
