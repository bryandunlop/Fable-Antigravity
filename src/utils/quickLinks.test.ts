import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DEFAULT_ORG_LINKS,
  ORG_KEY,
  PERSONAL_KEY,
  loadOrgLinks,
  loadPersonalLinks,
  saveOrgLinks,
  savePersonalLinks,
  subscribeQuickLinks,
  searchLinks,
  normalizeUrl,
  type QuickLink,
} from './quickLinks';

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, String(v));
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
  clear(): void {
    this.m.clear();
  }
}

function link(overrides: Partial<QuickLink> = {}): QuickLink {
  return {
    id: 'l1',
    name: 'CAMP portal',
    url: 'https://www.campsystems.com/',
    scope: 'org',
    ...overrides,
  };
}

beforeEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
});

afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe('loadOrgLinks', () => {
  it('seeds the default aviation links when nothing is stored', () => {
    const links = loadOrgLinks();
    expect(links).toEqual(DEFAULT_ORG_LINKS);
    expect(links.length).toBeGreaterThan(0);
    expect(links.every(l => l.scope === 'org')).toBe(true);
  });

  it('round-trips saved links', () => {
    const custom = [link({ id: 'a', name: 'FBO One' })];
    saveOrgLinks(custom);
    expect(loadOrgLinks()).toEqual(custom);
  });

  it('falls back to defaults on corrupted JSON', () => {
    localStorage.setItem(ORG_KEY, '{not json');
    expect(loadOrgLinks()).toEqual(DEFAULT_ORG_LINKS);
  });

  it('falls back to defaults when the stored value is not an array', () => {
    localStorage.setItem(ORG_KEY, '{"a":1}');
    expect(loadOrgLinks()).toEqual(DEFAULT_ORG_LINKS);
  });

  it('drops malformed entries but keeps valid ones', () => {
    localStorage.setItem(
      ORG_KEY,
      JSON.stringify([link({ id: 'ok' }), { id: 'bad', name: 'No url' }, 42]),
    );
    const links = loadOrgLinks();
    expect(links.map(l => l.id)).toEqual(['ok']);
  });

  it('stamps org scope even if the stored entry says otherwise', () => {
    localStorage.setItem(ORG_KEY, JSON.stringify([link({ scope: 'personal' })]));
    expect(loadOrgLinks()[0].scope).toBe('org');
  });
});

describe('loadPersonalLinks', () => {
  it('defaults to empty', () => {
    expect(loadPersonalLinks()).toEqual([]);
  });

  it('round-trips saved links and stamps personal scope', () => {
    savePersonalLinks([link({ id: 'p1', scope: 'personal' })]);
    const links = loadPersonalLinks();
    expect(links.length).toBe(1);
    expect(links[0].scope).toBe('personal');
  });

  it('falls back to empty on corrupted JSON', () => {
    localStorage.setItem(PERSONAL_KEY, 'null');
    expect(loadPersonalLinks()).toEqual([]);
  });
});

describe('subscribeQuickLinks', () => {
  it('notifies on org and personal saves, and unsubscribe stops notifications', () => {
    const fn = vi.fn();
    const unsubscribe = subscribeQuickLinks(fn);
    saveOrgLinks([link()]);
    expect(fn).toHaveBeenCalledTimes(1);
    savePersonalLinks([]);
    expect(fn).toHaveBeenCalledTimes(2);
    unsubscribe();
    saveOrgLinks([]);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('normalizeUrl', () => {
  it('prepends https:// when no scheme is given', () => {
    expect(normalizeUrl('foreflight.com')).toBe('https://foreflight.com/');
  });

  it('preserves an explicit http(s) scheme', () => {
    expect(normalizeUrl('http://example.com/a')).toBe('http://example.com/a');
    expect(normalizeUrl('https://example.com/a')).toBe('https://example.com/a');
  });

  it('treats bare host:port as a host, not a scheme', () => {
    expect(normalizeUrl('localhost:3000')).toBe('https://localhost:3000/');
    expect(normalizeUrl('grafana.internal:8443')).toBe('https://grafana.internal:8443/');
    expect(normalizeUrl('http://localhost:5215/aircraft')).toBe('http://localhost:5215/aircraft');
  });

  it('trims whitespace', () => {
    expect(normalizeUrl('  aviationweather.gov  ')).toBe('https://aviationweather.gov/');
  });

  it('rejects non-http schemes', () => {
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeUrl('file:///etc/passwd')).toBeNull();
  });

  it('rejects empty and unparseable input', () => {
    expect(normalizeUrl('')).toBeNull();
    expect(normalizeUrl('   ')).toBeNull();
    expect(normalizeUrl('https://')).toBeNull();
  });
});

describe('searchLinks', () => {
  const links = [
    link({ id: '1', name: 'FltPlan.com', url: 'https://www.fltplan.com/' }),
    link({ id: '2', name: 'FAA NOTAMs', url: 'https://notams.aim.faa.gov/' }),
    link({ id: '3', name: 'Aviation Weather', url: 'https://aviationweather.gov/' }),
  ];

  it('returns everything for an empty term', () => {
    expect(searchLinks(links, '')).toEqual(links);
    expect(searchLinks(links, '   ')).toEqual(links);
  });

  it('matches the name case-insensitively', () => {
    expect(searchLinks(links, 'notam').map(l => l.id)).toEqual(['2']);
  });

  it('matches the url', () => {
    expect(searchLinks(links, 'fltplan').map(l => l.id)).toEqual(['1']);
  });

  it('returns empty when nothing matches', () => {
    expect(searchLinks(links, 'zzz')).toEqual([]);
  });
});
