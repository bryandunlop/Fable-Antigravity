// Decide (D85 · C5) — the safety manager REVIEWS and forwards; they do not
// hold the final say on a waiver.
//
// "the safety manager gets the waiver and then can send it up the chain to the
// line manager. who then is final approval or denial." (Bryan, 2026-08-18)
//
// So the primary action is "Send to …", not "Approve".
//
// THREE outcomes, not two (Bryan, 2026-08-19):
//   · Send to …   — up the chain.
//   · Send back   — DOWN the chain, one step at a time, all the way to the
//                   requester if it needs to, and then back up again. This is
//                   the answer to "not with this justification", which used to
//                   have no expression other than killing the request.
//   · Decline     — ends it. Waivers only: the chain engine is generic, so
//                   without a per-form capability a recognition could be killed
//                   with the same button.
// Both destructive-ish outcomes require a reason. An approval does not.
//
// The queue splits by WHO IS HOLDING IT. A forwarded waiver must not vanish
// from the person who forwarded it: with a named approver excluding the rest of
// the role, "With the chain" is the only thing that will surface a request
// rotting in one individual's inbox.

import { useEffect, useMemo, useState } from 'react';
import { Clock, TriangleAlert, UserRoundCog } from 'lucide-react';
import { Button } from '../ui/button';
import { SYSTEM_USERS } from '../../lib/mockUsers';
import { resolveUserId } from '../../notifications/identity';
import { decideAndNotify } from '../approvals/decide';
import {
  useApprovalRequests, pendingForRoles, advancedByRoles, currentStep, roleLabel,
  reassignRequest, type ApprovalRequest, type Assignee,
} from './approvalRequests';
import { canDeclineKind } from './formTemplates';
import type { Kind } from './ReportDialog';
import { ChainStrip } from './ChainStrip';

interface Props { userRole: string; additionalRoles?: string[]; actorName: string }

/** Everyone who could act on a step, for the person picker. */
export function usersInRole(roleId: string): Assignee[] {
  return SYSTEM_USERS
    .filter((u) => u.roles?.includes(roleId) && u.status === 'Active')
    .map((u) => ({ userId: u.id, name: u.name }));
}

function ageDays(iso: string | undefined, nowMs: number): number | undefined {
  if (!iso) return undefined;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return undefined;
  return Math.max(0, Math.floor((nowMs - t) / 86_400_000));
}

export function DecideArea({ userRole, additionalRoles = [], actorName }: Props) {
  const roles = useMemo(() => [userRole, ...additionalRoles], [userRole, additionalRoles]);
  const viewerUserId = resolveUserId(userRole);
  const { requests } = useApprovalRequests();

  const mine = pendingForRoles(requests, roles, viewerUserId);
  const theirs = advancedByRoles(requests, roles);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = requests.find((r) => r.id === selectedId) ?? mine[0] ?? theirs[0] ?? null;

  // Follow the queue when the current selection leaves it (decided, or handed on).
  useEffect(() => {
    if (selectedId && !requests.some((r) => r.id === selectedId)) setSelectedId(null);
  }, [requests, selectedId]);

  if (!mine.length && !theirs.length) {
    return (
      <div className="text-center py-12">
        <div className="text-[16px] text-foreground/70 font-medium mb-1">Nothing to decide.</div>
        <div className="text-[14px] text-muted-foreground">No request is waiting on you, and none of yours is with the chain.</div>
      </div>
    );
  }

  return (
    <div className="flex gap-5 mt-4 items-start flex-col lg:flex-row">
      <div className="w-full lg:w-[360px] shrink-0 flex flex-col gap-2">
        <QueueGroup label={`Your review · ${mine.length}`} tone="attention">
          {mine.map((r) => (
            <QueueRow key={r.id} req={r} active={selected?.id === r.id} onSelect={() => setSelectedId(r.id)} />
          ))}
          {!mine.length && <div className="text-[13px] text-muted-foreground px-1 py-2">Nothing waiting on you.</div>}
        </QueueGroup>

        <QueueGroup label={`With the chain · ${theirs.length}`}>
          {theirs.map((r) => (
            <QueueRow key={r.id} req={r} active={selected?.id === r.id} onSelect={() => setSelectedId(r.id)} muted />
          ))}
          {!theirs.length && <div className="text-[13px] text-muted-foreground px-1 py-2">Nothing forwarded.</div>}
        </QueueGroup>
      </div>

      <div className="flex-1 min-w-0 w-full">
        {selected && (
          <ReviewPanel
            key={selected.id}
            req={selected}
            roles={roles}
            viewerUserId={viewerUserId}
            actorName={actorName}
            actingRoleId={userRole}
          />
        )}
      </div>
    </div>
  );
}

function QueueGroup({ label, tone, children }: { label: string; tone?: 'attention'; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 mb-3">
      <div className={`gfo-eyebrow ${tone === 'attention' ? '' : 'opacity-70'}`}>{label}</div>
      {children}
    </div>
  );
}

function QueueRow({ req, active, onSelect, muted }: { req: ApprovalRequest; active: boolean; onSelect: () => void; muted?: boolean }) {
  const step = currentStep(req);
  const age = ageDays(req.requestedAt, Date.now());
  const stale = (age ?? 0) > 7;
  return (
    <button onClick={onSelect}
      className={`text-left bg-card border rounded-lg px-3.5 py-3 flex flex-col gap-1.5 cursor-pointer transition-all hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
        active ? 'border-accent shadow-sm' : 'border-border hover:border-muted-foreground/40'} ${muted ? 'opacity-90' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">{req.formLabel}</span>
        <div className="flex-1" />
        {age != null && (
          <span className={`text-[11.5px] font-semibold tabular-nums ${stale ? 'text-[color:var(--gfo-error-ink)]' : 'text-muted-foreground'}`}>{age}d</span>
        )}
      </div>
      <div className="text-[14px] font-medium leading-snug">{req.subjectTitle}</div>
      <div className="text-[12.5px] text-muted-foreground flex items-center gap-1.5">
        {muted
          ? <><Clock className="w-3.5 h-3.5 shrink-0" /> With {step?.assigneeName ?? roleLabel(step?.role ?? '')}</>
          : <>{req.requestedByName}</>}
      </div>
    </button>
  );
}

function ReviewPanel({ req, roles, viewerUserId, actorName, actingRoleId }: {
  req: ApprovalRequest; roles: string[]; viewerUserId: string; actorName: string; actingRoleId: string;
}) {
  const canReassign = roles.includes('safety') || roles.includes('admin');
  const step = currentStep(req);
  const isMine = !!step && roles.includes(step.role) && (!step.assigneeUserId || step.assigneeUserId === viewerUserId);
  const nextStep = req.chain[req.currentStep + 1];
  const candidates = nextStep ? usersInRole(nextStep.role) : [];

  const [recommendation, setRecommendation] = useState('');
  const [sendTo, setSendTo] = useState<string>(candidates[0]?.userId ?? '');
  const [reassigning, setReassigning] = useState(false);

  // Declining ENDS the request, so it is a per-form capability rather than a
  // property of the chain engine — waivers only (Bryan, 2026-08-19). Sending
  // back is always available: it is the non-destructive answer.
  const canDecline = canDeclineKind(req.formKind as Kind);
  const hasReason = recommendation.trim().length > 0;

  function send() {
    const to = candidates.find((c) => c.userId === sendTo);
    decideAndNotify(req, 'approve', actingRoleId, recommendation.trim() || undefined, to);
  }
  function sendBack() {
    decideAndNotify(req, 'send_back', actingRoleId, recommendation.trim());
  }
  function decline() {
    decideAndNotify(req, 'deny', actingRoleId, recommendation.trim());
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      <div className="px-5 pt-4 pb-3.5 border-b border-border">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">{req.formLabel}</span>
          <div className="flex-1" />
          {req.status !== 'pending' && (
            <span className={`text-[12px] font-semibold ${req.status === 'approved' ? 'text-[color:var(--gfo-success-ink)]' : 'text-[color:var(--gfo-error-ink)]'}`}>
              {req.status === 'approved' ? 'Approved' : 'Declined'}
            </span>
          )}
        </div>
        <h3 className="text-[18px] font-semibold tracking-tight mt-1.5 mb-1">{req.subjectTitle}</h3>
        <div className="text-[13px] text-muted-foreground">
          {req.requestedByName} · {roleLabel(req.requestedByRole)} · {new Date(req.requestedAt).toLocaleDateString()}
        </div>
      </div>

      <div className="px-5 py-3 bg-muted/40 border-b border-border overflow-x-auto">
        <ChainStrip req={req} />
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">
        <dl className="flex flex-col gap-3">
          {Object.entries(req.values).filter(([, v]) => v?.trim()).map(([k, v]) => (
            <div key={k}>
              <dt className="gfo-eyebrow opacity-70">{req.fieldLabels[k] ?? k}</dt>
              <dd className="text-[14px] leading-relaxed mt-1 m-0">{v}</dd>
            </div>
          ))}
        </dl>

        {/* What an earlier step said — this is the "Safety says" the final
            approver reads, rendered here so the sender can see what travels. */}
        {req.chain.map((st, i) => (
          st.status === 'approved' && st.comment && i < req.currentStep ? (
            <div key={i} className="border-l-2 border-accent pl-3">
              <div className="gfo-eyebrow opacity-70">{roleLabel(st.role)} said</div>
              <div className="text-[13.5px] leading-relaxed mt-1">{st.comment}</div>
              <div className="text-[11.5px] text-muted-foreground mt-1">
                {st.decidedByName}{st.decidedAt ? ` · ${new Date(st.decidedAt).toLocaleDateString()}` : ''}
              </div>
            </div>
          ) : null
        ))}

        {step?.reassignedByName && (
          <div className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
            <UserRoundCog className="w-4 h-4 shrink-0 mt-px" />
            Re-pointed at {step.assigneeName} by {step.reassignedByName}
            {step.reassignedAt ? ` on ${new Date(step.reassignedAt).toLocaleDateString()}` : ''}
          </div>
        )}

        {isMine && req.status === 'pending' && (
          <>
            <div>
              <label className="gfo-eyebrow opacity-70" htmlFor="rec">
                {nextStep ? `Your recommendation to ${roleLabel(nextStep.role)}` : 'Your note on this decision'}
              </label>
              <textarea id="rec" rows={3} value={recommendation} onChange={(e) => setRecommendation(e.target.value)}
                placeholder="What should they know before they decide?"
                className="w-full mt-1.5 bg-background border border-border rounded-lg px-3 py-2.5 text-[14px] leading-relaxed outline-none focus:ring-2 focus:ring-accent resize-y" />
            </div>

            {nextStep && (
              <div className="flex items-center gap-2.5 flex-wrap">
                <label className="text-[13.5px] text-muted-foreground" htmlFor="sendTo">Send to</label>
                <select id="sendTo" value={sendTo} onChange={(e) => setSendTo(e.target.value)}
                  className="bg-background border border-border rounded-md h-9 px-2.5 text-[13.5px] outline-none focus:ring-2 focus:ring-accent">
                  {candidates.map((c) => <option key={c.userId} value={c.userId}>{c.name}</option>)}
                </select>
                <span className="text-[12px] text-muted-foreground">
                  Only they will see it — the rest of {roleLabel(nextStep.role)} will not.
                </span>
              </div>
            )}

            <div className="flex items-center gap-2.5 flex-wrap pt-3 border-t border-border">
              <Button onClick={send} className="h-11">
                {nextStep ? `Send to ${candidates.find((c) => c.userId === sendTo)?.name ?? roleLabel(nextStep.role)}` : 'Approve'}
              </Button>
              <button onClick={sendBack} disabled={!hasReason}
                className="h-11 px-4 rounded-md border border-border text-[14px] font-medium transition-colors enabled:hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
                Send back to {req.requestedByName.split(' ').slice(-1)[0]}
              </button>
              <div className="flex-1" />
              {canDecline && (
                <button onClick={decline} disabled={!hasReason}
                  className="h-11 px-4 rounded-md border border-[color:var(--gfo-error-ink)] text-[color:var(--gfo-error-ink)] text-[14px] font-medium transition-colors enabled:hover:bg-[color:var(--gfo-error)]/10 disabled:opacity-40 disabled:cursor-not-allowed">
                  Decline here
                </button>
              )}
            </div>
            <div className="text-[11.5px] text-muted-foreground -mt-2">
              {!hasReason
                ? 'Sending back or declining needs a reason — write one above.'
                : canDecline
                  ? `Sending back returns it for more information. Declining ends it${nextStep ? ` — it does not reach ${roleLabel(nextStep.role)}` : ''}.`
                  : 'Sending back returns it for more information.'}
            </div>
          </>
        )}

        {/* Not yours: it is with someone else. The only action here is to
            re-point it — an excluded request whose named approver is away is
            otherwise stuck where nobody can see it. */}
        {!isMine && req.status === 'pending' && step && (
          <div className="flex flex-col gap-2.5 pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-[13.5px]">
              {(ageDays(req.requestedAt, Date.now()) ?? 0) > 7 && <TriangleAlert className="w-4 h-4 text-[color:var(--gfo-error-ink)] shrink-0" />}
              Waiting on {step.assigneeName ?? roleLabel(step.role)}.
            </div>
            {/* Re-pointing decides who signs, so it is SAFETY's call and nobody
                else's (Bryan, 2026-08-19) — even though this panel is also
                reachable by other roles through the same console. */}
            {canReassign && (reassigning ? (
              <ReassignRow req={req} roleId={step.role} actorName={actorName} onDone={() => setReassigning(false)} />
            ) : (
              <button onClick={() => setReassigning(true)}
                className="self-start h-11 px-3.5 rounded-md border border-border text-[13.5px] font-medium hover:bg-muted transition-colors flex items-center gap-2">
                <UserRoundCog className="w-4 h-4" /> Re-point at someone else
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReassignRow({ req, roleId, actorName, onDone }: {
  req: ApprovalRequest; roleId: string; actorName: string; onDone: () => void;
}) {
  const options = usersInRole(roleId).filter((u) => u.userId !== currentStep(req)?.assigneeUserId);
  const [to, setTo] = useState(options[0]?.userId ?? '');
  if (!options.length) {
    return <div className="text-[13px] text-muted-foreground">Nobody else holds {roleLabel(roleId)}.</div>;
  }
  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <select value={to} onChange={(e) => setTo(e.target.value)}
        className="bg-background border border-border rounded-md h-9 px-2.5 text-[13.5px] outline-none focus:ring-2 focus:ring-accent">
        {options.map((o) => <option key={o.userId} value={o.userId}>{o.name}</option>)}
      </select>
      <Button className="h-9" onClick={() => {
        const pick = options.find((o) => o.userId === to);
        if (pick) reassignRequest(req.id, pick, actorName);
        onDone();
      }}>Re-point</Button>
      <button onClick={onDone} className="h-9 px-3 text-[13.5px] text-muted-foreground hover:text-foreground">Cancel</button>
    </div>
  );
}
