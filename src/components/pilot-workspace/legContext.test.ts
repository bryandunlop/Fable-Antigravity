import { describe, it, expect } from 'vitest';
import {
  fratEarlySubmitWarning, FRAT_EARLY_SUBMIT_WARN_HOURS,
} from './legContext';
import { FUEL_LOCK_HOURS_BEFORE_ETD } from '../tech-log/preflightActions';
import { DAY_OF_THRESHOLD_HOURS } from './paneMode';


describe('fratEarlySubmitWarning', () => {
  const NOW = '2026-07-09T12:00:00.000Z';
  it('warns when submitting more than the threshold before ETD, not within it', () => {
    // Crews fill the FRAT ahead of time but REVIEW AND SUBMIT it at the crew brief, which is
    // typically inside four hours. So prep produces a draft; a submission from prep is the case
    // this warning exists to catch, and it now does — where 24h let a whole prep pass through.
    expect(fratEarlySubmitWarning(NOW, '2026-07-11T12:00:00.000Z')).toBe(true);  // 48h out
    expect(fratEarlySubmitWarning(NOW, '2026-07-09T20:00:00.000Z')).toBe(true);  // 8h out — was false at 24h
    expect(fratEarlySubmitWarning(NOW, '2026-07-09T14:00:00.000Z')).toBe(false); // 2h out — at the brief
    expect(fratEarlySubmitWarning(NOW, '2026-07-09T16:00:00.000Z')).toBe(false); // exactly 4h → not > threshold
  });
});

describe('one boundary (Bryan, 2026-08-19)', () => {
  it('keeps the FRAT warning, the fuel lock and the pane switch on the same clock', () => {
    // Asserted against each other rather than against 4, so this fails on DIVERGENCE — which is
    // the property that was asked for — and not merely on someone changing the agreed number.
    expect(FRAT_EARLY_SUBMIT_WARN_HOURS).toBe(FUEL_LOCK_HOURS_BEFORE_ETD);
    expect(DAY_OF_THRESHOLD_HOURS).toBe(FUEL_LOCK_HOURS_BEFORE_ETD);
  });
});
