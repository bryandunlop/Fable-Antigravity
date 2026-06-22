import { describe, it, expect } from 'vitest';
import { getDefaultState } from '../mockData/scenarios';
import { buildWorkQueue } from './workqueue';
import { currentRows } from './supersede';

describe('work queue selector', () => {
  const s = getDefaultState();
  const now = new Date().toISOString();
  const wq = buildWorkQueue(s, now);

  it('surfaces the seeded open squawk (N1PG) as a new squawk awaiting triage', () => {
    expect(wq.newSquawks.some(d => d.id === 'd-n1pg')).toBe(true);
    // every new squawk is OPEN (not yet deferred/rectified)
    expect(wq.newSquawks.every(d => d.status === 'OPEN')).toBe(true);
  });

  it('lists open (not completed) work cards', () => {
    expect(wq.openWorkCards.every(w => w.status !== 'COMPLETED')).toBe(true);
    expect(wq.openWorkCards.some(w => w.id === 'wc-2')).toBe(true); // seeded OPEN MLG check
    expect(wq.openWorkCards.some(w => w.id === 'wc-1')).toBe(false); // seeded COMPLETED
  });

  it('counts.urgent reflects grounding/overdue work and is non-negative', () => {
    expect(wq.counts.urgent).toBeGreaterThanOrEqual(wq.newSquawks.length);
    expect(wq.counts.newSquawks).toBe(currentRows(s.defects).filter(d => d.status === 'OPEN').length);
  });

  it('seeded fleet has no expired recurring checks (all current/due-soon)', () => {
    expect(wq.expiredChecks).toHaveLength(0);
  });
});
