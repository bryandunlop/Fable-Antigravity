/**
 * The chip's job is to be readable when something is wrong. These tests pin the one property that
 * is easy to lose in a styling pass and impossible to notice in review: the warning states must not
 * carry a responsive-hide class.
 *
 * This is a class-level assertion rather than a rendered-visibility one because jsdom does not apply
 * Tailwind's media queries — there is no layout engine here to ask. Asserting on `hidden` is the
 * honest available check, and it is exactly the token that caused the bug.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SyncStatusChip } from './SyncStatusChip';
import { SyncContext, type SyncCtx } from '../sync/useSync';
import type { OutboxSummary } from '../sync/outbox';

const summary = (over: Partial<OutboxSummary> = {}): OutboxSummary => ({
  pending: 0, inFlight: 0, conflicts: 0, synced: true, cardsWithPendingWork: new Set(), ...over,
});

function renderChip(over: Partial<SyncCtx>) {
  const api = {
    summary: summary(), online: true, transportName: 'local',
    submit: () => {}, refresh: async () => {}, serverCards: {}, presence: [],
    ...over,
  } as unknown as SyncCtx;
  return render(<SyncContext.Provider value={api}><SyncStatusChip /></SyncContext.Provider>);
}

const chipFor = (text: RegExp) => screen.getByText(text).closest('span')!;

describe('SyncStatusChip — bad news survives a phone screen (D72)', () => {
  it('shows a conflict at every width', () => {
    renderChip({ summary: summary({ conflicts: 2, synced: false }) });
    expect(chipFor(/needs review/).className).not.toContain('hidden');
  });

  it('shows unsent changes at every width', () => {
    renderChip({ summary: summary({ pending: 3, synced: false }) });
    expect(chipFor(/Saving/).className).not.toContain('hidden');
  });

  it('shows the offline state at every width — the case where the queue cannot drain', () => {
    renderChip({ online: false, summary: summary({ pending: 1, synced: false }) });
    expect(chipFor(/Offline/).className).not.toContain('hidden');
  });

  it('still lets the all-clear state yield header room on a narrow screen', () => {
    renderChip({});
    expect(chipFor(/Synced/).className).toContain('hidden');
  });
});
