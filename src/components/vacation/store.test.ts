import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadRequests, saveRequests, resetRequests, STORAGE_KEY, type VacationRequestRecord } from './store';

// vitest runs in the node environment here (no jsdom), so stand up the minimum
// localStorage the store needs. This is what lets the persistence rules be tested
// at all without pulling in a DOM.
beforeEach(() => {
  const map = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  } as unknown as Storage);
});

const req = (over: Partial<VacationRequestRecord> = {}): VacationRequestRecord => ({
  id: 'req1',
  submitterId: 'user1',
  submitterName: 'John Smith',
  submitterPosition: 'Captain',
  requestType: 'Vacation',
  startDate: '2026-08-03',
  endDate: '2026-08-07',
  daysRequested: 5,
  status: 'pending_scheduling',
  comments: [],
  submittedDate: new Date('2026-07-22T10:00:00Z'),
  lastModified: new Date('2026-07-22T10:00:00Z'),
  ...over,
});

describe('vacation store — a submitted request must survive navigation', () => {
  it('returns the seed before anything has been written', () => {
    expect(loadRequests([req()])).toHaveLength(1);
  });

  it('round-trips a saved request', () => {
    saveRequests([req(), req({ id: 'req2' })]);
    expect(loadRequests().map((r) => r.id)).toEqual(['req1', 'req2']);
  });

  it('rehydrates Dates, so rendering a stored request does not throw', () => {
    saveRequests([req()]);
    const [loaded] = loadRequests();
    expect(loaded.submittedDate).toBeInstanceOf(Date);
    expect(loaded.lastModified).toBeInstanceOf(Date);
    expect(loaded.submittedDate.toISOString()).toBe('2026-07-22T10:00:00.000Z');
  });

  it('rehydrates Dates inside the comment thread too', () => {
    saveRequests([req({ comments: [{ id: 'c1', author: 'X', role: 'submitter', comment: 'hi', timestamp: new Date('2026-07-22T11:00:00Z') }] })]);
    expect(loadRequests()[0].comments[0].timestamp).toBeInstanceOf(Date);
  });

  // The hazard store had exactly this bug: deleting a seeded row brought it back
  // on the next load, because the seed always won.
  it('does not resurrect seed rows once the user has written', () => {
    saveRequests([]);
    expect(loadRequests([req()])).toEqual([]);
  });

  it('an empty saved set stays empty across loads', () => {
    saveRequests([req()]);
    saveRequests([]);
    expect(loadRequests([req()])).toHaveLength(0);
  });

  it('falls back to the seed rather than throwing on corrupt storage', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadRequests([req()])).toHaveLength(1);
  });

  it('falls back to the seed when storage holds the wrong shape', () => {
    localStorage.setItem(STORAGE_KEY, '{"nope":true}');
    expect(loadRequests([req()])).toHaveLength(1);
  });

  it('reset clears persisted state so the demo can start over', () => {
    saveRequests([req()]);
    resetRequests();
    expect(loadRequests([req({ id: 'seed' })]).map((r) => r.id)).toEqual(['seed']);
  });
});
