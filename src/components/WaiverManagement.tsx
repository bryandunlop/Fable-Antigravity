// Waiver register — the safety manager's fleet-wide view of REAL filed waivers
// (D40). Before this, the console held its own hardcoded mock array (WV-001…),
// so a waiver a crew member actually filed could never appear here; after D39
// real waivers live in the shared approvalRequests store and are actioned in the
// global /approvals inbox.
//
// This surface reads that SAME store and actions through the SAME decide helper
// (approvals/decide). There is no second waiver record. The difference from
// /approvals is scope, not data: the inbox is per-approver ("what's on my
// desk"), this is every waiver and where each one sits in its chain — the view
// a manager needs and the inbox deliberately does not provide.
//
// Actioning is gated to the role currently on-step: a manager sees everything
// but can only decide what is genuinely theirs to decide.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check, X, Clock, MessageSquarePlus, ChevronRight, ChevronDown,
  FileCheck, Search, AlertTriangle, ArrowUpRight, Circle,
} from 'lucide-react';
import { Button } from './ui/button';
import {
  useApprovalRequests, currentApproverRole, roleLabel,
  type ApprovalRequest, type ApprovalStep,
} from './safety-center/approvalRequests';
import { waiversOnly, waiverStats, isAwaitingRoles, OVERDUE_AFTER_MS } from './safety-center/waiverConsole';
import { decideAndNotify } from './approvals/decide';
import { timeAgo, formatDuration } from './approvals/format';

type StatusFilter = 'all' | 'pending' | 'approved' | 'denied';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'In progress' },
  { key: 'approved', label: 'Approved' },
  { key: 'denied', label: 'Denied' },
];

const OVERDUE_DAYS = Math.round(OVERDUE_AFTER_MS / 86_400_000);

interface Props { userRole: string; additionalRoles?: string[] }

export default function WaiverManagement({ userRole, additionalRoles = [] }: Props) {
  const roles = useMemo(() => [userRole, ...additionalRoles], [userRole, additionalRoles]);
  const { requests } = useApprovalRequests();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const now = Date.now();
  const stats = waiverStats(requests, now);
  const all = waiversOnly(requests);
  const awaitingMe = all.filter((r) => isAwaitingRoles(r, roles)).length;

  const q = search.trim().toLowerCase();
  const visible = all
    .filter((r) => (status === 'all' ? true : r.status === status))
    .filter((r) => !q
      || r.subjectTitle.toLowerCase().includes(q)
      || r.requestedByName.toLowerCase().includes(q)
      || r.id.toLowerCase().includes(q))
    // Still-open waivers first, oldest at the top (those are the ones aging);
    // settled ones after, most recently filed first.
    .sort((a, b) => {
      const aOpen = a.status === 'pending', bOpen = b.status === 'pending';
      if (aOpen !== bOpen) return aOpen ? -1 : 1;
      const at = new Date(a.requestedAt).getTime(), bt = new Date(b.requestedAt).getTime();
      return aOpen ? at - bt : bt - at;
    });

  function decide(req: ApprovalRequest, decision: 'approve' | 'deny', comment?: string) {
    decideAndNotify(req, decision, userRole, comment);
  }

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-6" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-2.5">
          <FileCheck className="w-6 h-6 text-accent" />
          <h1 className="text-[22px] font-semibold tracking-tight m-0">Waiver register</h1>
        </div>
        <Link to="/approvals"
          className="text-[13px] font-medium text-accent hover:underline flex items-center gap-1 mt-1">
          My approvals inbox <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="text-[13.5px] text-muted-foreground mb-5">
        Every waiver filed, and where each one sits in its approval chain. You’re acting as {roleLabel(userRole)} —
        you can decide the steps assigned to you here; the rest are read-only.
      </div>

      {/* tiles, computed from the real store */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <Tile label="In progress" value={stats.pending} icon={<Clock className="w-4 h-4" />} />
        <Tile label="Awaiting you" value={awaitingMe} icon={<Check className="w-4 h-4" />} accent />
        <Tile label="Approved" value={stats.approved} icon={<Check className="w-4 h-4" />} />
        <Tile label="Denied" value={stats.denied} icon={<X className="w-4 h-4" />} />
      </div>

      <div className="text-[12.5px] text-muted-foreground mb-5 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>
          Average time to clear:{' '}
          <span className="text-foreground font-medium">
            {stats.avgClearMs == null ? 'nothing cleared yet' : formatDuration(stats.avgClearMs)}
          </span>
        </span>
        {stats.overdue > 0 && (
          <span className="flex items-center gap-1.5 text-[color:var(--gfo-warning)]">
            <AlertTriangle className="w-4 h-4" />
            {stats.overdue} open longer than {OVERDUE_DAYS} days
          </span>
        )}
      </div>

      {/* search + status filter */}
      <div className="flex flex-col md:flex-row gap-2.5 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject, requester, or id…"
            className="w-full bg-background border border-border rounded-[9px] pl-9 pr-3 py-2 text-[13.5px] outline-none focus:border-accent" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setStatus(f.key)}
              className={`text-[13px] font-medium px-3.5 py-2 min-h-[40px] rounded-full border transition-colors ${status === f.key ? 'bg-secondary text-secondary-foreground border-secondary' : 'bg-card text-muted-foreground border-border hover:border-muted-foreground/40'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="text-[13.5px] text-muted-foreground bg-card border border-border rounded-[12px] px-4 py-6 text-center">
          {all.length === 0
            ? 'No waivers have been filed yet. Crew file them from the Safety Center — they arrive here as soon as they’re submitted.'
            : 'No waivers match this search or filter.'}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((r) => (
            <WaiverCard key={r.id} req={r} canAct={isAwaitingRoles(r, roles)} now={now} onDecide={decide} />
          ))}
        </div>
      )}
    </div>
  );
}

function WaiverCard({ req, canAct, now, onDecide }: {
  req: ApprovalRequest; canAct: boolean; now: number;
  onDecide: (r: ApprovalRequest, d: 'approve' | 'deny', c?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [comment, setComment] = useState('');

  const filed = new Date(req.requestedAt).getTime();
  const overdue = req.status === 'pending' && !isNaN(filed) && now - filed > OVERDUE_AFTER_MS;

  return (
    <div className="bg-card border border-border rounded-[12px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-medium text-foreground">{req.subjectTitle}</div>
          <div className="text-[12.5px] text-muted-foreground mt-0.5">
            {req.formLabel} · {req.id} · requested by {req.requestedByName} · filed {timeAgo(req.requestedAt, now)}
          </div>
        </div>
        <StatusPill req={req} />
      </div>

      {overdue && (
        <div className="text-[12.5px] text-[color:var(--gfo-warning)] mt-2 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Open longer than {OVERDUE_DAYS} days
        </div>
      )}

      {/* the multi-tier chain view, preserved from the old console but now real */}
      <div className="mt-2.5 flex flex-col gap-1.5">
        {req.chain.map((s, i) => (
          <StepRow key={i} step={s} isCurrent={req.status === 'pending' && i === req.currentStep} />
        ))}
      </div>

      <button onClick={() => setOpen((v) => !v)}
        className="mt-2.5 flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {open ? 'Hide' : 'View'} what was requested
      </button>
      {open && (
        <div className="mt-2 border border-border rounded-[9px] divide-y divide-border">
          {Object.entries(req.values).filter(([, v]) => (v || '').trim()).map(([id, v]) => (
            <div key={id} className="px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                {req.fieldLabels[id] || id}
              </div>
              <div className="text-[13.5px] text-foreground mt-0.5 whitespace-pre-wrap">{v}</div>
            </div>
          ))}
        </div>
      )}

      {canAct ? (
        <>
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
        </>
      ) : req.status === 'pending' ? (
        <div className="text-[12.5px] text-muted-foreground mt-3 pt-3 border-t border-border">
          Waiting on {roleLabel(currentApproverRole(req) || '')} — not your step to decide.
        </div>
      ) : null}
    </div>
  );
}

/** One step of the chain with the reviewer's note — the "approval history" the
 *  old console showed, now read from the real request. */
function StepRow({ step, isCurrent }: { step: ApprovalStep; isCurrent: boolean }) {
  const meta =
    step.status === 'approved'
      ? { icon: <Check className="w-4 h-4" />, tone: 'text-[color:var(--gfo-success)]', verb: 'approved' }
      : step.status === 'denied'
        ? { icon: <X className="w-4 h-4" />, tone: 'text-[color:var(--gfo-error)]', verb: 'denied' }
        : isCurrent
          ? { icon: <Clock className="w-4 h-4" />, tone: 'text-[color:var(--gfo-warning)]', verb: 'deciding now' }
          : { icon: <Circle className="w-3 h-3" />, tone: 'text-muted-foreground', verb: 'queued' };

  return (
    <div className={`text-[12.5px] flex items-start gap-1.5 ${meta.tone}`}>
      <span className="mt-px shrink-0">{meta.icon}</span>
      <span className="min-w-0">
        {roleLabel(step.role)} {meta.verb}
        {step.decidedByName ? ` · ${step.decidedByName}` : ''}
        {step.comment ? <span className="text-muted-foreground"> — “{step.comment}”</span> : null}
      </span>
    </div>
  );
}

function StatusPill({ req }: { req: ApprovalRequest }) {
  const p =
    req.status === 'approved'
      ? { text: 'Approved', cls: 'text-[color:var(--gfo-success)] bg-[color:var(--gfo-success)]/10' }
      : req.status === 'denied'
        ? { text: 'Denied', cls: 'text-[color:var(--gfo-error)] bg-[color:var(--gfo-error)]/10' }
        : { text: `With ${roleLabel(currentApproverRole(req) || '')}`, cls: 'text-[color:var(--gfo-warning)] bg-[color:var(--gfo-warning)]/10' };
  return <span className={`text-[11px] px-2 py-1 rounded-[8px] whitespace-nowrap shrink-0 font-medium ${p.cls}`}>{p.text}</span>;
}

function Tile({ label, value, icon, accent }: {
  label: string; value: number; icon: React.ReactNode; accent?: boolean;
}) {
  const lit = accent && value > 0;
  return (
    <div className={`bg-card border rounded-[12px] px-3.5 py-3 ${lit ? 'border-accent' : 'border-border'}`}>
      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <span className="shrink-0">{icon}</span>{label}
      </div>
      <div className={`text-[24px] leading-tight mt-0.5 ${lit ? 'text-accent font-semibold' : 'text-foreground'}`}>{value}</div>
    </div>
  );
}
