import { useMemo, useState } from 'react';
import { Check, X, MessageSquarePlus, Clock, ChevronRight, ChevronDown, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { eventStore } from '../../notifications/events';
import {
  useApprovalRequests, pendingForRoles, requestedByName, currentApproverRole, roleLabel,
  type ApprovalRequest,
} from '../safety-center/approvalRequests';

const CURRENT_USER = { name: 'Capt. Dunlop' };

interface Props { userRole: string; additionalRoles?: string[] }

// Per-approver inbox (D39): each role sees the requests currently waiting on it,
// plus the requests it filed. Approvals are actioned here, in the approver's own
// workspace — not inside the safety console.
export default function ApprovalsInbox({ userRole, additionalRoles = [] }: Props) {
  const roles = useMemo(() => [userRole, ...additionalRoles], [userRole, additionalRoles]);
  const { requests, decideRequest } = useApprovalRequests();

  const awaiting = pendingForRoles(requests, roles);
  const mine = requestedByName(requests, CURRENT_USER.name);

  function decide(req: ApprovalRequest, decision: 'approve' | 'deny', comment?: string) {
    const note = comment?.trim();
    const updated = decideRequest(req.id, decision, `${roleLabel(userRole)}`, comment);
    if (!updated) return;
    // Tell the requester what happened; if it advanced, ping the next approver.
    eventStore.publish({
      id: `approval-decided-${req.id}-${Date.now()}`,
      severity: decision === 'deny' ? 'warn' : 'info',
      title: decision === 'deny' ? `Waiver denied: ${req.subjectTitle}` : (updated.status === 'approved' ? `Waiver approved: ${req.subjectTitle}` : `${req.subjectTitle}: ${roleLabel(userRole)} approved`),
      detail: decision === 'deny'
        ? (note ? `${roleLabel(userRole)}: “${note}”` : `Denied by ${roleLabel(userRole)}`)
        : (updated.status === 'approved' ? 'Fully approved' : `Now with ${roleLabel(currentApproverRole(updated) || '')}`),
      module: 'Safety', link: '/approvals',
      audienceRoles: [req.requestedByRole, ...(updated.status === 'pending' && currentApproverRole(updated) ? [currentApproverRole(updated) as string] : [])],
    });
  }

  return (
    <div className="max-w-[900px] mx-auto px-6 py-6" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
      <div className="flex items-center gap-2.5 mb-1">
        <ShieldCheck className="w-6 h-6 text-accent" />
        <h1 className="text-[22px] font-semibold tracking-tight m-0">Approvals</h1>
      </div>
      <div className="text-[13.5px] text-muted-foreground mb-5">Requests waiting on you, and the ones you’ve filed. You’re acting as {roleLabel(userRole)}.</div>

      <SectionHeading>Awaiting your approval{awaiting.length > 0 ? ` · ${awaiting.length}` : ''}</SectionHeading>
      {awaiting.length === 0
        ? <Empty>Nothing needs your sign-off right now.</Empty>
        : <div className="flex flex-col gap-3">{awaiting.map((r) => <AwaitingCard key={r.id} req={r} actingRole={userRole} onDecide={decide} />)}</div>}

      <SectionHeading className="mt-8">Requested by you</SectionHeading>
      {mine.length === 0
        ? <Empty>You haven’t filed anything that needs approval.</Empty>
        : <div className="flex flex-col gap-2">{mine.map((r) => <MineRow key={r.id} req={r} />)}</div>}
    </div>
  );
}

function AwaitingCard({ req, actingRole, onDecide }: { req: ApprovalRequest; actingRole: string; onDecide: (r: ApprovalRequest, d: 'approve' | 'deny', c?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [comment, setComment] = useState('');
  const stepNo = req.currentStep + 1;

  return (
    <div className="bg-card border border-border rounded-[12px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-medium text-foreground">{req.subjectTitle}</div>
          <div className="text-[12.5px] text-muted-foreground mt-0.5">{req.formLabel} · requested by {req.requestedByName} · {timeAgo(req.requestedAt)}</div>
        </div>
        <span className="text-[11px] bg-accent/10 text-accent px-2 py-1 rounded-[8px] whitespace-nowrap shrink-0">Step {stepNo} of {req.chain.length}</span>
      </div>

      {/* prior approvals in the chain */}
      {req.chain.slice(0, req.currentStep).filter((s) => s.status === 'approved').map((s, i) => (
        <div key={i} className="text-[12.5px] text-[color:var(--gfo-success)] mt-2 flex items-start gap-1.5">
          <Check className="w-4 h-4 mt-px shrink-0" />
          <span>{roleLabel(s.role)} approved{s.comment ? ` — “${s.comment}”` : ''}</span>
        </div>
      ))}

      <button onClick={() => setOpen((v) => !v)} className="mt-2.5 flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />} {open ? 'Hide' : 'View'} request details
      </button>
      {open && (
        <div className="mt-2 border border-border rounded-[9px] divide-y divide-border">
          {Object.entries(req.values).filter(([, v]) => (v || '').trim()).map(([id, v]) => (
            <div key={id} className="px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{req.fieldLabels[id] || id}</div>
              <div className="text-[13.5px] text-foreground mt-0.5 whitespace-pre-wrap">{v}</div>
            </div>
          ))}
          <div className="px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Approval chain</div>
            <div className="text-[13px] text-foreground mt-0.5">{req.chain.map((s) => roleLabel(s.role)).join('  →  ')}</div>
          </div>
        </div>
      )}

      {commenting && (
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} autoFocus
          placeholder="Add a note for the requester and next approver…"
          className="w-full mt-3 bg-background border border-border rounded-[9px] px-3 py-2 text-[13.5px] outline-none focus:border-accent" />
      )}

      <div className="flex flex-wrap gap-2 mt-3">
        <Button onClick={() => onDecide(req, 'approve', commenting ? comment : undefined)} className="h-10 gap-1.5">
          <Check className="w-4 h-4" /> Approve{commenting && comment.trim() ? ' with note' : ''}
        </Button>
        {!commenting && (
          <Button variant="outline" onClick={() => setCommenting(true)} className="h-10 gap-1.5">
            <MessageSquarePlus className="w-4 h-4" /> Add a comment
          </Button>
        )}
        <Button variant="outline" onClick={() => onDecide(req, 'deny', commenting ? comment : undefined)}
          className="h-10 gap-1.5 text-[color:var(--gfo-error)] border-[color:var(--gfo-error)]/40 hover:bg-[color:var(--gfo-error)]/5">
          <X className="w-4 h-4" /> Deny
        </Button>
      </div>
    </div>
  );
}

function MineRow({ req }: { req: ApprovalRequest }) {
  const label =
    req.status === 'approved' ? { text: 'Approved', tone: 'text-[color:var(--gfo-success)]', icon: <Check className="w-4 h-4" /> }
      : req.status === 'denied' ? { text: 'Denied', tone: 'text-[color:var(--gfo-error)]', icon: <X className="w-4 h-4" /> }
        : { text: `With ${roleLabel(currentApproverRole(req) || '')}`, tone: 'text-[color:var(--gfo-warning)]', icon: <Clock className="w-4 h-4" /> };
  // The outcome you most want to see on your own request is the deciding
  // approver's note — surface the last actioned step's comment (esp. a denial).
  const lastDecided = [...req.chain].reverse().find((s) => s.status !== 'pending');
  return (
    <div className="bg-card border border-border rounded-[12px] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[14px] text-foreground truncate">{req.subjectTitle}</div>
          <div className="text-[12px] text-muted-foreground mt-0.5">{req.formLabel} · filed {timeAgo(req.requestedAt)}</div>
        </div>
        <span className={`text-[12.5px] font-medium flex items-center gap-1.5 whitespace-nowrap ${label.tone}`}>{label.icon}{label.text}</span>
      </div>
      {lastDecided?.comment && (
        <div className="text-[12.5px] text-muted-foreground mt-2 pt-2 border-t border-border">
          {roleLabel(lastDecided.role)}: “{lastDecided.comment}”
        </div>
      )}
    </div>
  );
}

function SectionHeading({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-[12px] uppercase tracking-wider text-muted-foreground font-semibold mb-2.5 px-0.5 ${className}`}>{children}</div>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-[13.5px] text-muted-foreground bg-card border border-border rounded-[12px] px-4 py-5 text-center">{children}</div>;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return 'recently';
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}
