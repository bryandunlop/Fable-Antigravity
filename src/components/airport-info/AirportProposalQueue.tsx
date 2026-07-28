import React, { useState } from 'react';
import { CheckCircle2, Inbox, ShieldAlert, Upload, XCircle } from 'lucide-react';

import type { ApproverRole } from '../../airport/company/approvalRouting';
import type { CompanyAirportProposal } from '../../airport/company/proposals';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { useCompanyAirport } from './CompanyAirportContext';

/**
 * Review and publish company-page proposals (D46).
 *
 * Two bands, because they are two different jobs: things this role still owes a
 * decision on, and things already approved that need publishing. A single
 * undifferentiated list is how approved-but-unpublished changes sit forgotten.
 */

const ROLE_LABEL: Record<ApproverRole, string> = {
  'airport-evaluator': 'Airport evaluation officer',
  'chief-pilot': 'Chief pilot',
};

function changedSummary(proposal: CompanyAirportProposal): string {
  return Object.keys(proposal.changes).join(', ') || 'nothing';
}

function ProposalCard({
  proposal,
  role,
  currentUserOid,
}: {
  proposal: CompanyAirportProposal;
  role: ApproverRole;
  currentUserOid: string;
}) {
  const company = useCompanyAirport();
  const [comments, setComments] = useState('');
  const [error, setError] = useState<string | null>(null);

  const decide = (decision: 'approve' | 'deny') => {
    try {
      company.decide({
        proposalId: proposal.id,
        role,
        reviewerOid: currentUserOid,
        decision,
        comments: comments.trim() || undefined,
      });
      setError(null);
    } catch (caught) {
      setError((caught as Error).message);
    }
  };

  const alreadyDecidedByMe = proposal.decisions.some((d) => d.reviewerOid === currentUserOid);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="text-lg font-medium">{proposal.icao}</span>
          <span className="ml-2 text-sm text-muted-foreground">
            changed: {changedSummary(proposal)}
          </span>
        </div>
        {proposal.requiredApprovals.includes('chief-pilot') ? (
          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
            <ShieldAlert className="h-3 w-3" />
            safety field — two people required
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-sm">
        <span className="text-muted-foreground">Reason: </span>
        {proposal.reason}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Submitted by {proposal.submittedBy} · needs{' '}
        {proposal.requiredApprovals.map((r) => ROLE_LABEL[r]).join(' and ')}
      </p>

      <div className="mt-3 space-y-2">
        {Object.entries(proposal.changes).map(([field, value]) => (
          <div key={field} className="rounded border bg-muted/30 p-2 text-sm">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{field}</span>
            <p className="whitespace-pre-wrap">{(value as string | null) ?? <em>cleared</em>}</p>
          </div>
        ))}
      </div>

      {proposal.decisions.length > 0 ? (
        <div className="mt-3 space-y-1 border-t pt-2 text-xs text-muted-foreground">
          {proposal.decisions.map((d, i) => (
            <p key={i}>
              {ROLE_LABEL[d.role]} {d.decision === 'approve' ? 'approved' : 'denied'} — {d.reviewerOid}
              {d.selfApproved ? (
                <span className="ml-1 rounded bg-amber-50 px-1 py-0.5 text-amber-800">
                  self-approved
                </span>
              ) : null}
              {d.comments ? ` · ${d.comments}` : ''}
            </p>
          ))}
        </div>
      ) : null}

      {alreadyDecidedByMe ? (
        <p className="mt-3 text-sm text-muted-foreground">
          You have already decided this proposal in another role. A two-role approval needs two
          people.
        </p>
      ) : (
        <>
          {proposal.submittedBy === currentUserOid ? (
            <p className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
              You submitted this. You may approve it, and the record will show it was
              self-approved.
            </p>
          ) : null}
          <Textarea
            className="mt-3"
            rows={2}
            placeholder="Comments (optional on approve, expected on deny)"
            value={comments}
            onChange={(event) => setComments(event.target.value)}
          />
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => decide('approve')}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => decide('deny')}>
              <XCircle className="mr-2 h-4 w-4" />
              Deny
            </Button>
          </div>
        </>
      )}

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </Card>
  );
}

interface AirportProposalQueueProps {
  role?: ApproverRole;
  currentUserOid?: string;
}

export default function AirportProposalQueue({
  role = 'airport-evaluator',
  currentUserOid = 'demo-reviewer',
}: AirportProposalQueueProps) {
  const company = useCompanyAirport();
  const awaiting = company.awaiting(role);
  const ready = company.readyToPublish();
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
        <h1 className="text-3xl">Airport page review</h1>
        <p className="mt-1 text-muted-foreground">
          Acting as {ROLE_LABEL[role]} ({currentUserOid}).
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Awaiting your decision</h2>
        {awaiting.length === 0 ? (
          <Card className="flex items-center gap-3 p-6 text-muted-foreground">
            <Inbox className="h-5 w-5" />
            Nothing is waiting on you.
          </Card>
        ) : (
          awaiting.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              role={role}
              currentUserOid={currentUserOid}
            />
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Approved, ready to publish</h2>
        {ready.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing approved is waiting to publish.</p>
        ) : (
          ready.map((proposal) => (
            <Card key={proposal.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <span className="font-medium">{proposal.icao}</span>
                <span className="ml-2 text-sm text-muted-foreground">
                  {changedSummary(proposal)}
                </span>
                <p className="text-xs text-muted-foreground">
                  Approved by{' '}
                  {proposal.decisions
                    .filter((d) => d.decision === 'approve')
                    .map((d) => d.reviewerOid)
                    .join(', ')}
                </p>
              </div>
              <Button size="sm" onClick={() => publish(proposal.id)}>
                <Upload className="mr-2 h-4 w-4" />
                Publish
              </Button>
            </Card>
          ))
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </section>
    </div>
  );
}
