// Caught-Working-Safely store. The old CWS was submission-only (toast, discarded).
// This persists recognitions so the positive-safety-culture loop is real: a wall
// everyone can see, and each person's own submissions.

import { useEffect, useReducer } from 'react';

export interface CwsRecognition {
  id: string;
  recognized: string;   // who was caught working safely
  forWhat: string;
  submittedBy: string;
  submittedAt: string;
}

const KEY = 'sc_cws_recognitions_v1';

const SEED: CwsRecognition[] = [
  { id: 'CWS-014', recognized: 'J. Kerr', forWhat: 'Ran a full FOD sweep before an unscheduled tow — unprompted.', submittedBy: 'Captain John Smith', submittedAt: '2026-07-02T15:20:00Z' },
  { id: 'CWS-013', recognized: 'T. Ward', forWhat: 'Caught a mis-set nitrogen regulator during a strut service and stopped the job.', submittedBy: 'K. Bell', submittedAt: '2026-06-28T11:05:00Z' },
  { id: 'CWS-012', recognized: 'M. Cho', forWhat: 'Proactively re-briefed the cabin on a last-minute passenger allergy.', submittedBy: 'Capt. Ellis', submittedAt: '2026-06-24T19:40:00Z' },
];

type Listener = () => void;
let listeners: Listener[] = [];
function emit() { listeners.forEach((l) => l()); }
function load(): CwsRecognition[] {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw) as CwsRecognition[]; } catch { /* ignore */ }
  try { localStorage.setItem(KEY, JSON.stringify(SEED)); } catch { /* ignore */ }
  return SEED;
}
function save(v: CwsRecognition[]) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ } }

export function getCws(): CwsRecognition[] { return load(); }

export function createCws(data: { recognized: string; forWhat: string; submittedBy: string }): CwsRecognition {
  const list = load();
  const rec: CwsRecognition = {
    id: `CWS-${list.length + 15}`,
    recognized: data.recognized || 'A colleague',
    forWhat: data.forWhat || '',
    submittedBy: data.submittedBy,
    submittedAt: new Date().toISOString(),
  };
  save([rec, ...list]);
  emit();
  return rec;
}

export function useCws() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const l = () => force();
    listeners.push(l);
    return () => { listeners = listeners.filter((x) => x !== l); };
  }, []);
  return { recognitions: getCws(), createCws };
}
