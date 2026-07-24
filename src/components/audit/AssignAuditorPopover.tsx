import React, { useState } from 'react';
import { Search, UserCheck, Sparkles, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Audit, useAudits } from '../../contexts/AuditContext';
import { AUDITORS, ROLE_COLORS, initialsOf } from './auditors';
import { auditLoadByPerson, suggestAuditor } from './assignSuggestion';
import { useAssignAudit } from './useAssignAudit';

interface AssignAuditorPopoverProps {
  audit: Audit;
  children: React.ReactNode;
}

export default function AssignAuditorPopover({ audit, children }: AssignAuditorPopoverProps) {
  const { audits } = useAudits();
  const assignAudit = useAssignAudit();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const assign = (name: string, role: string, method: string) => {
    assignAudit(audit, name, role, method);
    setOpen(false);
    setSearch('');
  };

  // Count how many audits each auditor currently has (in the same year)
  const currentYear = new Date().getFullYear();
  const auditCountByPerson = auditLoadByPerson(audits, currentYear);

  // Balanced suggestion (role matched to the audit category, then lightest load)
  // — replaces the blind Random pick with a see-before-you-accept default.
  const suggested = suggestAuditor(audit, AUDITORS, audits, currentYear);
  const suggestAssign = () => {
    if (suggested) assign(suggested.name, suggested.role, 'Suggested');
  };

  const filtered = AUDITORS.filter(
    a =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={(v: boolean) => { setOpen(v); if (!v) setSearch(''); }}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      {/* stopPropagation on the content itself: the popover renders through a
          Radix Portal, and React synthetic events bubble through the COMPONENT
          tree, not the DOM tree — so a click on a roster row would otherwise
          reach an ancestor card's onClick (opening the drawer). Trigger-only
          stopPropagation does not cover the picks made inside the popover. */}
      <PopoverContent
        className="w-72 p-0 shadow-xl"
        align="start"
        sideOffset={8}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3 py-2.5 border-b bg-muted/30">
          <p className="text-xs font-bold text-foreground">Assign Auditor</p>
          <p className="text-[10px] text-muted-foreground truncate">{audit.title}</p>
        </div>

        {/* Quick Action — balanced suggestion, shows who before you accept */}
        <div className="px-3 pt-3 pb-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs justify-start"
            onClick={suggestAssign}
            disabled={!suggested}
            title={suggested ? `Fewest audits this year, role matched to ${audit.category}` : undefined}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            {suggested ? (
              <>Suggest <span className="font-semibold ml-1">{suggested.name}</span></>
            ) : (
              'No auditor available'
            )}
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
                      {initialsOf(auditor.name)}
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
