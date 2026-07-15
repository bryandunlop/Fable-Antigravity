import { describe, it, expect } from 'vitest';
import { buildOpsBoard, type OpsSnapshot } from './opsBoard';

// 2026-07-15T12:00:00Z as the fixed clock.
const NOW = Date.parse('2026-07-15T12:00:00Z');

const row = (id: string, status: string, extra: Partial<OpsSnapshot['rows'][number]> = {}) => ({
  id,
  title: `t-${id}`,
  status,
  source: 'session',
  captured_on: '2026-07-14',
  blocked_on: '',
  branch: '',
  session: '',
  landed_by: '',
  refs: [] as string[],
  ...extra,
});

const snap = (partial: Partial<OpsSnapshot>): OpsSnapshot => ({
  generated_at: '2026-07-15T11:30:00Z',
  rows: [],
  questions: [],
  gaps: [],
  ...partial,
});

describe('buildOpsBoard — lanes (Work Ledger design §7)', () => {
  it('waiting lane: live rows blocked on a human, bryan first, then oldest first', () => {
    const board = buildOpsBoard(
      snap({
        rows: [
          row('LG-1', 'triaged', { blocked_on: 'dom', captured_on: '2026-06-30' }),
          row('LG-2', 'captured', { blocked_on: 'bryan', captured_on: '2026-07-14' }),
          row('LG-3', 'triaged', { blocked_on: 'chief-pilot', captured_on: '2026-07-01' }),
          row('LG-4', 'landed', { blocked_on: 'bryan' }),
          row('LG-5', 'parked', { blocked_on: 'bryan' }),
        ],
      }),
      NOW,
    );
    expect(board.waiting.map((w) => w.id)).toEqual(['LG-2', 'LG-1', 'LG-3']);
    expect(board.waiting[0].who).toBe('Bryan');
    expect(board.waiting[1].who).toBe('DOM');
    expect(board.waiting[1].daysWaiting).toBe(15);
  });

  it('waiting lane unions open questions, labelled by owner', () => {
    const board = buildOpsBoard(
      snap({ questions: [{ id: 'Q6', title: 'Cutover', owner: 'DOM', status: 'open' }] }),
      NOW,
    );
    expect(board.waiting.map((w) => w.id)).toEqual(['Q6']);
    expect(board.waiting[0].who).toBe('DOM');
    expect(board.waiting[0].kind).toBe('question');
  });

  it('a question already mirrored by a ledger row (refs) is not listed twice', () => {
    const board = buildOpsBoard(
      snap({
        rows: [row('LG-1', 'triaged', { blocked_on: 'dom', refs: ['Q6'] })],
        questions: [{ id: 'Q6', title: 'Cutover', owner: 'DOM', status: 'open' }],
      }),
      NOW,
    );
    expect(board.waiting.map((w) => w.id)).toEqual(['LG-1']);
  });

  it('a SETTLED row referencing an open question does not hide it — settled rows carry no queue state', () => {
    const board = buildOpsBoard(
      snap({
        rows: [row('LG-1', 'parked', { refs: ['Q6'] })],
        questions: [{ id: 'Q6', title: 'Cutover', owner: 'DOM', status: 'open' }],
      }),
      NOW,
    );
    expect(board.waiting.map((w) => w.id)).toEqual(['Q6']);
  });

  it('in-flight lane carries branch, session and elapsed days', () => {
    const board = buildOpsBoard(
      snap({ rows: [row('LG-8', 'in-flight', { branch: 'feat/x', session: 'chat-9', captured_on: '2026-07-13' })] }),
      NOW,
    );
    expect(board.inFlight).toEqual([
      expect.objectContaining({ id: 'LG-8', branch: 'feat/x', session: 'chat-9', daysWaiting: 2 }),
    ]);
  });

  it('captured, backlog, landed and parked split by status; backlog = triaged blocked on nobody', () => {
    const board = buildOpsBoard(
      snap({
        rows: [
          row('LG-1', 'captured'),
          row('LG-2', 'triaged', { blocked_on: 'nobody' }),
          row('LG-3', 'triaged', { blocked_on: 'dom' }),
          row('LG-4', 'landed', { landed_by: 'abc1234def' }),
          row('LG-5', 'parked'),
          row('LG-6', 'dropped'),
        ],
      }),
      NOW,
    );
    expect(board.captured.map((r) => r.id)).toEqual(['LG-1']);
    expect(board.backlog.map((r) => r.id)).toEqual(['LG-2']);
    expect(board.landed.map((r) => r.id)).toEqual(['LG-4']);
    expect(board.landed[0].landedBy).toBe('abc1234');
    expect(board.parkedCount).toBe(1);
    expect(board.waiting.map((r) => r.id)).toEqual(['LG-3']);
  });

  it('a row in the hero lane never repeats in Captured or Backlog — one wait, one card', () => {
    const board = buildOpsBoard(
      snap({
        rows: [
          row('LG-1', 'captured', { blocked_on: 'bryan' }),
          row('LG-2', 'triaged', { blocked_on: 'dom' }),
        ],
      }),
      NOW,
    );
    expect(board.waiting.map((w) => w.id)).toEqual(['LG-1', 'LG-2']);
    expect(board.captured).toEqual([]);
    expect(board.backlog).toEqual([]);
  });

  it('open gaps pass through for the secondary strip', () => {
    const board = buildOpsBoard(
      snap({ gaps: [{ id: 'TL-5', title: 'Ledger cols', severity: 'high', status: 'open' }] }),
      NOW,
    );
    expect(board.gaps).toHaveLength(1);
    expect(board.gaps[0].id).toBe('TL-5');
  });

  it('the footer age is computed from generated_at — the board states its own staleness', () => {
    const board = buildOpsBoard(snap({ generated_at: '2026-07-15T11:30:00Z' }), NOW);
    expect(board.snapshotAgeMinutes).toBe(30);
  });
});
