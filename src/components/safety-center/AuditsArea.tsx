// Wires the existing, already-persisted audit module into the new Safety Center.
// "Wire in, restyle later": Operations mounts the full InternalAuditManagement
// (assignment + 12-month calendar + draft pool + findings drawer); My Safety
// surfaces the current user's assigned audits and reuses the real detail drawer.

import { useMemo, useState } from 'react';
import { ClipboardCheck, CalendarClock, ChevronRight } from 'lucide-react';
import InternalAuditManagement from '../InternalAuditManagement';
import GRATReview from '../GRATReview';
import { FratSeen } from './FratSeen';
import AuditDetailDrawer from '../audit/AuditDetailDrawer';
import { useAudits, type Audit } from '../../contexts/AuditContext';

const STATUS_TONE: Record<string, string> = {
  'In Progress': 'sc-amber',
  'Scheduled': 'sc-accent',
  'Complete': 'sc-green',
  'Overdue': 'sc-red',
};

export function auditsForMe(all: Audit[]): Audit[] {
  // Demo has no auth: show every assigned (non-pool) audit so any persona can
  // experience the flow. In production this filters by the signed-in user.
  return all.filter((a) => a.assignedTo && a.assignedTo !== 'Unassigned');
}

/** Assure (D85) — everything the safety manager does to check that the system is
 *  working: the audit programme, and the crews' risk assessments.
 *
 *  These used to sit under "Reviews" beside the waiver approvals, which put two
 *  different jobs behind one label: approving a request is a DECISION, seeing a
 *  crew's risk assessment is ASSURANCE.
 *
 *  The FRAT tab is an ATTESTATION, not a review (Bryan, 2026-08-19: "the crew are
 *  the only ones who really interact with the frat. The Safety Manager just marks
 *  them complete after the flight to show that they saw it"). The full
 *  approve/reject console it replaced described a job nobody does; it still lives
 *  at /safety/frat-review. GRAT keeps its console for now — nobody has said
 *  whether it works the same way. */
export function OperationsAudits({ actorName = 'Safety' }: { actorName?: string } = {}) {
  const [sub, setSub] = useState<'audits' | 'frat' | 'grat'>('audits');
  const TABS: [typeof sub, string][] = [['audits', 'Audit programme'], ['frat', 'FRAT — seen'], ['grat', 'GRAT reviews']];
  return (
    <div className="mt-3">
      <div className="flex gap-2 flex-wrap mb-1">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setSub(key)}
            className={`text-[14px] font-semibold px-4 py-2 min-h-[44px] rounded-full border transition-colors ${sub === key ? 'bg-secondary text-secondary-foreground border-secondary' : 'bg-card text-muted-foreground border-border hover:border-muted-foreground/40'}`}>
            {label}
          </button>
        ))}
      </div>
      {sub === 'frat'
        ? <FratSeen actorName={actorName} />
        : (
          <div className="-mx-6 mt-1">
            {sub === 'audits' && <InternalAuditManagement />}
            {sub === 'grat' && <GRATReview />}
          </div>
        )}
    </div>
  );
}

/** My Safety: assigned audits + the real findings drawer.
 *  dueOnly renders just the open ones as rows (no headers/empty state) so the
 *  Home "Needs you" section can include audits without a separate tab. */
export function MyAudits({ dueOnly = false }: { dueOnly?: boolean }) {
  const { audits } = useAudits();
  const [sel, setSel] = useState<Audit | null>(null);
  const [open, setOpen] = useState(false);

  const mine = useMemo(() => auditsForMe(audits), [audits]);
  const active = mine.filter((a) => a.status !== 'Complete');
  const done = mine.filter((a) => a.status === 'Complete');

  function openAudit(a: Audit) { setSel(a); setOpen(true); }

  const activeRows = active.map((a) => (
    <button key={a.id} onClick={() => openAudit(a)}
      className="text-left bg-card border border-border rounded-lg px-4 py-4 min-h-[60px] flex items-center gap-3 hover:border-muted-foreground/40 hover:shadow-sm transition-all active:scale-[.995]">
      <div className="w-10 h-10 rounded-lg grid place-items-center shrink-0" style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}>
        <ClipboardCheck className="w-5 h-5 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium text-foreground truncate">{a.title}</div>
        <div className="text-[12.5px] text-muted-foreground mt-0.5 flex gap-2 flex-wrap items-center">
          {a.isbaoPart && <span>{a.isbaoPart}</span>}
          {a.dueDate && <span className="inline-flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> due {a.dueDate}</span>}
          <span>· {a.completionRate}% done</span>
        </div>
      </div>
      <span className={`text-[12px] font-medium rounded-full px-3 py-1.5 shrink-0 ${STATUS_TONE[a.status] ?? 'sc-neutral'}`}>{a.status}</span>
      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
    </button>
  ));

  if (dueOnly) {
    return (
      <>
        {activeRows.length > 0 && <div className="flex flex-col gap-2">{activeRows}</div>}
        <AuditDetailDrawer audit={sel} open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  if (mine.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-[15px] text-foreground/70 font-medium mb-1">No audits assigned to you.</div>
        <div className="text-sm text-muted-foreground">The safety manager assigns audits from Operations → Audits.</div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {active.length > 0 && (
        <>
          <div className="text-[11.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-0.5">Assigned to you</div>
          <div className="flex flex-col gap-2">{activeRows}</div>
        </>
      )}

      {done.length > 0 && (
        <>
          <div className="text-[11.5px] uppercase tracking-wider text-muted-foreground font-semibold mt-6 mb-2 px-0.5">Completed</div>
          <div className="flex flex-col gap-2">
            {done.map((a) => (
              <button key={a.id} onClick={() => openAudit(a)}
                className="text-left bg-card border border-border rounded-lg px-4 py-3.5 min-h-[52px] flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
                <div className="w-6 h-6 rounded-sm grid place-items-center shrink-0 sc-green">✓</div>
                <div className="flex-1 min-w-0 text-[14px] text-muted-foreground truncate">{a.title}</div>
                <span className="text-[12px] text-muted-foreground shrink-0">{a.dueDate}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <AuditDetailDrawer audit={sel} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
