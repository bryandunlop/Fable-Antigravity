import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TechLogProvider } from '../TechLogContext';
import { STORAGE_KEY, VERSION_KEY, DATA_VERSION } from '../persistence';
import type { PrintRecordInput } from '../util/printRecord';
import type { MaintenanceRelease, Signature, WorkCard } from '../types';
import WorkCardDetail from './WorkCardDetail';
import Releases from './Releases';
import AircraftDetail from './AircraftDetail';

/**
 * The first print-CONTENT test in this repo, and the reason it exists is structural.
 *
 * `printSignedRecord` is one shared renderer, but THREE screens hand-build their own `sections[]`
 * array against it — `WorkCardDetail` (work-card CRS), `Releases` (release list) and
 * `AircraftDetail` (per-tail releases tab). They have already drifted from each other once: the
 * TL-16/DM-3 fix that put the frozen certifying-tech name on the printed release landed in
 * `Releases` and never reached `AircraftDetail`. Nothing caught it, because no test in the app had
 * ever looked at what a CRS actually prints.
 *
 * The nearest existing pattern — the ledger probe in `crewActionGate.test.tsx` — asserts the signed
 * record that FEEDS the print. That is the right tool for signature semantics and the wrong one
 * here: it cannot see a three-way fork, because all three forks read the same ledger row. So this
 * spies the renderer and asserts the argument, once per call site.
 *
 * Everything below is asserted at ALL THREE sites deliberately. Adding a CRS field at two of three
 * is the exact failure this file is here to make loud.
 */

const printSpy = vi.fn<(input: PrintRecordInput) => void>();
vi.mock('../util/printRecord', async importOriginal => {
  const actual = await importOriginal<typeof import('../util/printRecord')>();
  return { ...actual, printSignedRecord: (input: PrintRecordInput) => printSpy(input) };
});

const CARD: WorkCard = {
  id: 'wc-p1', cardNumber: 'WC-7001', woNumber: 'WO-32-0455', aircraftId: 'ac-n1pg',
  title: 'LMLG unsafe indication — troubleshoot & repair',
  ataChapter: '32', description: 'Corrective.', source: 'MANUAL', headerStatusCode: 0,
  scheduled: false, riiRequired: false, createdAtUtc: '2026-07-28T10:00:00.000Z',
  status: 'COMPLETED', completedAtUtc: '2026-07-28T18:00:00.000Z', completedReleaseId: 'rel-p1',
  ammReference: 'AMM 32-30-00',
  cmcFaultCodes: ['32-3120-04', '32-3120-11'],
  steps: [{ id: 'wc-p1-s1', seq: 1, text: 'Gear swing check', done: true }],
};

const SIG: Signature = {
  id: 'sig-p1', signedEntity: 'WORK_CARD', signedEntityId: 'rel-p1', signerOid: 'USR008',
  signerName: 'Tom Parker', signerRole: 'MAINTENANCE', certNumber: 'AP-3344556',
  signedAtUtc: '2026-07-28T18:00:00.000Z', mockContentHash: 'abc123', amr: ['pwd'],
  intentStatement: 'seed', authTimeUtc: '2026-07-28T18:00:00.000Z',
};

const RELEASE: MaintenanceRelease = {
  id: 'rel-p1', aircraftId: 'ac-n1pg', signoffType: 'WORKCARD', linkedWorkCardId: 'wc-p1',
  isGatingDischarge: false, workDescription: 'WC-7001 complied with.',
  completionDateUtc: '2026-07-28T18:00:00.000Z',
  returnToServiceStatement: 'Work card complied with; the aircraft is approved for return to service (14 CFR 91.417).',
  certifyingTechOid: 'USR008', apCertificateNumber: 'AP-3344556', riiRequired: false,
  pdfBlobUri: 'blob://mygfo-worm/crs/rel-p1.pdf', signatureId: 'sig-p1',
};

function seed() {
  localStorage.setItem(VERSION_KEY, DATA_VERSION);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    workCards: [CARD], releases: [RELEASE], signatures: [SIG], defects: [], deferrals: [],
  }));
}

const withProvider = (path: string, routePath: string, element: React.ReactElement) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <TechLogProvider userRole="maintenance">
        <Routes><Route path={routePath} element={element} /></Routes>
      </TechLogProvider>
    </MemoryRouter>,
  );

/** Click the one "View / Print" control on screen and return what the renderer was handed. */
async function printed(): Promise<PrintRecordInput> {
  const user = userEvent.setup();
  await user.click(screen.getAllByRole('button', { name: /View \/ Print/i })[0]);
  expect(printSpy).toHaveBeenCalledTimes(1);
  return printSpy.mock.calls[0][0];
}

const fieldValue = (input: PrintRecordInput, label: string) =>
  input.sections.flatMap(s => s.fields ?? []).find(f => f.label === label)?.value;

/** The three call sites, each rendered through its real screen. */
const CALL_SITES: { name: string; open: () => void }[] = [
  {
    name: 'WorkCardDetail — work-card CRS',
    open: () => withProvider('/tech-log/work-cards/wc-p1', '/tech-log/work-cards/:id', <WorkCardDetail />),
  },
  {
    name: 'Releases — release list',
    open: () => withProvider('/tech-log/releases', '/tech-log/releases', <Releases />),
  },
  {
    name: 'AircraftDetail — per-tail releases tab',
    open: () => withProvider('/tech-log/aircraft/N1PG?tab=releases', '/tech-log/aircraft/:tail', <AircraftDetail />),
  },
];

describe('Printed CRS carries the work card AMM reference and CMC fault codes (LG-98/99)', () => {
  beforeEach(() => { localStorage.clear(); printSpy.mockClear(); seed(); });

  for (const site of CALL_SITES) {
    it(`${site.name} prints the AMM reference`, async () => {
      site.open();
      expect(fieldValue(await printed(), 'AMM reference')).toBe('AMM 32-30-00');
    });

    it(`${site.name} prints every CMC fault code`, async () => {
      site.open();
      const value = fieldValue(await printed(), 'CMC fault codes');
      expect(value).toContain('32-3120-04');
      expect(value).toContain('32-3120-11');
    });
  }

  it('omits both rows entirely when the card carries neither — no empty "—" placeholders', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      workCards: [{ ...CARD, ammReference: undefined, cmcFaultCodes: undefined }],
      releases: [RELEASE], signatures: [SIG], defects: [], deferrals: [],
    }));
    withProvider('/tech-log/work-cards/wc-p1', '/tech-log/work-cards/:id', <WorkCardDetail />);

    const input = await printed();
    const labels = input.sections.flatMap(s => (s.fields ?? []).map(f => f.label));
    expect(labels).not.toContain('AMM reference');
    expect(labels).not.toContain('CMC fault codes');
  });

  it('prints nothing new on a release with no linked work card', async () => {
    // A defect rectification or a (M)/placard discharge has no card behind it. The reference rows
    // must not appear — and must not throw looking for one.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      workCards: [],
      releases: [{ ...RELEASE, signoffType: 'DEFECT_RECTIFICATION', linkedWorkCardId: undefined }],
      signatures: [SIG], defects: [], deferrals: [],
    }));
    withProvider('/tech-log/releases', '/tech-log/releases', <Releases />);

    const labels = (await printed()).sections.flatMap(s => (s.fields ?? []).map(f => f.label));
    expect(labels).not.toContain('AMM reference');
    expect(labels).not.toContain('CMC fault codes');
  });
});
