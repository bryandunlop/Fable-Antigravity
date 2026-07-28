import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Inbox,
  ShieldAlert,
  Upload,
} from 'lucide-react';

import type { ApproverRole } from '../../airport/company/approvalRouting';
import type { CompanyAirportProposal } from '../../airport/company/proposals';
import type { AirportReviewRow } from '../../airport/company/worklist';
import { FIELD_LABEL } from '../../airport/company/confirmations';
import type { ConfirmableField } from '../../airport/company/pageStore';
import { operatorTodayIso } from '../../lib/operatorDate';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useCompanyAirport } from './CompanyAirportContext';

/**
 * The Airport Evaluation Officer's worklist (LG-83).
 *
 * Bryan chose this over a data-entry console. The distinction is load-bearing:
 * this screen never edits airport facts. FAA reference data is not ours to
 * overwrite, and D46 already provides the annotate-with-signoff path for
 * disagreeing with it. Everything here routes the officer to a decision only
 * they can make, or to a fact that has aged past its cadence.
 *
 * Every bucket is derived at render from the store (D54) — nothing is a stored
 * queue, so nothing can drift out of sync with the pages themselves.
 */

const ROLE_LABEL: Record<ApproverRole, string> = {
  'airport-evaluator': 'Airport evaluation officer',
  'chief-pilot': 'Chief pilot',
};

function changedSummary(proposal: CompanyAirportProposal): string {
  return (
    Object.keys(proposal.changes)
      .map((field) => FIELD_LABEL[field as ConfirmableField] ?? field)
      .join(', ') || 'nothing'
  );
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

function StatTile({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'warn' | 'alert';
  icon: React.ReactNode;
}) {
  const toneClass =
    tone === 'alert'
      ? 'text-destructive'
      : tone === 'warn'
        ? 'text-amber-700 dark:text-amber-500'
        : 'text-foreground';

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={`mt-2 text-3xl tabular-nums ${toneClass}`}>{value}</p>
    </Card>
  );
}

/** A row on one of the review bands, with the per-field detail that explains why it is here. */
function ReviewRow({
  row,
  todayIso,
  currentUserOid,
}: {
  row: AirportReviewRow;
  todayIso: string;
  currentUserOid: string;
}) {
  const company = useCompanyAirport();
  const [error, setError] = useState<string | null>(null);
  const states = company.confirmationStates(row.icao, todayIso).filter((state) => state.present);

  const confirm = (field: ConfirmableField) => {
    try {
      company.confirm({
        icao: row.icao,
        field,
        confirmedBy: currentUserOid,
        source: 'officer',
      });
      setError(null);
    } catch (caught) {
      setError((caught as Error).message);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-lg font-medium">{row.icao}</span>
        {row.openProposals > 0 ? (
          <span className="text-xs text-muted-foreground">
            {row.openProposals} open proposal{row.openProposals === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      <div className="mt-3 space-y-2">
        {states.map((state) => {
          const overdue = state.status === 'overdue';
          const dueSoon = state.status === 'due-soon';
          const age =
            state.lastConfirmed !== null
              ? daysBetween(operatorTodayIso(new Date(state.lastConfirmed.atUtc)), todayIso)
              : null;

          return (
            <div
              key={state.field}
              className="flex flex-wrap items-center justify-between gap-2 rounded border bg-muted/30 p-2 text-sm"
            >
              <div>
                <span className="font-medium">{FIELD_LABEL[state.field]}</span>
                <p className="text-xs text-muted-foreground">
                  {state.lastConfirmed === null ? (
                    'never confirmed'
                  ) : (
                    <>
                      {state.lastConfirmed.via === 'publish'
                        ? 'published'
                        : `confirmed by ${state.lastConfirmed.by}`}{' '}
                      {age === 0 ? 'today' : `${age} day${age === 1 ? '' : 's'} ago`}
                      {state.lastConfirmed.via === 'publish' ? ' — never checked since' : ''}
                      {state.dueDateIso ? ` · due ${state.dueDateIso}` : ''}
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {overdue ? (
                  <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    overdue
                  </span>
                ) : dueSoon ? (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    <Clock className="h-3 w-3" />
                    due soon
                  </span>
                ) : null}
                <Button size="sm" variant="outline" onClick={() => confirm(state.field)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Still true
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        &ldquo;Still true&rdquo; records that you checked this fact — it does not change it. To
        change a value, propose an edit from the airport page.
      </p>

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </Card>
  );
}

function Band({
  title,
  blurb,
  rows,
  todayIso,
  currentUserOid,
}: {
  title: string;
  blurb: string;
  rows: AirportReviewRow[];
  todayIso: string;
  currentUserOid: string;
}) {
  if (rows.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold">
          {title} <span className="text-muted-foreground">({rows.length})</span>
        </h2>
        <p className="text-sm text-muted-foreground">{blurb}</p>
      </div>
      {rows.map((row) => (
        <ReviewRow
          key={row.icao}
          row={row}
          todayIso={todayIso}
          currentUserOid={currentUserOid}
        />
      ))}
    </section>
  );
}

interface AirportEvaluationWorklistProps {
  role?: ApproverRole;
  currentUserOid?: string;
  /** Injected by tests so the bands do not depend on wall time. */
  todayIso?: string;
}

export default function AirportEvaluationWorklist({
  role = 'airport-evaluator',
  currentUserOid = 'demo-officer',
  todayIso = operatorTodayIso(),
}: AirportEvaluationWorklistProps) {
  const company = useCompanyAirport();
  const worklist = company.worklist(role, todayIso);
  const [error, setError] = useState<string | null>(null);

  const publish = (proposalId: string) => {
    try {
      company.publish(proposalId, currentUserOid);
      setError(null);
    } catch (caught) {
      setError((caught as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Airport worklist</h1>
        <p className="mt-1 text-muted-foreground">
          Acting as {ROLE_LABEL[role]} ({currentUserOid}). Everything here is derived from the
          company pages — there is no separate queue to keep in step.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Awaiting your decision"
          value={worklist.counts.awaitingDecision}
          tone={worklist.counts.awaitingDecision > 0 ? 'warn' : 'neutral'}
          icon={<Inbox className="h-4 w-4" />}
        />
        <StatTile
          label="Approved, not published"
          value={worklist.counts.readyToPublish}
          tone={worklist.counts.readyToPublish > 0 ? 'warn' : 'neutral'}
          icon={<Upload className="h-4 w-4" />}
        />
        <StatTile
          label="Never reviewed"
          value={worklist.counts.neverReviewed}
          tone={worklist.counts.neverReviewed > 0 ? 'warn' : 'neutral'}
          icon={<ClipboardCheck className="h-4 w-4" />}
        />
        <StatTile
          label="Review overdue"
          value={worklist.counts.stale}
          tone={worklist.counts.stale > 0 ? 'alert' : 'neutral'}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      {worklist.counts.total === 0 ? (
        <Card className="flex items-center gap-3 p-6 text-muted-foreground">
          <CheckCircle2 className="h-5 w-5" />
          Nothing needs your attention.
        </Card>
      ) : null}

      {worklist.awaitingDecision.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold">
              Awaiting your decision{' '}
              <span className="text-muted-foreground">({worklist.awaitingDecision.length})</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Proposals that cannot move until you approve or deny them.
            </p>
          </div>
          {worklist.awaitingDecision.map((proposal) => (
            <Card key={proposal.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <span className="font-medium">{proposal.icao}</span>
                <span className="ml-2 text-sm text-muted-foreground">
                  {changedSummary(proposal)}
                </span>
                <p className="text-xs text-muted-foreground">
                  {proposal.reason} · submitted by {proposal.submittedBy}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {proposal.requiredApprovals.includes('chief-pilot') ? (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    <ShieldAlert className="h-3 w-3" />
                    safety field
                  </span>
                ) : null}
                {/* A router Link, not an anchor. Auth is in-memory React state,
                    so a full page load drops the user back to role selection. */}
                <Button size="sm" variant="outline" asChild>
                  <Link to="/airport-evaluations/review">Review</Link>
                </Button>
              </div>
            </Card>
          ))}
        </section>
      ) : null}

      {worklist.readyToPublish.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold">
              Approved, ready to publish{' '}
              <span className="text-muted-foreground">({worklist.readyToPublish.length})</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Everyone required has approved. Until this is published, nobody sees the change.
            </p>
          </div>
          {worklist.readyToPublish.map((proposal) => (
            <Card key={proposal.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <span className="font-medium">{proposal.icao}</span>
                <span className="ml-2 text-sm text-muted-foreground">
                  {changedSummary(proposal)}
                </span>
              </div>
              <Button size="sm" onClick={() => publish(proposal.id)}>
                <Upload className="mr-2 h-4 w-4" />
                Publish
              </Button>
            </Card>
          ))}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </section>
      ) : null}

      <Band
        title="Review overdue"
        blurb="A stated fact has aged past its cadence and nobody has checked it."
        rows={worklist.stale}
        todayIso={todayIso}
        currentUserOid={currentUserOid}
      />

      <Band
        title="Never reviewed"
        blurb="A page was written and nobody has ever gone back to check it. Publishing is the author asserting their own edit; it is not review."
        rows={worklist.neverReviewed}
        todayIso={todayIso}
        currentUserOid={currentUserOid}
      />

      <Band
        title="Due soon"
        blurb="Falling due within the next 30 days."
        rows={worklist.dueSoon}
        todayIso={todayIso}
        currentUserOid={currentUserOid}
      />

      {/* An unattributed red "overdue" acquires implied authority through
          repetition. Say on screen what the code comment says: these intervals
          are ours, not a regulator's. */}
      <p className="border-t pt-4 text-xs text-muted-foreground">
        Review intervals are a flight-department default (90 days to a year, by field), not a
        regulatory requirement.
      </p>
    </div>
  );
}
