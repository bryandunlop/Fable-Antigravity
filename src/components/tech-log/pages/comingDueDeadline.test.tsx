import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TechLogProvider } from '../TechLogContext';
import { STORAGE_KEY, VERSION_KEY, DATA_VERSION } from '../persistence';
import ComingDue from './ComingDue';
import type { Deferral } from '../types';

/**
 * LG-195 — a DEFERRAL row on the Coming Due board carries the PL-25 END boundary
 * (`upcomingBoard` maps `repairDueDateUtc` straight into `dueDateUtc`), so it must take the
 * deadline render: a midnight boundary reads as the PREVIOUS day at 23:59, never as the bare
 * next-day date a planner mistakes for a full extra working day. The first LG-195 pass migrated
 * six call sites and missed this one — caught in fresh review; this test pins it.
 *
 * CAMP/recurring rows on the same board are external calendar dates (due DURING the day) and
 * deliberately keep their plain rendering — that contrast is the point of the split.
 */

const BOUNDARY_DEFERRAL: Deferral = {
  id: 'df-fmt', defectId: 'd-none', aircraftId: 'ac-n6pg', melItemId: 'mel-fmt',
  governingMmelRevision: 'Rev 1', governingEffectiveDate: '2026-04-27',
  category: 'C',
  dayOfDiscoveryUtc: '2026-08-08T10:06:00.000Z',
  clockStartDateUtc: '2026-08-09T04:00:00.000Z',
  governingTimezone: 'America/New_York',
  // Cat C boundary: Aug 19 00:00 EDT — the instant the aircraft grounds.
  repairDueDateUtc: '2026-08-19T04:00:00.000Z',
  repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10,
  placardRequired: false, mProcedureRequired: false,
  extensionUsed: false, riiRequired: false, melReviewAcknowledged: true,
  signedByOid: 'USR003', signatureId: 'sig-df-fmt', status: 'ACTIVE',
};

function renderBoard() {
  localStorage.setItem(VERSION_KEY, DATA_VERSION);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ deferrals: [BOUNDARY_DEFERRAL] }));
  render(
    <MemoryRouter initialEntries={['/tech-log/airworthiness/forecast']}>
      <TechLogProvider userRole="maintenance">
        <ComingDue />
      </TechLogProvider>
    </MemoryRouter>,
  );
}

describe('ComingDue renders a deferral repair boundary as a deadline (LG-195)', () => {
  it('shows the previous day at 23:59 in the governing zone, marked "by"', () => {
    renderBoard();

    expect(screen.getByText(/by Aug 18, 2026 · 23:59 EDT/)).toBeInTheDocument();
  });

  it('never shows the bare next-day date for the boundary', () => {
    renderBoard();

    expect(screen.queryByText(/due.*Aug 19, 2026 EDT/)).not.toBeInTheDocument();
  });
});
