import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TechLogProvider } from '../TechLogContext';
import { STORAGE_KEY, VERSION_KEY, DATA_VERSION } from '../persistence';
import { SymptomNote } from './SymptomNote';
import Defects from '../pages/Defects';
import AircraftDetail from '../pages/AircraftDetail';
import type { Defect, Signature } from '../types';

/**
 * LG-108 — the reporter's narrative finally reaches a screen.
 *
 * `Defect.symptom` has been captured by the report form since the field roster was written and
 * rendered by **nothing**: not a list, not a detail, not the print path, not the FIR. D57 made the
 * gap obvious by splitting the structured CAS annunciation out of it — what is left in `symptom` is
 * exactly the sentence the CAS message cannot carry ("started as a flicker on taxi, went solid
 * after rotation"), and it was the half nobody could read.
 *
 * There is no defect detail ROUTE in this app. A defect is rendered as a card in two forked places
 * — the Defects list and the aircraft workspace's Defects tab — so "the defect detail" means both,
 * and both are asserted here. The rendering itself is one shared atom (`SymptomNote`, factored the
 * way `CasChip` was) precisely so the two cannot drift apart again.
 */

const SIG: Signature = {
  id: 'sig-d-s1', signedEntity: 'DEFECT', signedEntityId: 'd-s1', signerOid: 'USR001',
  signerName: 'Capt. Dana Reyes', signerRole: 'PILOT', intentStatement: 'seed',
  amr: ['pwd'], authTimeUtc: '2026-07-20T12:00:00.000Z', signedAtUtc: '2026-07-20T12:00:00.000Z',
  mockContentHash: 'hash-d-s1',
};

const NARRATIVE = 'Started as a flicker on taxi, went solid after rotation.';

const DEFECT: Defect = {
  id: 'd-s1', aircraftId: 'ac-n1pg', source: 'PIREP', ataChapter: '32',
  description: 'Left main landing gear unsafe indication.',
  symptom: NARRATIVE,
  airworthinessAffecting: true, status: 'OPEN', reportedByOid: 'USR001',
  occurredAtUtc: '2026-07-20T11:00:00.000Z', reportedAtUtc: '2026-07-20T12:00:00.000Z',
  signatureId: 'sig-d-s1',
};

function seed(defect: Defect) {
  localStorage.setItem(VERSION_KEY, DATA_VERSION);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ defects: [defect], signatures: [SIG], deferrals: [] }));
}

const renderDefectsList = (defect: Defect) => {
  seed(defect);
  render(
    <MemoryRouter initialEntries={['/tech-log/defects']}>
      <TechLogProvider userRole="maintenance"><Defects /></TechLogProvider>
    </MemoryRouter>,
  );
};

const renderAircraftDefectsTab = (defect: Defect) => {
  seed(defect);
  render(
    <MemoryRouter initialEntries={['/tech-log/aircraft/N1PG?tab=defects']}>
      <TechLogProvider userRole="maintenance">
        <Routes><Route path="/tech-log/aircraft/:tail" element={<AircraftDetail />} /></Routes>
      </TechLogProvider>
    </MemoryRouter>,
  );
};

describe('SymptomNote — the shared display atom', () => {
  it('names a PIREP narrative as the pilot\'s', () => {
    render(<SymptomNote symptom={NARRATIVE} source="PIREP" />);
    expect(screen.getByTestId('symptom-note')).toHaveTextContent(/pilot/i);
  });

  /**
   * A MAREP is written by maintenance. Calling that "the pilot's account" on screen would put a
   * false attribution on a record whose whole value is that a named person said it.
   */
  it('does not attribute a MAREP narrative to the pilot', () => {
    render(<SymptomNote symptom={NARRATIVE} source="MAREP" />);
    const note = screen.getByTestId('symptom-note');
    expect(note).toHaveTextContent(NARRATIVE);
    expect(note).not.toHaveTextContent(/pilot/i);
  });

  it('renders nothing at all for an absent or blank narrative — call sites need no conditional', () => {
    const { container, rerender } = render(<SymptomNote symptom={undefined} source="PIREP" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<SymptomNote symptom="   " source="PIREP" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('The narrative renders on both defect surfaces (there is no defect detail route)', () => {
  beforeEach(() => localStorage.clear());

  it('Defects list', () => {
    renderDefectsList(DEFECT);
    expect(screen.getByTestId('symptom-note')).toHaveTextContent(NARRATIVE);
  });

  it('aircraft workspace — Defects tab', () => {
    renderAircraftDefectsTab(DEFECT);
    expect(screen.getByTestId('symptom-note')).toHaveTextContent(NARRATIVE);
  });

  it('Defects list stays quiet when there is no narrative', () => {
    renderDefectsList({ ...DEFECT, symptom: undefined });
    expect(screen.queryByTestId('symptom-note')).not.toBeInTheDocument();
  });

  it('aircraft workspace stays quiet when there is no narrative', () => {
    renderAircraftDefectsTab({ ...DEFECT, symptom: undefined });
    expect(screen.queryByTestId('symptom-note')).not.toBeInTheDocument();
  });
});

/**
 * Regression — found by review. `DefectSource` has FIVE members and the first revision special-cased
 * only `MAREP`, so CABIN, STRUCTURAL and NEF narratives all rendered as "Pilot's account". That put a
 * false attribution on a signature-covered record, which is the opposite of this component's purpose.
 * Enumerate, never default-to-pilot.
 */
describe('SymptomNote attribution covers every DefectSource', () => {
  it('never attributes a non-flight-crew narrative to the pilot', () => {
    for (const source of ['MAREP', 'CABIN', 'STRUCTURAL', 'NEF'] as const) {
      const { container, unmount } = render(<SymptomNote symptom={NARRATIVE} source={source} />);
      expect(container.textContent).not.toMatch(/pilot/i);
      unmount();
    }
  });

  it("attributes a PIREP to the pilot, since that is the whole point of the label", () => {
    render(<SymptomNote symptom={NARRATIVE} source="PIREP" />);
    expect(screen.getByTestId('symptom-note').textContent).toMatch(/pilot/i);
  });
});
