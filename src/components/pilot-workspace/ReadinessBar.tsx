import React from 'react';
import type { PilotReadiness } from './selectors';

// READY green, BLOCKED red (airworthiness stop). NOT_READY is routine prep-in-progress — kept
// neutral so amber stays reserved for a genuinely AMBER (deferral-carrying) aircraft, not "to-do".
const TONE: Record<PilotReadiness['state'], string> = {
  READY: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  NOT_READY: 'bg-muted text-foreground',
  BLOCKED: 'bg-red-100 text-red-800 border-red-300',
};

export default function ReadinessBar({ readiness }: { readiness: PilotReadiness }) {
  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-2 ${TONE[readiness.state]}`}>
      <span className="font-semibold">{readiness.state.replace('_', ' ')}</span>
      {readiness.blocker && <span className="text-sm">{readiness.blocker}</span>}
    </div>
  );
}
