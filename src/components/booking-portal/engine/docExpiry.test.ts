import { describe, it, expect } from 'vitest';
import { evaluateDoc } from './docExpiry';

// Travel window used throughout: Aug 18–20, 2026.
const START = '2026-08-18';
const END = '2026-08-20';

describe('evaluateDoc — evaluated against travel dates, not today', () => {
  it('blocks a document that expires before travel starts', () => {
    expect(evaluateDoc('2026-08-12', START, END)).toBe('block');
  });

  it('blocks a document that expires during travel', () => {
    expect(evaluateDoc('2026-08-19', START, END)).toBe('block');
  });

  it('flags a document expiring within six months after the last travel date', () => {
    expect(evaluateDoc('2026-12-01', START, END)).toBe('flag');
  });

  it('passes a document expiring more than six months after the last travel date', () => {
    expect(evaluateDoc('2031-03-01', START, END)).toBe('valid');
  });

  it('boundary: exactly 182 days after travel end is valid, 181 is a flag', () => {
    // END + 182 days = 2027-02-18; END + 181 = 2027-02-17
    expect(evaluateDoc('2027-02-18', START, END)).toBe('valid');
    expect(evaluateDoc('2027-02-17', START, END)).toBe('flag');
  });

  it('promotes flag to block when the destination requires six months validity', () => {
    expect(evaluateDoc('2026-12-01', START, END, { requireSixMonths: true })).toBe('block');
  });

  it('blocks rather than passes a document it cannot parse', () => {
    expect(evaluateDoc('not-a-date', START, END)).toBe('block');
  });
});
