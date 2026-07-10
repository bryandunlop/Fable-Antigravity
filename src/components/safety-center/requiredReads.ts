// Real read-and-initial model. There was no persisted acknowledgement anywhere
// in the app (old code toasted); this is a localStorage-backed store for
// documents/bulletins that require a recipient to read and "initial" via a
// completion code, plus append-only acknowledgements and per-recipient
// compliance. Targeted distribution (groups + named individuals) is first-class.

import { useEffect, useReducer } from 'react';

export const DIST_GROUPS = ['All Staff', 'Flight Crew', 'Cabin Crew', 'Ground Crew', 'Maintenance', 'Management', 'Safety Team'] as const;

export interface RequiredRead {
  id: string;
  title: string;
  kind: 'document' | 'bulletin' | 'report';
  summary: string;
  body: string;
  completionCode: string;   // the "initial" — proof the recipient opened it
  publishedDate: string;
  urgent: boolean;
  groups: string[];         // targeted groups
  recipients: string[];     // resolved individual names in scope
}

export interface Acknowledgement {
  id: string;
  readId: string;
  userId: string;
  userName: string;
  code: string;
  readAtUtc: string;
}

const READS_KEY = 'sc_required_reads_v1';
const ACKS_KEY = 'sc_acknowledgements_v1';

const CREW = ['Capt. Dunlop', 'FO Marsh', 'Capt. Ellis', 'M. Cho', 'S. Wilson', 'T. Ward'];

const SEED_READS: RequiredRead[] = [
  {
    id: 'rr-sms-g', title: 'SMS Manual — Revision G', kind: 'document',
    summary: 'Two changes this revision: the fatigue-reporting procedure and a new de-ice hold-over table.',
    body: 'Revision G updates the fatigue reporting flow (§4.3) and replaces the de-ice hold-over table (App. C). All crew must read and initial before their next duty period. The completion code is printed at the end of the manual.',
    completionCode: 'SMS-G', publishedDate: '2026-07-08', urgent: false,
    groups: ['Flight Crew', 'Cabin Crew', 'Maintenance'], recipients: CREW,
  },
  {
    id: 'rr-fob-265', title: 'Flight Ops Bulletin 26-05 — KTEB circling approach', kind: 'bulletin',
    summary: 'New stabilized-approach gate for circling approaches at KTEB in gusty conditions.',
    body: 'Effective immediately: a 1,000 ft stabilized-approach gate applies to all circling approaches at KTEB. Go around if not stabilized by the gate. Code below.',
    completionCode: 'FOB265', publishedDate: '2026-07-09', urgent: true,
    groups: ['Flight Crew'], recipients: ['Capt. Dunlop', 'FO Marsh', 'Capt. Ellis'],
  },
];

const SEED_ACKS: Acknowledgement[] = [
  { id: 'ack-1', readId: 'rr-sms-g', userId: 'u-ellis', userName: 'Capt. Ellis', code: 'SMS-G', readAtUtc: '2026-07-08T14:12:00Z' },
  { id: 'ack-2', readId: 'rr-sms-g', userId: 'u-ward', userName: 'T. Ward', code: 'SMS-G', readAtUtc: '2026-07-09T09:03:00Z' },
  { id: 'ack-3', readId: 'rr-fob-265', userId: 'u-marsh', userName: 'FO Marsh', code: 'FOB265', readAtUtc: '2026-07-09T18:40:00Z' },
];

type Listener = () => void;
let listeners: Listener[] = [];
function emit() { listeners.forEach((l) => l()); }

function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
function persist(key: string, val: unknown) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ } }

let seeded = false;
function ensureSeed() {
  if (seeded) return;
  seeded = true;
  if (localStorage.getItem(READS_KEY) == null) persist(READS_KEY, SEED_READS);
  if (localStorage.getItem(ACKS_KEY) == null) persist(ACKS_KEY, SEED_ACKS);
}

export function getReads(): RequiredRead[] { ensureSeed(); return load<RequiredRead[]>(READS_KEY, SEED_READS); }
export function getAcks(): Acknowledgement[] { ensureSeed(); return load<Acknowledgement[]>(ACKS_KEY, SEED_ACKS); }

export function acknowledge(readId: string, userId: string, userName: string, code: string) {
  const acks = getAcks();
  if (acks.some((a) => a.readId === readId && a.userId === userId)) return; // append-only, one per user
  const next: Acknowledgement = {
    id: `ack-${readId}-${userId}-${Date.now()}`,
    readId, userId, userName, code, readAtUtc: new Date().toISOString(),
  };
  persist(ACKS_KEY, [...acks, next]);
  emit();
}

export function createRead(data: Omit<RequiredRead, 'id' | 'publishedDate'>) {
  const reads = getReads();
  const read: RequiredRead = {
    ...data,
    id: `rr-${Date.now()}`,
    publishedDate: new Date().toISOString().split('T')[0],
  };
  persist(READS_KEY, [read, ...reads]);
  emit();
  return read;
}

// Pure — testable without localStorage.
export interface Compliance {
  read: RequiredRead;
  roster: { name: string; read: boolean; at?: string; code?: string }[];
  ackedCount: number;
  total: number;
  pct: number;
}
export function compliance(read: RequiredRead, acks: Acknowledgement[]): Compliance {
  const forRead = acks.filter((a) => a.readId === read.id);
  const roster = read.recipients.map((name) => {
    const a = forRead.find((x) => x.userName === name);
    return { name, read: !!a, at: a?.readAtUtc, code: a?.code };
  });
  const ackedCount = roster.filter((r) => r.read).length;
  const total = read.recipients.length;
  return { read, roster, ackedCount, total, pct: total ? Math.round((ackedCount / total) * 100) : 0 };
}

export function pendingForUser(reads: RequiredRead[], acks: Acknowledgement[], userName: string): RequiredRead[] {
  return reads.filter((r) => r.recipients.includes(userName) && !acks.some((a) => a.readId === r.id && a.userName === userName));
}

/** Reactive hook. Re-renders on any store change. */
export function useRequiredReads() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const l = () => force();
    listeners.push(l);
    return () => { listeners = listeners.filter((x) => x !== l); };
  }, []);
  return { reads: getReads(), acks: getAcks(), acknowledge, createRead };
}
