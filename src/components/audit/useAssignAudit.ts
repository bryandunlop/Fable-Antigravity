import { useAudits, Audit } from '../../contexts/AuditContext';
import { toast } from 'sonner';

// Single assign path shared by every surface (roster popover, unassigned tray,
// inline card chip). Every assignment snapshots the prior value and offers a
// real Undo — no assignment is silent or irreversible.
export function useAssignAudit() {
  const { updateAudit } = useAudits();

  return (audit: Audit, name: string, role: string, method: string) => {
    const prev = {
      assignedTo: audit.assignedTo,
      assignedRole: audit.assignedRole,
      assignmentType: audit.assignmentType,
    };
    updateAudit(audit.id, { assignedTo: name, assignedRole: role, assignmentType: method });
    toast.success(`${audit.id} assigned to ${name}`, {
      action: {
        label: 'Undo',
        onClick: () => updateAudit(audit.id, prev),
      },
    });
  };
}
