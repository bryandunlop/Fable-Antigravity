import { describe, it, expect } from 'vitest';
import { faviconUrl, hostLabel, linkInitials } from './favicon';

describe('faviconUrl', () => {
  it('builds a favicon-service url keyed on the host', () => {
    expect(faviconUrl('https://plan.foreflight.com/')).toBe(
      'https://www.google.com/s2/favicons?domain=plan.foreflight.com&sz=64',
    );
  });

  it('honors an explicit size', () => {
    expect(faviconUrl('https://www.fltplan.com/', 128)).toBe(
      'https://www.google.com/s2/favicons?domain=www.fltplan.com&sz=128',
    );
  });

  it('returns null for an unparseable url', () => {
    expect(faviconUrl('not a url')).toBeNull();
    expect(faviconUrl('')).toBeNull();
  });

  it('returns null when there is no host', () => {
    // opaque scheme, no authority
    expect(faviconUrl('mailto:ops@example.com')).toBeNull();
  });
});

describe('hostLabel', () => {
  it('strips a leading www.', () => {
    expect(hostLabel('https://www.fltplan.com/')).toBe('fltplan.com');
  });

  it('keeps meaningful subdomains', () => {
    expect(hostLabel('https://notams.aim.faa.gov/notamSearch/')).toBe('notams.aim.faa.gov');
  });

  it('falls back to the trimmed raw string when unparseable', () => {
    expect(hostLabel('  garbage  ')).toBe('garbage');
  });
});

describe('linkInitials', () => {
  it('takes the first two letters of a single-word name', () => {
    expect(linkInitials('FltPlan.com')).toBe('FL');
  });

  it('takes one letter from each of the first two words', () => {
    expect(linkInitials('FAA NOTAMs')).toBe('FN');
    expect(linkInitials('My CAMP')).toBe('MC');
  });

  it('handles empty input', () => {
    expect(linkInitials('   ')).toBe('?');
  });
});
