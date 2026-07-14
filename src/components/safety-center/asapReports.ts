// ASAP store. The old ASAPReport was submission-only (data discarded on submit,
// no reviewer step). This persists reports and adds the missing reviewer /
// de-identification lifecycle. Confidentiality is enforced by never storing a
// reporter identity — ASAP is non-punitive and de-identified before review.

import { useEffect, useReducer } from 'react';

export type AsapStatus = 'Open' | 'Under review' | 'Resolved';

export interface AsapReport {
  id: string;
  phase: string;
  airport: string;
  description: string;
  contributing: string;
  severity: string;
  submittedAt: string;
  status: AsapStatus;
  deidentified: boolean;
  feedback?: string;
}

const KEY = 'sc_asap_reports_v1';

const SEED: AsapReport[] = [
  {
    id: 'ASAP-2026-014', phase: 'Approach', airport: 'KTEB',
    description: 'High and fast on the circling approach in gusty conditions; went around.',
    contributing: 'Tailwind, end of a long duty day.', severity: 'Medium',
    submittedAt: '2026-07-06T22:14:00Z', status: 'Under review', deidentified: true,
  },
  {
    id: 'ASAP-2026-013', phase: 'Cruise', airport: 'KTEB→KMIA',
    description: 'TCAS TA with converging VFR traffic; resolved with ATC vector.',
    contributing: 'Busy sector.', severity: 'Low',
    submittedAt: '2026-06-28T16:02:00Z', status: 'Resolved', deidentified: true,
    feedback: 'De-identified and added to the traffic-awareness trend brief. No further action.',
  },
];

type Listener = () => void;
let listeners: Listener[] = [];
function emit() { listeners.forEach((l) => l()); }
function load(): AsapReport[] {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw) as AsapReport[]; } catch { /* ignore */ }
  try { localStorage.setItem(KEY, JSON.stringify(SEED)); } catch { /* ignore */ }
  return SEED;
}
function save(v: AsapReport[]) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ } }

export function getAsapReports(): AsapReport[] { return load(); }

export function createAsap(data: Omit<AsapReport, 'id' | 'submittedAt' | 'status' | 'deidentified'>): AsapReport {
  const list = load();
  const year = 2026;
  const n = list.length + 14;
  const report: AsapReport = {
    ...data,
    id: `ASAP-${year}-${String(n).padStart(3, '0')}`,
    submittedAt: new Date().toISOString(),
    status: 'Open',
    deidentified: false,
  };
  save([report, ...list]);
  emit();
  return report;
}

export function updateAsap(id: string, patch: Partial<AsapReport>) {
  save(load().map((r) => (r.id === id ? { ...r, ...patch } : r)));
  emit();
}

export function useAsapReports() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const l = () => force();
    listeners.push(l);
    return () => { listeners = listeners.filter((x) => x !== l); };
  }, []);
  return { reports: getAsapReports(), createAsap, updateAsap };
}
