import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TechLogProvider } from '../../tech-log/TechLogContext';
import { FirProvider, STORAGE_KEY, VERSION_KEY, DATA_VERSION } from '../FirContext';
import { PublishedFirReader } from './PublishedFirReader';
import type { FirImpactSnapshot, FlightIrregularityReport } from '../types';

/**
 * D61 §5 + D63 — the VP embeds the stacked bar in the published report, and what publishes is the
 * snapshot frozen at approval. This is a render test because the snapshot is otherwise a
 * write-only field: stamping it in the reducer proves nothing if no reader ever shows it.
 */

const SNAPSHOT: FirImpactSnapshot = {
  capturedAtUtc: '2026-07-09T09:00:00.000Z',
  downtimeHours: 24,
  elapsedHours: 36,
  excludedGapHours: 12,
  segments: [
    { key: 'DIAGNOSING', label: 'Diagnosing (on aircraft)', hours: 4 },
    { key: 'IN_WORK', label: 'In work', hours: 15 },
    { key: 'WAITING_PARTS', label: 'Waiting on parts (POO)', hours: 5 },
    { key: 'GAP', label: 'Nobody working (gap)', hours: 0 },
  ],
};

const published = (over: Partial<FlightIrregularityReport['publishedRevision']> = {}): FlightIrregularityReport => ({
  id: 'fir-1', ref: 'FIR-2026-001', title: 'N1PG battery AOG', category: 'AOG', status: 'PUBLISHED',
  openedByOid: 'l1', ownerOid: 'l1', openedAtUtc: '2026-07-08T09:00:00.000Z',
  eventStartUtc: '2026-07-07T08:00:00.000Z', anchors: [], narrative: '',
  impact: {}, manualTimeline: [], statements: [], relatedSafetyItems: [], audit: [],
  publishedRevision: {
    summary: 'A ship battery failure grounded an aircraft overnight.',
    whatHappened: 'The assigned technician isolated the fault to the battery.',
    timeline: [], lessons: [], ackLevel: 'none',
    includeImpactBar: true, impactSnapshot: SNAPSHOT,
    revision: 1, approvedByOid: 'l2', publishedAtUtc: '2026-07-09T09:00:00.000Z',
    ...over,
  },
});

function renderReader(fir: FlightIrregularityReport) {
  localStorage.setItem(VERSION_KEY, DATA_VERSION);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ firs: [fir] }));
  return render(
    <MemoryRouter initialEntries={['/fir/published/fir-1']}>
      <TechLogProvider userRole="pilot">
        <FirProvider>
          <Routes><Route path="/fir/published/:id" element={<PublishedFirReader />} /></Routes>
        </FirProvider>
      </TechLogProvider>
    </MemoryRouter>,
  );
}

describe('the stacked bar published into a FIR (D61 §5 / D63)', () => {
  beforeEach(() => localStorage.clear());

  it('renders the frozen segments, labelled, with the accessible summary the bar carries', () => {
    renderReader(published());
    expect(screen.getByText('Where the hours went')).toBeInTheDocument();
    expect(screen.getByText('In work 15 h')).toBeInTheDocument();
    expect(screen.getByText('Diagnosing (on aircraft) 4 h')).toBeInTheDocument();
    const bar = screen.getByRole('img');
    expect(bar).toHaveAttribute('aria-label', expect.stringContaining('In work 15 h'));
  });

  it('renders the labels the SNAPSHOT carries, not labels resolved from the live vocabulary', () => {
    const fir = published();
    fir.publishedRevision!.impactSnapshot = {
      ...SNAPSHOT,
      segments: [{ key: 'IN_WORK', label: 'Wrench time (as published)', hours: 15 }],
    };
    renderReader(fir);
    expect(screen.getByText('Wrench time (as published) 15 h')).toBeInTheDocument();
    expect(screen.queryByText(/^In work/)).not.toBeInTheDocument();
  });

  it('says the figures are as at publication, and shows the gap hours that were set aside', () => {
    renderReader(published());
    expect(screen.getByText(/36 h elapsed, of which 12 h was logged as time nobody was working and set aside/))
      .toBeInTheDocument();
    expect(screen.getByText(/Figures as at publication/)).toBeInTheDocument();
  });

  it('omits the bar when the curator did not choose to publish it', () => {
    renderReader(published({ includeImpactBar: false }));
    expect(screen.queryByText('Where the hours went')).not.toBeInTheDocument();
  });

  it('omits the bar on a revision published before snapshots existed, rather than inventing one', () => {
    renderReader(published({ impactSnapshot: undefined }));
    expect(screen.queryByText('Where the hours went')).not.toBeInTheDocument();
  });
});
