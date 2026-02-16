import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface HelpTooltipProps {
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export default function HelpTooltip({ content, side = 'top', className = '' }: HelpTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ${className}`}
          >
            <HelpCircle className="w-4 h-4" />
            <span className="sr-only">Help</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <div className="text-sm">{content}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Common help text for maintenance system
export const maintenanceHelpText = {
  squawk: 'A squawk is a reported maintenance issue or discrepancy on an aircraft. Squawks are logged in the Tech Log and tracked through resolution.',
  workOrder: 'A work order is a formal instruction to perform maintenance work. Work orders are created from squawks and assigned to technicians.',
  mel: 'MEL (Minimum Equipment List) allows aircraft to operate with certain items inoperative under specific conditions.',
  cdl: 'CDL (Configuration Deviation List) allows aircraft to operate with certain parts or components missing under specific conditions.',
  mttr: 'MTTR (Mean Time To Repair) measures the average time to complete maintenance work. Lower is better.',
  ataChapter: 'ATA chapters are a standardized system for organizing aircraft documentation and maintenance by system (e.g., ATA 29 = Hydraulic Power).',
  lifecycle: 'Lifecycle stages track a squawk or work order from initial report through completion: Reported → WO Created → Assigned → In Progress → Inspection → Completed.',
  priority: {
    critical: 'Critical priority requires immediate action and may ground the aircraft (AOG).',
    high: 'High priority should be addressed as soon as possible, typically within 24 hours.',
    medium: 'Medium priority should be scheduled for resolution within a few days.',
    low: 'Low priority can be deferred to convenient maintenance windows.',
  },
};
