import { useMemo, useState } from 'react';
import { Check, X, Clock, ChevronRight, ChevronDown, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import {
  useApprovalRequests, pendingForRoles, requestedByName, currentStep, roleLabel,
  type ApprovalRequest,
} from '../safety-center/approvalRequests';
import { ChainStrip } from '../safety-center/ChainStrip';
import { resolveUserId } from '../../notifications/identity';
import { SYSTEM_USERS } from '../../lib/mockUsers';
import { decideAndNotify } from './decide';
import { timeAgo } from './format';

interface Props { userRole: string; additionalRoles?: string[] }

// Per-approver inbox (D39). For a waiver this is the LINE MANAGER's screen — the
// end of the chain, where the decision is actually made (D85). Two things follow
// from that and shape the layout:
//
//  - It is read on a phone. A line manager approving a duty extension is not at
//    a desk, so the primary action is full-width and thumb-height, and the
//    chain and the recommendation are readable without expanding anything.
//  - A denial ENDS the request. The requester gets nothing back but "declined"
//    unless a reason travels with it, so a reason is required to deny.
//    Approving stays one tap.
export default function ApprovalsInbox({ userRole, additionalRoles = [] }: Props) {
  const roles = useMemo(() => [userRole, ...additionalRoles], [userRole, additionalRoles]);
  const { requests } = useApprovalRequests();

  // D85 — a step addressed to an individual leaves everyone else's inbox, so the
  // inbox is filtered by WHO is looking, not only by their roles.
  const viewerUserId = resolveUserId(userRole);
  // The demo has no auth; resolve the acting persona's real name so "Requested
  // by you" means the person on screen rather than a hardcoded pilot.
  const viewerName = SYSTEM_USERS.find((u) => u.id === viewerUserId)?.name ?? 'You';

  const awaiting = pendingForRoles(requests, roles, viewerUserId);
  const mine = requestedByName(requests, viewerName);

  function decide(req: ApprovalRequest, decision: 'approve' | 'deny', comment?: string) {
    // Shared decision path (D40): the Safety-Center Decide surface actions
    // through this same helper, so both walk the chain and notify identically.
    decideAndNotify(req, decision, userRole, comment);
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-5 sm:py-6">
      <div className="flex items-center gap-2.5 mb-1">
        <ShieldCheck className="w-6 h-6 text-accent" />
        <h1 className="text-[22px] font-semibold tracking-tight m-0">Approvals</h1>
      </div>
      <div className="text-[13.5px] text-muted-foreground mb-5">
        Requests waiting on you, and the ones you’ve filed. You’re acting as {roleLabel(userRole)}.
      </div>

      <SectionHeading>Awaiting your approval{awaiting.length > 0 ? ` · ${awaiting.length}` : ''}</SectionHeading>
      {awaiting.length === 0
        ? <Empty>Nothing needs your sign-off right now.</Empty>
        : <div className="flex flex-col gap-3">{awaiting.map((r) => <AwaitingCard key={r.id} req={r} onDecide={decide} />)}</div>}

      <SectionHeading className="mt-8">Requested by you</SectionHeading>
      {mine.length === 0
        ? <Empty>You haven’t filed anything that needs approval.</Empty>
        : <div className="flex flex-col gap-2">{mine.map((r) => <MineRow key={r.id} req={r} />)}</div>}
    </div>
  );
}

function AwaitingCard({ req, onDecide }: {
  req: ApprovalRequest; onDecide: (r: ApprovalRequest, d: 'approve' | 'deny', c?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const canDeny = note.trim().length > 0;

  // What earlier steps said, with attribution — the "Safety says" the final
  // approver is meant to read BEFORE deciding, so it is not behind a disclosure
  // triangle.
  const priorNotes = req.chain
    .slice(0, req.currentStep)
    .map((s, i) => ({ ...s, i }))
    .filter((s) => s.status === 'approved' && s.comment);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 pb-3">
        <div className="text-[16px] font-medium leading-snug">{req.subjectTitle}</div>
        <div className="text-[12.5px] text-muted-foreground mt-1">
          {req.formLabel} · {req.requestedByName} · {timeAgo(req.requestedAt)}
        </div>
      </div>

      <div className="px-4 py-3 bg-muted/40 border-y border-border overflow-x-auto">
        <ChainStrip req={req} />
      </div>

      {priorNotes.map((s) => (
        <div key={s.i} className="px-4 pt-3">
          <div className="gfo-eyebrow opacity-70">{roleLabel(s.role)} says</div>
          <div className="text-[13.5px] leading-relaxed mt-1">{s.comment}</div>
          <div className="text-[11.5px] text-muted-foreground mt-1">
            {s.decidedByName}{s.decidedAt ? ` · ${new Date(s.decidedAt).toLocaleDateString()}` : ''}
          </div>
        </div>
      ))}

      <div className="px-4 pt-3">
        <button onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-[13px] font-medium text-accent hover:underline min-h-[36px]">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {open ? 'Hide' : 'View'} what they asked for
        </button>
        {open && (
          <div className="mt-1 mb-1 border border-border rounded-lg divide-y divide-border">
            {Object.entries(req.values).filter(([, v]) => (v || '').trim()).map(([id, v]) => (
              <div key={id} className="px-3 py-2.5">
                <div className="gfo-eyebrow opacity-70">{req.fieldLabels[id] || id}</div>
                <div className="text-[13.5px] text-foreground mt-1 whitespace-pre-wrap">{v}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 pt-3 flex flex-col gap-2.5">
        <label className="gfo-eyebrow opacity-70" htmlFor={`note-${req.id}`}>
          Your note — required to decline
        </label>
        <textarea id={`note-${req.id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Anything the requester should know…"
          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-[14px] leading-relaxed outline-none focus:ring-2 focus:ring-accent resize-y" />

        {/* Phone-first: the primary action is full-width and thumb-height. */}
        <Button onClick={() => onDecide(req, 'approve', note.trim() || undefined)}
          className="w-full h-12 text-[15px] font-semibold gap-2">
          <Check className="w-[18px] h-[18px]" /> Approve
        </Button>
        <button
          onClick={() => canDeny && onDecide(req, 'deny', note.trim())}
          disabled={!canDeny}
          className="w-full h-11 rounded-md border text-[14px] font-medium flex items-center justify-center gap-2 transition-colors border-[color:var(--gfo-error-ink)] text-[color:var(--gfo-error-ink)] enabled:hover:bg-[color:var(--gfo-error)]/10 disabled:opacity-40 disabled:cursor-not-allowed">
          <X className="w-4 h-4" /> Decline
        </button>
        {!canDeny && (
          <div className="text-[11.5px] text-muted-foreground text-center -mt-1">
            A decline needs a reason — the requester sees only what you write here.
          </div>
        )}
      </div>
    </div>
  );
}

function MineRow({ req }: { req: ApprovalRequest }) {
  const step = currentStep(req);
  const label =
    req.status === 'approved' ? { text: 'Approved', tone: 'text-[color:var(--gfo-success-ink)]', icon: <Check className="w-4 h-4" /> }
      : req.status === 'denied' ? { text: 'Declined', tone: 'text-[color:var(--gfo-error-ink)]', icon: <X className="w-4 h-4" /> }
        // Name the PERSON when the step is addressed to one — "With Lead Team"
        // misdescribes who can act once only one of them can see it (D85).
        : { text: `With ${step?.assigneeName ?? roleLabel(step?.role ?? '')}`, tone: 'text-[color:var(--gfo-warning-ink)]', icon: <Clock className="w-4 h-4" /> };
  const lastDecided = [...req.chain].reverse().find((s) => s.status !== 'pending');
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-[14px] text-foreground">{req.subjectTitle}</div>
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
  return <div className="text-[13.5px] text-muted-foreground bg-card border border-border rounded-lg px-4 py-5 text-center">{children}</div>;
}
