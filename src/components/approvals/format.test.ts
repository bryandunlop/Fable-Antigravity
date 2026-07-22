import { describe, it, expect } from 'vitest';
import { timeAgo, formatDuration } from './format';

const NOW = new Date('2026-07-22T12:00:00Z').getTime();

describe('timeAgo', () => {
  it('reads "just now" under a minute', () => {
    expect(timeAgo('2026-07-22T11:59:40Z', NOW)).toBe('just now');
  });
  it('reads minutes, then hours, then days', () => {
    expect(timeAgo('2026-07-22T11:38:00Z', NOW)).toBe('22m ago');
    expect(timeAgo('2026-07-22T09:00:00Z', NOW)).toBe('3h ago');
    expect(timeAgo('2026-07-20T12:00:00Z', NOW)).toBe('2d ago');
  });
  it('degrades to "recently" on an unparseable instant rather than NaN', () => {
    expect(timeAgo('not-a-date', NOW)).toBe('recently');
  });
});

describe('formatDuration', () => {
  it('formats minutes, hours and fractional days', () => {
    expect(formatDuration(45 * 60_000)).toBe('45m');
    expect(formatDuration(15 * 3_600_000)).toBe('15h');
    expect(formatDuration(36 * 3_600_000)).toBe('1.5d');
  });
  it('floors sub-minute spans and refuses nonsense', () => {
    expect(formatDuration(500)).toBe('<1m');
    expect(formatDuration(-1)).toBe('—');
    expect(formatDuration(Infinity)).toBe('—');
  });
});
