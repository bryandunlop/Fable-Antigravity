import { describe, it, expect } from 'vitest';
import { decidePushMode, discrepancyTypeFor } from './pushMapping';

describe('decidePushMode (supersede → CAMP IntegrateDiscrepancies)', () => {
  it('CREATE → INSERT Open', () => {
    expect(decidePushMode('CREATE')).toEqual({ mode: 'INSERT', status: 'Open' });
  });

  it('CORRECT with a parent ref → EDIT Open, carrying the parent ref forward', () => {
    expect(decidePushMode('CORRECT', 'CAMP-DISC-21-7'))
      .toEqual({ mode: 'EDIT', status: 'Open', existingDiscrepancyId: 'CAMP-DISC-21-7' });
  });

  it('CLOSE with a parent ref → UPDATE Closed on the same discrepancy', () => {
    expect(decidePushMode('CLOSE', 'CAMP-DISC-21-7'))
      .toEqual({ mode: 'UPDATE', status: 'Closed', existingDiscrepancyId: 'CAMP-DISC-21-7' });
  });

  it('CORRECT with no prior CAMP push falls back to INSERT Open', () => {
    expect(decidePushMode('CORRECT')).toEqual({ mode: 'INSERT', status: 'Open' });
  });

  it('CLOSE with no prior CAMP push records an INSERT Closed', () => {
    expect(decidePushMode('CLOSE')).toEqual({ mode: 'INSERT', status: 'Closed' });
  });

  it('never emits EDIT/UPDATE without a discrepancy id to act on', () => {
    for (const intent of ['CORRECT', 'CLOSE'] as const) {
      const d = decidePushMode(intent); // no parentRef
      expect(d.mode).toBe('INSERT');
      expect(d.existingDiscrepancyId).toBeUndefined();
    }
  });
});

describe('discrepancyTypeFor (myGFO entity → CAMP discrepancyType)', () => {
  it('a deferral is always MEL', () => {
    expect(discrepancyTypeFor('DEFERRAL')).toBe('MEL');
    expect(discrepancyTypeFor('DEFERRAL', 'WATCHLISTED')).toBe('MEL');
  });

  it('a WATCHLISTED defect maps to DEFERRED-WATCHLIST', () => {
    expect(discrepancyTypeFor('DEFECT', 'WATCHLISTED')).toBe('DEFERRED-WATCHLIST');
  });

  it('every other defect (and the legacy no-status call) stays NON-DEFERRED', () => {
    expect(discrepancyTypeFor('DEFECT')).toBe('NON-DEFERRED');
    for (const status of ['OPEN', 'DEFERRED', 'RECTIFIED', 'CLOSED'] as const) {
      expect(discrepancyTypeFor('DEFECT', status)).toBe('NON-DEFERRED');
    }
  });
});
