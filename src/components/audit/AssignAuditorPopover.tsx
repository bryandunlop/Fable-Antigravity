import React, { useState } from 'react';
import { Search, UserCheck, Shuffle, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Audit, useAudits } from '../../contexts/AuditContext';
import { toast } from 'sonner';

const AUDITORS = [
  { name: 'Sarah Wilson',    role: 'Safety' },
  { name: 'Mike Johnson',    role: 'Pilot' },
  { name: 'Emily Davis',     role: 'Document Manager' },
  { name: 'David Brown',     role: 'Maintenance' },
  { name: 'Lisa Chen',       role: 'Safety' },
  { name: 'Tom Anderson',    role: 'Pilot' },
  { name: 'Jennifer Lee',    role: 'Inflight' },
  { name: 'Robert Martinez', role: 'Maintenance' },
  { name: 'Amanda Foster',   role: 'Safety' },
  { name: 'Chris Taylor',    role: 'Admin' },
];

const ROLE_COLORS: Record<string, string> = {
  Safety: 'bg-blue-100 text-blue-700',
  Pilot: 'bg-indigo-100 text-indigo-700',
  Maintenance: 'bg-orange-100 text-orange-700',
  Inflight: 'bg-purple-100 text-purple-700',
  'Document Manager': 'bg-teal-100 text-teal-700',
  Admin: 'bg-gray-100 text-gray-700',
};

interface AssignAuditorPopoverProps {
  audit: Audit;
  children: React.ReactNode;
}

export default function AssignAuditorPopover({ audit, children }: AssignAuditorPopoverProps) {
  const { updateAudit, audits } = useAudits();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const assign = (name: string, role: string, method: string) => {
    updateAudit(audit.id, { assignedTo: name, assignedRole: role, assignmentType: method });
    toast.success(`${audit.id} assigned to ${name}`);
    setOpen(false);
    setSearch('');
  };

  const randomAssign = () => {
    const pick = AUDITORS[Math.floor(Math.random() * AUDITORS.length)];
    assign(pick.name, pick.role, 'Random');
  };

  // Count how many audits each auditor currently has (in the same year)
  const currentYear = new Date().getFullYear();
  const auditCountByPerson: Record<string, number> = {};
  audits.forEach(a => {
    if (a.assignedTo && a.assignedTo !== 'Unassigned') {
      const yr = a.scheduledDate ? new Date(a.scheduledDate + 'T00:00:00').getFullYear() : null;
      if (yr === currentYear) {
        auditCountByPerson[a.assignedTo] = (auditCountByPerson[a.assignedTo] || 0) + 1;
      }
    }
  });

  const filtered = AUDITORS.filter(
    a =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={(v: boolean) => { setOpen(v); if (!v) setSearch(''); }}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-0 shadow-xl" align="start" sideOffset={8}>
        {/* Header */}
        <div className="px-3 py-2.5 border-b bg-muted/30">
          <p className="text-xs font-bold text-foreground">Assign Auditor</p>
          <p className="text-[10px] text-muted-foreground truncate">{audit.title}</p>
        </div>

        {/* Quick Actions */}
        <div className="px-3 pt-3 pb-2 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={randomAssign}
          >
            <Shuffle className="w-3.5 h-3.5 mr-1.5" />
            Random
          </Button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-xs"
              placeholder="Search by name or role…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Auditor List */}
        <div className="max-h-56 overflow-y-auto divide-y divide-muted/30 border-t">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No matches</p>
          ) : (
            filtered.map(auditor => {
              const count = auditCountByPerson[auditor.name] || 0;
              const isCurrent = audit.assignedTo === auditor.name;
              return (
                <button
                  key={auditor.name}
                  onClick={() => assign(auditor.name, auditor.role, 'Manual')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors text-left group ${
                    isCurrent ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                      {auditor.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{auditor.name}</p>
                      <Badge className={`text-[9px] h-3.5 px-1 border-0 ${ROLE_COLORS[auditor.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {auditor.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {isCurrent ? (
                      <UserCheck className="w-4 h-4 text-blue-600" />
                    ) : (
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-muted-foreground/40" />
                        <span className="text-[9px] text-muted-foreground">{count}↗</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
