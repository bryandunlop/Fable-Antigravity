import React from 'react';
import { UserPlus, Check, MoreHorizontal, Wand2, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Audit, useAudits } from '../../contexts/AuditContext';
import { AUDITORS, initialsOf } from './auditors';
import { suggestAuditor } from './assignSuggestion';
import { useAssignAudit } from './useAssignAudit';
import AssignAuditorPopover from './AssignAuditorPopover';
import { toast } from 'sonner';

// The "Needs an auditor" tray: collects every unassigned audit into one place at
// the top of the workspace, each row one-tap-acceptable with a workload-balanced
// suggestion, plus a batch "Auto-assign all" that balances across the whole set.
export default function UnassignedAuditsTray({
  onAuditClick,
}: {
  onAuditClick: (audit: Audit) => void;
}) {
  const { audits, updateAudit } = useAudits();
  const assignAudit = useAssignAudit();

  const currentYear = new Date().getFullYear();
  const unassigned = audits.filter(a => !a.assignedTo || a.assignedTo === 'Unassigned');

  if (unassigned.length === 0) return null;

  const fmtDue = (a: Audit) => {
    const raw = a.dueDate || a.scheduledDate;
    if (!raw) return a.status === 'Draft' ? 'In pool' : 'No date';
    const d = new Date(raw + 'T00:00:00');
    return 'Due ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Batch assign: hand out to each unassigned audit in turn, tallying picks in
  // extraLoad so every subsequent suggestion counts the ones already handed out
  // this run — balanced even for pool drafts that carry no scheduledDate (which
  // never register via auditLoadByPerson). One Undo restores the whole batch.
  const autoAssignAll = () => {
    const extraLoad: Record<string, number> = {};
    const applied: { id: string; prev: Partial<Audit> }[] = [];

    for (const target of audits) {
      if (target.assignedTo && target.assignedTo !== 'Unassigned') continue;
      const pick = suggestAuditor(target, AUDITORS, audits, currentYear, extraLoad);
      if (!pick) continue;
      applied.push({
        id: target.id,
        prev: {
          assignedTo: target.assignedTo,
          assignedRole: target.assignedRole,
          assignmentType: target.assignmentType,
        },
      });
      extraLoad[pick.name] = (extraLoad[pick.name] || 0) + 1;
      updateAudit(target.id, {
        assignedTo: pick.name,
        assignedRole: pick.role,
        assignmentType: 'Suggested',
      });
    }

    if (applied.length === 0) return;
    toast.success(`${applied.length} audit${applied.length > 1 ? 's' : ''} assigned`, {
      action: {
        label: 'Undo all',
        onClick: () => applied.forEach(({ id, prev }) => updateAudit(id, prev)),
      },
    });
  };

  return (
    <div className="shrink-0 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold">Needs an auditor</span>
          <span className="text-xs font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
            {unassigned.length}
          </span>
        </div>
        {unassigned.length > 1 && (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={autoAssignAll}>
            <Wand2 className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            Auto-assign all
          </Button>
        )}
      </div>

      <div className="border rounded-xl bg-card overflow-hidden divide-y">
        {unassigned.map(audit => {
          const pick = suggestAuditor(audit, AUDITORS, audits, currentYear);
          return (
            <div key={audit.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <button
                onClick={() => onAuditClick(audit)}
                className="flex-1 min-w-0 text-left group"
              >
                <div className="text-sm font-medium truncate group-hover:text-blue-600 transition-colors">
                  {audit.title}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {fmtDue(audit)} · {audit.isbaoPart || audit.category}
                </div>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                {pick && (
                  <div className="flex items-center gap-2 bg-blue-50 rounded-full pl-1 pr-2.5 py-1">
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[9px] font-bold text-blue-700">
                      {initialsOf(pick.name)}
                    </div>
                    <div className="leading-tight">
                      <div className="text-xs font-semibold text-blue-700">{pick.name}</div>
                      <div className="text-[10px] text-blue-600 flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> suggested
                      </div>
                    </div>
                  </div>
                )}
                {pick && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 border-blue-300"
                    aria-label={`Assign ${pick.name}`}
                    title={`Assign ${pick.name}`}
                    onClick={() => assignAudit(audit, pick.name, pick.role, 'Suggested')}
                  >
                    <Check className="w-4 h-4 text-blue-600" />
                  </Button>
                )}
                <AssignAuditorPopover audit={audit}>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    aria-label="Pick someone else"
                    title="Pick someone else"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </AssignAuditorPopover>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
