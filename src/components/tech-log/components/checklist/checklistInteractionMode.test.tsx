import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TechLogProvider } from '../../TechLogContext';
import { ChecklistRunner } from './ChecklistRunner';
import { buildInitialEntries } from '../../engine/checklist';
import type { Aircraft, ChecklistInstance, ChecklistTemplate } from '../../types';

/**
 * D58 — the interaction split, through the real runner.
 *
 * The engine tests prove the transitions; these prove the surface offers the right ones. The load-
 * bearing assertion is the negative one: a `CLAIM_COMPLETE` template must still show "Start" and
 * must NOT offer the batch action, because that is the servicing behavior D58 promises to leave
 * exactly as it was.
 */

const AIRCRAFT: Aircraft = {
  id: 'ac-n1pg', tailNumber: 'N1PG', type: 'G650ER', serialNumber: '6260', status: 'ACTIVE',
  isProvisional: false, homeBase: 'KLUK', airframeTotalHours: 2450.5, airframeTotalCycles: 980,
  standbyFuelLoadLb: 8000,
};

const baseTemplate: ChecklistTemplate = {
  id: 'cl-test-post', aircraftType: 'G650ER', phase: 'POSTFLIGHT', version: 1, status: 'PUBLISHED',
  createdByOid: 'USR002', createdAtUtc: '2026-06-01T00:00:00.000Z',
  sections: [
    {
      id: 'sec-arr', title: 'ARRIVAL',
      items: [
        { id: 'arr-check-1', kind: 'CHECK', label: 'Gear pins installed', requiredToRelease: true },
        { id: 'arr-check-2', kind: 'CHECK', label: 'Check log can', requiredToRelease: true },
        {
          id: 'arr-measure', kind: 'MEASUREMENT', label: 'Engine oil', requiredToRelease: true,
          fields: [{ id: 'arr-oil-lh', label: 'LH ENG', unit: 'US QTS' }],
        },
      ],
    },
    {
      id: 'sec-close', title: 'CLOSE UP',
      items: [
        { id: 'close-check-1', kind: 'CHECK', label: 'Set flaps to 0 degrees', requiredToRelease: true },
        { id: 'close-note', kind: 'NOTE', label: 'LAV serviced and cleaned', requiredToRelease: true },
      ],
    },
  ],
};

const singleTap: ChecklistTemplate = { ...baseTemplate, interactionMode: 'SINGLE_TAP' };

function renderRunner(template: ChecklistTemplate) {
  const instance: ChecklistInstance = {
    id: 'inst-1', aircraftId: AIRCRAFT.id, phase: 'POSTFLIGHT',
    templateId: template.id, templateVersion: template.version,
    entries: buildInitialEntries(template), createdAtUtc: '2026-07-10T12:00:00.000Z',
  };
  let next: ChecklistInstance | undefined;
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(
    <TechLogProvider userRole="maintenance">
      <ChecklistRunner aircraft={AIRCRAFT} template={template} instance={instance} onChange={n => { next = n; }} />
    </TechLogProvider>,
  );
  const stateOf = (id: string) => next?.entries.find(e => e.itemDefId === id)?.state;
  return { user, result: () => next, stateOf };
}

describe('ChecklistRunner — SINGLE_TAP (D58)', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z')); });
  afterEach(() => { vi.useRealTimers(); });

  it('completes a plain check in one tap — no Start step anywhere on the form', async () => {
    const { user, stateOf } = renderRunner(singleTap);
    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /mark done — gear pins installed/i }));
    expect(stateOf('arr-check-1')).toBe('DONE');
  });

  it('still asks for the reading on a measurement before it can be completed', async () => {
    const { user, stateOf } = renderRunner(singleTap);
    const oil = screen.getByLabelText(/engine oil — lh eng/i);
    expect(oil).toBeInTheDocument();

    await user.type(oil, '6');
    await user.click(screen.getAllByRole('button', { name: 'Done' })[0]);
    expect(stateOf('arr-measure')).toBe('DONE');
  });

  it('offers the batch action at the checklist level and in each section', () => {
    renderRunner(singleTap);
    // 3 open plain checks overall; 2 in ARRIVAL, 1 in CLOSE UP
    expect(screen.getByRole('button', { name: /mark remaining done \(3\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark rest of ARRIVAL done \(2\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark rest of CLOSE UP done \(1\)/i })).toBeInTheDocument();
  });

  it('confirms first, naming what it marks and what it deliberately leaves open', async () => {
    const { user, result } = renderRunner(singleTap);
    await user.click(screen.getByRole('button', { name: /mark remaining done \(3\)/i }));

    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/mark 3 items done\?/i)).toBeInTheDocument();
    for (const marked of ['Gear pins installed', 'Check log can', 'Set flaps to 0 degrees']) {
      expect(within(dialog).getByText(marked)).toBeInTheDocument();
    }
    expect(within(dialog).getByText(/Engine oil — needs a reading typed in/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/LAV serviced and cleaned — needs a note written/i)).toBeInTheDocument();

    // nothing happens until the confirm is taken
    expect(result()).toBeUndefined();
  });

  it('marks only the plain checks when confirmed, leaving the typed-input items open', async () => {
    const { user, stateOf } = renderRunner(singleTap);
    await user.click(screen.getByRole('button', { name: /mark remaining done \(3\)/i }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /mark 3 done/i }));

    expect(stateOf('arr-check-1')).toBe('DONE');
    expect(stateOf('arr-check-2')).toBe('DONE');
    expect(stateOf('close-check-1')).toBe('DONE');
    expect(stateOf('arr-measure')).toBe('OPEN');
    expect(stateOf('close-note')).toBe('OPEN');
  });

  it('cancelling the confirm changes nothing', async () => {
    const { user, result } = renderRunner(singleTap);
    await user.click(screen.getByRole('button', { name: /mark remaining done \(3\)/i }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /cancel/i }));
    expect(result()).toBeUndefined();
  });
});

describe('ChecklistRunner — CLAIM_COMPLETE is untouched (D58)', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z')); });
  afterEach(() => { vi.useRealTimers(); });

  it('still requires the claim step: Start first, Done second', async () => {
    const { user, stateOf } = renderRunner(baseTemplate);
    const starts = screen.getAllByRole('button', { name: 'Start' });
    expect(starts).toHaveLength(5); // every item, measurement and note included

    await user.click(starts[0]);
    expect(stateOf('arr-check-1')).toBe('IN_PROGRESS');
  });

  it('offers no single-tap control and no batch action', () => {
    renderRunner(baseTemplate);
    expect(screen.queryByRole('button', { name: /mark done —/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark remaining done/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark rest of/i })).not.toBeInTheDocument();
  });
});
