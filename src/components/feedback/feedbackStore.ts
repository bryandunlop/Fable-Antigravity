// Persistence for in-app feedback reports.
//
// Follows the demo-data policy in src/demo/demoReset.ts: everything a user enters
// persists to localStorage under one key, and the store reseeds from SEED when the
// key is absent, so the single global "Reset demo data" control covers it with no
// teardown of its own.
//
// The class takes its Storage so node tests can inject one (Node >= 24 ships a
// method-less `localStorage` global — see src/test/memoryStorage.ts).

import { useEffect, useReducer } from 'react';
import { daysAgo } from '../../lib/demoDates';
import type { FeedbackContext, FeedbackImpact, FeedbackKind, FeedbackReport } from './types';

const KEY = 'feedback_reports_v1';

export interface NewFeedback {
  kind: FeedbackKind;
  title: string;
  detail: string;
  impact: FeedbackImpact;
  area: string;
  reporter: string;
  shareContext: boolean;
  context: FeedbackContext;
}

const SEED_CONTEXT: FeedbackContext = {
  route: '/tech-log/defects',
  screen: 'Tech Log',
  role: 'pilot',
  appVersion: '2026.9.1',
  viewport: '1180x820',
  userAgent: 'Demo seed',
};

// Three seeds, one per lifecycle state, so the triage board is not empty and shows
// what "filed", "not yet filed" and "failed to file" each look like.
const SEED: FeedbackReport[] = [
  {
    id: 'FB-2026-003',
    kind: 'change',
    title: 'Let me sign the release without leaving the defect',
    detail:
      'Closing a defect bounces me back to the list, then I have to find it again to sign the release. It should be one flow.',
    impact: 'painful',
    area: 'Tech Log',
    reporter: 'M. Alvarez',
    submittedAt: daysAgo(1),
    shareContext: true,
    context: SEED_CONTEXT,
    sync: 'local',
  },
  {
    id: 'FB-2026-002',
    kind: 'bug',
    title: 'Trip sheet prints the previous leg’s passengers',
    detail:
      'Exported the T-72 sheet for the second leg and it listed the first leg’s manifest. Reloading the page fixed it.',
    impact: 'blocked',
    area: 'Scheduling',
    reporter: 'K. Reyes',
    submittedAt: daysAgo(4),
    shareContext: true,
    context: { ...SEED_CONTEXT, route: '/trips', screen: 'Trips', role: 'scheduling' },
    sync: 'filed',
    jira: {
      key: 'MYGFO-398',
      issueId: '10398',
      url: 'https://jira.example-work-instance.com/browse/MYGFO-398',
      status: 'In Progress',
      syncedAt: daysAgo(1),
    },
  },
  {
    id: 'FB-2026-001',
    kind: 'help',
    title: 'Where do I find last month’s fuel receipts?',
    detail: 'I have looked under Trips and under Documents and cannot find them.',
    impact: 'annoying',
    area: 'Documents',
    reporter: 'J. Whitfield',
    submittedAt: daysAgo(9),
    shareContext: false,
    context: { ...SEED_CONTEXT, route: '/documents', screen: 'Document Center', role: 'inflight' },
    sync: 'failed',
    syncError: { message: 'Service temporarily unavailable', retryable: true },
  },
];

type Listener = () => void;

export class FeedbackStore {
  private listeners: Listener[] = [];
  private memory: FeedbackReport[] | null = null;

  constructor(
    private readonly storage: Storage | undefined = typeof localStorage === 'undefined'
      ? undefined
      : localStorage,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private emit(): void {
    for (const l of [...this.listeners]) l();
  }

  list(): FeedbackReport[] {
    if (!this.storage) return (this.memory ??= SEED);
    try {
      const raw = this.storage.getItem(KEY);
      if (raw) return JSON.parse(raw) as FeedbackReport[];
    } catch {
      /* corrupt blob — fall through and reseed rather than blanking the page */
    }
    this.save(SEED);
    return SEED;
  }

  private save(reports: FeedbackReport[]): void {
    if (!this.storage) {
      this.memory = reports;
      return;
    }
    try {
      this.storage.setItem(KEY, JSON.stringify(reports));
    } catch {
      /* quota — the in-session list still updates via emit() */
      this.memory = reports;
    }
  }

  /**
   * Mint a local id and store the report BEFORE any Jira call. A report that only
   * exists once Jira accepts it is a report lost to a flat spot in the wifi, which
   * is precisely the moment a user is most likely to be reporting something.
   */
  create(input: NewFeedback): FeedbackReport {
    const list = this.list();
    const year = this.now().getUTCFullYear();
    const used = list
      .map((r) => Number(r.id.split('-')[2]))
      .filter((n) => Number.isFinite(n));
    const next = (used.length ? Math.max(...used) : 0) + 1;
    const report: FeedbackReport = {
      ...input,
      id: `FB-${year}-${String(next).padStart(3, '0')}`,
      submittedAt: this.now().toISOString(),
      sync: 'local',
    };
    this.save([report, ...list]);
    this.emit();
    return report;
  }

  update(id: string, patch: Partial<FeedbackReport>): void {
    this.save(this.list().map((r) => (r.id === id ? { ...r, ...patch } : r)));
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

/** The app's single store. Tests build their own with an injected Storage. */
export const feedbackStore = new FeedbackStore();

export function useFeedbackReports() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => feedbackStore.subscribe(() => force()), []);
  return feedbackStore.list();
}
