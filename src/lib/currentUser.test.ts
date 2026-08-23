import { describe, it, expect } from 'vitest';
import { normalizePersonName, isSamePerson, getCurrentPerson, seesEveryProject } from './currentUser';

describe('normalizePersonName', () => {
  it('strips ranks and honorifics — the directory and the roster mean the same person', () => {
    expect(normalizePersonName('Captain John Smith')).toBe('john smith');
    expect(normalizePersonName('First Officer Emily Chen')).toBe('emily chen');
    expect(normalizePersonName('Dr. Lisa Chen')).toBe('lisa chen');
  });

  it('leaves an ordinary name alone, bar case and spacing', () => {
    expect(normalizePersonName('  Sarah   Wilson ')).toBe('sarah wilson');
  });

  it('does not strip a title that is part of the name', () => {
    // "Captains" is not the rank "Captain".
    expect(normalizePersonName('Captains Creek')).toBe('captains creek');
  });
});

describe('isSamePerson', () => {
  it('matches across the rank prefix', () => {
    expect(isSamePerson('Captain John Smith', 'John Smith')).toBe(true);
  });

  it('does not match two different people who share a surname', () => {
    expect(isSamePerson('Dr. Lisa Chen', 'Emily Chen')).toBe(false);
    expect(isSamePerson('David Brown', 'Robert Brown')).toBe(false);
  });
});

describe('getCurrentPerson', () => {
  it('resolves the persona behind a role, the way login does', () => {
    expect(getCurrentPerson('lead')?.name).toBe('David Brown');
    expect(getCurrentPerson('pilot')?.name).toBe('Captain John Smith');
  });

  it('is null for a role nobody holds, rather than guessing', () => {
    expect(getCurrentPerson('not-a-real-role')).toBeNull();
  });
});

describe('seesEveryProject', () => {
  it('covers the roles whose job is other people’s work', () => {
    ['lead', 'admin', 'vp', 'admin-assistant'].forEach(role => {
      expect(seesEveryProject(role)).toBe(true);
    });
  });

  it('does not hand the whole portfolio to an ordinary role', () => {
    expect(seesEveryProject('pilot')).toBe(false);
    expect(seesEveryProject('maintenance')).toBe(false);
  });
});
