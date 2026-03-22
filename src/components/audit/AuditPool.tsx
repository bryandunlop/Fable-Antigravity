import React, { useState } from 'react';
import { Package, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Audit, useAudits } from '../../contexts/AuditContext';
import AuditCard from './AuditCard';
import { toast } from 'sonner';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface AuditPoolProps {
  poolAudits: Audit[];
  onAuditClick: (audit: Audit) => void;
}

export default function AuditPool({ poolAudits, onAuditClick }: AuditPoolProps) {
  const [expanded, setExpanded] = useState(true);
  const { updateAudit } = useAudits();

  const scheduleToMonth = (audit: Audit, month: number, year: number) => {
    const paddedMonth = String(month + 1).padStart(2, '0');
    const scheduledDate = `${year}-${paddedMonth}-01`;
    updateAudit(audit.id, {
      status: 'Scheduled',
      scheduledDate,
      dueDate: `${year}-${paddedMonth}-28`,
    });
    toast.success(`"${audit.title}" scheduled for ${MONTH_NAMES[month]} ${year}`);
  };

  return (
    <div className="border rounded-xl bg-amber-50/50 border-amber-200 overflow-hidden">
      {/* Pool Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-900">Audit Pool</span>
          <Badge className="text-[10px] h-4 px-1.5 bg-amber-200 text-amber-800 border-0">
            {poolAudits.length} unscheduled
          </Badge>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
      </button>

      {/* Pool Cards */}
      {expanded && (
        <div className="px-3 pb-3">
          <div className="flex gap-3 overflow-x-auto pb-1">
            {poolAudits.map(audit => (
              <div key={audit.id} className="flex-shrink-0 w-60">
                <AuditCard audit={audit} onClick={onAuditClick} />

                {/* Schedule Button */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-1.5 h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
                    >
                      <Calendar className="w-3 h-3 mr-1.5" />
                      Schedule to Month →
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">Schedule to month:</p>
                    <div className="grid grid-cols-3 gap-1">
                      {MONTH_NAMES.map((month, idx) => (
                        <Button
                          key={month}
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs justify-center"
                          onClick={() => scheduleToMonth(audit, idx, new Date().getFullYear())}
                        >
                          {month.slice(0, 3)}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
