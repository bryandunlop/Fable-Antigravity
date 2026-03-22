import React, { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Audit, useAudits } from '../../contexts/AuditContext';
import AuditCard from './AuditCard';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface AuditCalendarProps {
  onAuditClick: (audit: Audit) => void;
  onAddAudit: (month?: number, year?: number) => void;
}

export default function AuditCalendar({ onAuditClick, onAddAudit }: AuditCalendarProps) {
  const [year, setYear] = useState(new Date().getFullYear());
  const { getAuditsByMonth, audits } = useAudits();

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  return (
    <div className="flex flex-col h-full">
      {/* Year Navigation */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setYear(y => y - 1)}
          className="h-9 px-3 hover:bg-muted"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {year - 1}
        </Button>

        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">{year}</h2>
          <p className="text-xs text-muted-foreground">
            {audits.filter(a => {
              if (!a.scheduledDate || a.status === 'Draft') return false;
              return new Date(a.scheduledDate + 'T00:00:00').getFullYear() === year;
            }).length} audits this year
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setYear(y => y + 1)}
          className="h-9 px-3 hover:bg-muted"
        >
          {year + 1}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* 12-Month Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 flex-1 overflow-y-auto pb-4 pr-1">
        {MONTH_NAMES.map((monthName, monthIndex) => {
          const monthAudits = getAuditsByMonth(year, monthIndex);
          const isCurrentMonth = year === currentYear && monthIndex === currentMonth;
          const isPast = year < currentYear || (year === currentYear && monthIndex < currentMonth);
          const hasOverdue = monthAudits.some(a => a.status === 'Overdue');
          const hasUnassigned = monthAudits.some(a => !a.assignedTo || a.assignedTo === 'Unassigned');

          return (
            <div
              key={monthName}
              className={`
                flex flex-col border rounded-2xl overflow-hidden transition-all
                ${isCurrentMonth
                  ? 'border-blue-400 ring-2 ring-blue-100 shadow-sm'
                  : hasOverdue
                  ? 'border-red-300 bg-red-50/30'
                  : isPast && monthAudits.length === 0
                  ? 'border-dashed border-gray-200 opacity-60'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
              `}
            >
              {/* Month Header */}
              <div className={`
                flex items-center justify-between px-3 py-2 shrink-0
                ${isCurrentMonth ? 'bg-blue-500 text-white' : hasOverdue ? 'bg-red-50' : 'bg-muted/40'}
              `}>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${isCurrentMonth ? 'text-white' : 'text-foreground'}`}>
                    {monthName}
                  </span>
                  {monthAudits.length > 0 && (
                    <Badge
                      className={`text-[9px] h-4 px-1.5 border-0 ${
                        isCurrentMonth ? 'bg-white/20 text-white' : 'bg-background text-muted-foreground'
                      }`}
                    >
                      {monthAudits.length}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {hasUnassigned && (
                    <AlertCircle className={`w-3.5 h-3.5 ${isCurrentMonth ? 'text-red-200' : 'text-red-500'}`} title="Has unassigned audits" />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-6 w-6 rounded-full ${
                      isCurrentMonth
                        ? 'hover:bg-white/20 text-white'
                        : 'hover:bg-background text-muted-foreground'
                    }`}
                    onClick={() => onAddAudit(monthIndex, year)}
                    title={`Schedule audit for ${monthName} ${year}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Audit Cards */}
              <div className="flex-1 p-2 space-y-1.5 overflow-y-auto max-h-[280px]">
                {monthAudits.length === 0 ? (
                  <div className="py-4 flex flex-col items-center justify-center gap-1 opacity-40">
                    <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300" />
                    <p className="text-[10px] text-gray-400">No audits</p>
                  </div>
                ) : (
                  monthAudits.map(audit => (
                    <AuditCard
                      key={audit.id}
                      audit={audit}
                      onClick={onAuditClick}
                      compact
                    />
                  ))
                )}
              </div>

              {/* Footer — Add Button */}
              {!isPast && (
                <div className="px-2 pb-2 shrink-0">
                  <button
                    onClick={() => onAddAudit(monthIndex, year)}
                    className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed border-gray-300 text-[10px] text-muted-foreground hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add Audit
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
