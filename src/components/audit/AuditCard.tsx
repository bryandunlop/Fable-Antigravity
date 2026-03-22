import React from 'react';
import { Badge } from '../ui/badge';
import { BookOpen, UserCheck, AlertCircle } from 'lucide-react';
import { Audit } from '../../contexts/AuditContext';

interface AuditCardProps {
  audit: Audit;
  onClick: (audit: Audit) => void;
  compact?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  'Scheduled':   'bg-blue-100 text-blue-800 border-blue-200',
  'In Progress': 'bg-amber-100 text-amber-800 border-amber-200',
  'Complete':    'bg-green-100 text-green-800 border-green-200',
  'Overdue':     'bg-red-100 text-red-800 border-red-200',
  'Draft':       'bg-gray-100 text-gray-600 border-gray-200',
};

const PRIORITY_DOT: Record<string, string> = {
  'High':   'bg-red-500',
  'Medium': 'bg-amber-400',
  'Low':    'bg-green-500',
};

export default function AuditCard({ audit, onClick, compact = false }: AuditCardProps) {
  const isUnassigned = !audit.assignedTo || audit.assignedTo === 'Unassigned';
  const statusStyle = STATUS_STYLES[audit.status] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  const priorityDot = PRIORITY_DOT[audit.priority] ?? 'bg-gray-400';

  return (
    <button
      onClick={() => onClick(audit)}
      className="w-full text-left group relative bg-white border border-gray-200 rounded-xl p-3 hover:border-blue-400 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
    >
      {/* Priority stripe on left edge */}
      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${priorityDot}`} />

      <div className="pl-3">
        {/* Title */}
        <p className={`font-semibold leading-tight text-gray-900 group-hover:text-blue-700 transition-colors ${compact ? 'text-xs line-clamp-2' : 'text-sm line-clamp-2'}`}>
          {audit.title}
        </p>

        {/* ISBAO badge — always prominent */}
        {audit.isbaoPart && (
          <div className="flex items-center gap-1 mt-1.5">
            <BookOpen className="w-3 h-3 text-blue-600 shrink-0" />
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 leading-none">
              {audit.isbaoPart}
            </span>
          </div>
        )}

        {/* Status + Auditor row */}
        <div className="flex items-center justify-between mt-2 gap-2">
          <Badge className={`${statusStyle} text-[9px] h-4 px-1.5 border shrink-0`} variant="outline">
            {audit.status}
          </Badge>

          {isUnassigned ? (
            <span className="flex items-center gap-1 text-[10px] text-red-600 font-semibold">
              <AlertCircle className="w-3 h-3" />
              Unassigned
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-gray-500 truncate">
              <UserCheck className="w-3 h-3 shrink-0 text-gray-400" />
              <span className="truncate">{audit.assignedTo}</span>
            </span>
          )}
        </div>

        {/* Progress bar (only if in progress or complete) */}
        {(audit.status === 'In Progress' || audit.status === 'Complete') && audit.completionRate > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${audit.completionRate}%` }}
              />
            </div>
            <span className="text-[9px] font-bold text-gray-500 shrink-0">{audit.completionRate}%</span>
          </div>
        )}
      </div>
    </button>
  );
}
