import { useSyncExternalStore } from 'react';

export interface QuickLink {
  id: string;
  name: string;
  url: string;
  scope: 'org' | 'personal';
}

export const ORG_KEY = 'quick-links-org';
export const PERSONAL_KEY = 'quick-links-personal';

export const DEFAULT_ORG_LINKS: QuickLink[] = [
  { id: 'default-fltplan', name: 'FltPlan.com', url: 'https://www.fltplan.com/', scope: 'org' },
  { id: 'default-foreflight', name: 'ForeFlight', url: 'https://plan.foreflight.com/', scope: 'org' },
  { id: 'default-arincdirect', name: 'ARINCDirect', url: 'https://www.arincdirect.com/', scope: 'org' },
  { id: 'default-notams', name: 'FAA NOTAMs', url: 'https://notams.aim.faa.gov/notamSearch/', scope: 'org' },
  { id: 'default-aviationweather', name: 'Aviation Weather', url: 'https://aviationweather.gov/', scope: 'org' },
];

type Listener = () => void;
const listeners = new Set<Listener>();

// Snapshot is cached so useSyncExternalStore gets a stable reference between
// saves; any save invalidates it.
let snapshot: { org: QuickLink[]; personal: QuickLink[] } | null = null;

function storage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function parseLinks(raw: string | null, scope: QuickLink['scope']): QuickLink[] | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((l): l is { id: string; name: string; url: string } =>
        typeof l === 'object' && l !== null &&
        typeof (l as { id?: unknown }).id === 'string' &&
        typeof (l as { name?: unknown }).name === 'string' &&
        typeof (l as { url?: unknown }).url === 'string')
      .map(l => ({ id: l.id, name: l.name, url: l.url, scope }));
  } catch {
    return null;
  }
}

export function loadOrgLinks(): QuickLink[] {
  return parseLinks(storage()?.getItem(ORG_KEY) ?? null, 'org') ?? DEFAULT_ORG_LINKS;
}

export function loadPersonalLinks(): QuickLink[] {
  return parseLinks(storage()?.getItem(PERSONAL_KEY) ?? null, 'personal') ?? [];
}

function emit(): void {
  snapshot = null;
  listeners.forEach(l => l());
}

export function saveOrgLinks(links: QuickLink[]): void {
  storage()?.setItem(ORG_KEY, JSON.stringify(links.map(l => ({ ...l, scope: 'org' }))));
  emit();
}

export function savePersonalLinks(links: QuickLink[]): void {
  storage()?.setItem(PERSONAL_KEY, JSON.stringify(links.map(l => ({ ...l, scope: 'personal' }))));
  emit();
}

export function subscribeQuickLinks(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Only http(s) destinations are allowed; a bare domain gets https:// prepended.
// Scheme detection requires "://" — a colon alone would misread host:port
// input ("localhost:3000") as a scheme, and http(s) always uses the // form.
export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function searchLinks(links: QuickLink[], term: string): QuickLink[] {
  const t = term.toLowerCase().trim();
  if (!t) return links;
  return links.filter(l => l.name.toLowerCase().includes(t) || l.url.toLowerCase().includes(t));
}

export function newLinkId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `link-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getSnapshot(): { org: QuickLink[]; personal: QuickLink[] } {
  if (!snapshot) snapshot = { org: loadOrgLinks(), personal: loadPersonalLinks() };
  return snapshot;
}

export function useQuickLinks(): { org: QuickLink[]; personal: QuickLink[] } {
  return useSyncExternalStore(subscribeQuickLinks, getSnapshot);
}
