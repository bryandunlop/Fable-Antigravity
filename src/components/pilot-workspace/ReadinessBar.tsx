import React from 'react';
import type { PilotReadiness } from './selectors';

const TONE: Record<PilotReadiness['state'], string> = {
  READY: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  NOT_READY: 'bg-amber-100 text-amber-800 border-amber-300',
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
