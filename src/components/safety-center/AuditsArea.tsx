// Wires the existing, already-persisted audit module into the new Safety Center.
// "Wire in, restyle later": Operations mounts the full InternalAuditManagement
// (assignment + 12-month calendar + draft pool + findings drawer); My Safety
// surfaces the current user's assigned audits and reuses the real detail drawer.

import { useMemo, useState } from 'react';
import { ClipboardCheck, CalendarClock, ChevronRight } from 'lucide-react';
import InternalAuditManagement from '../InternalAuditManagement';
import AuditDetailDrawer from '../audit/AuditDetailDrawer';
import { useAudits, type Audit } from '../../contexts/AuditContext';

const STATUS_TONE: Record<string, string> = {
  'In Progress': 'sc-amber',
  'Scheduled': 'sc-accent',
  'Complete': 'sc-green',
  'Overdue': 'sc-red',
};

function auditsForMe(all: Audit[]): Audit[] {
  // Demo has no auth: show every assigned (non-pool) audit so any persona can
  // experience the flow. In production this filters by the signed-in user.
  return all.filter((a) => a.assignedTo && a.assignedTo !== 'Unassigned');
}

/** Operations → Audits: the full existing module, mounted as-is. */
export function OperationsAudits() {
  return (
    <div className="mt-2 -mx-6">
      <InternalAuditManagement />
    </div>
  );
}

/** My Safety → My audits: assigned audits + the real findings drawer. */
export function MyAudits() {
  const { audits } = useAudits();
  const [sel, setSel] = useState<Audit | null>(null);
  const [open, setOpen] = useState(false);

  const mine = useMemo(() => auditsForMe(audits), [audits]);
  const active = mine.filter((a) => a.status !== 'Complete');
  const done = mine.filter((a) => a.status === 'Complete');

  function openAudit(a: Audit) { setSel(a); setOpen(true); }

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
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-0.5">Assigned to you</div>
          <div className="flex flex-col gap-2">
            {active.map((a) => (
              <button key={a.id} onClick={() => openAudit(a)}
                className="text-left bg-card border border-border rounded-[10px] px-4 py-3 flex items-center gap-3 hover:border-muted-foreground/40 hover:shadow-sm transition-all">
                <div className="w-9 h-9 rounded-[9px] grid place-items-center shrink-0" style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}>
                  <ClipboardCheck className="w-[18px] h-[18px] text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14.5px] font-medium text-foreground truncate">{a.title}</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5 flex gap-2 flex-wrap items-center">
                    {a.isbaoPart && <span>{a.isbaoPart}</span>}
                    {a.dueDate && <span className="inline-flex items-center gap-1"><CalendarClock className="w-3 h-3" /> due {a.dueDate}</span>}
                    <span>· {a.completionRate}% done</span>
                  </div>
                </div>
                <span className={`text-xs font-medium rounded-full px-2.5 py-1 shrink-0 ${STATUS_TONE[a.status] ?? 'sc-neutral'}`}>{a.status}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </>
      )}

      {done.length > 0 && (
        <>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mt-6 mb-2 px-0.5">Completed</div>
          <div className="flex flex-col gap-2">
            {done.map((a) => (
              <button key={a.id} onClick={() => openAudit(a)}
                className="text-left bg-card border border-border rounded-[10px] px-4 py-3 flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
                <div className="w-5 h-5 rounded-[6px] grid place-items-center shrink-0 sc-green">✓</div>
                <div className="flex-1 min-w-0 text-[13.5px] text-muted-foreground truncate">{a.title}</div>
                <span className="text-[11.5px] text-muted-foreground shrink-0">{a.dueDate}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <AuditDetailDrawer audit={sel} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
