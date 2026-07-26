import { describe, it, expect } from 'vitest';
import { minutesToHours } from './units';

describe('minutesToHours', () => {
  it('converts integer minutes to decimal hours', () => {
    expect(minutesToHours(90)).toBe(1.5);
    expect(minutesToHours(60)).toBe(1);
    expect(minutesToHours(0)).toBe(0);
    expect(minutesToHours(105)).toBe(1.75);
  });

  it('rejects negative and non-finite input', () => {
    expect(() => minutesToHours(-5)).toThrow(/invalid minutes/);
    expect(() => minutesToHours(Number.NaN)).toThrow(/invalid minutes/);
    expect(() => minutesToHours(Number.POSITIVE_INFINITY)).toThrow(/invalid minutes/);
  });
});
