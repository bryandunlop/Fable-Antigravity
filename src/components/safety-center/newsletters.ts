// Safety Newsletter store — the periodic broadcast publication the old dashboard
// had (distinct from targeted read-and-initial bulletins). Managers publish;
// everyone reads.

import { useEffect, useReducer } from 'react';

export interface Newsletter {
  id: string;
  title: string;
  period: string;   // e.g. "July 2026"
  summary: string;
  body: string;
  publishedAt: string;
}

const KEY = 'sc_newsletters_v1';

const SEED: Newsletter[] = [
  {
    id: 'nl-2026-06', title: 'June 2026 Safety Newsletter', period: 'June 2026',
    summary: 'Q2 hazard trends, the new stabilized-approach gate, and two crew recognitions.',
    body: 'This quarter we closed 12 hazards (avg 3.2 days to close) and stood up a stabilized-approach gate for KTEB circling approaches after a cluster of ASAP reports. Thanks to J. Kerr and T. Ward for two great catches — see the recognitions wall. Reminder: SMS Manual rev G requires your read-and-initial.',
    publishedAt: '2026-06-30T12:00:00Z',
  },
];

type Listener = () => void;
let listeners: Listener[] = [];
function emit() { listeners.forEach((l) => l()); }
function load(): Newsletter[] {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw) as Newsletter[]; } catch { /* ignore */ }
  try { localStorage.setItem(KEY, JSON.stringify(SEED)); } catch { /* ignore */ }
  return SEED;
}
function save(v: Newsletter[]) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ } }

export function getNewsletters(): Newsletter[] { return load(); }

export function publishNewsletter(data: { title: string; period: string; summary: string; body: string }): Newsletter {
  const list = load();
  const nl: Newsletter = { ...data, id: `nl-${Date.now()}`, publishedAt: new Date().toISOString() };
  save([nl, ...list]);
  emit();
  return nl;
}

export function useNewsletters() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const l = () => force();
    listeners.push(l);
    return () => { listeners = listeners.filter((x) => x !== l); };
  }, []);
  return { newsletters: getNewsletters(), publishNewsletter };
}
