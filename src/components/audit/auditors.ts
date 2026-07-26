// Shared auditor roster + role colours, used by every assignment surface
// (roster popover, unassigned tray, inline card chip, create dialog).
//
// NOTE (LG-29 follow-up): this roster is still hardcoded and separate from the
// login user catalog (mockUsers). Unifying the two is a prerequisite for the
// workload board (idea 4) and the honest fix for "assigned to you shows every
// persona's audits"; both are deferred. Kept here so there is at least a single
// source of truth for the assignment slice rather than one copy per component.
import type { Auditor } from './assignSuggestion';

export const AUDITORS: Auditor[] = [
  { name: 'Sarah Wilson', role: 'Safety' },
  { name: 'Mike Johnson', role: 'Pilot' },
  { name: 'Emily Davis', role: 'Document Manager' },
  { name: 'David Brown', role: 'Maintenance' },
  { name: 'Lisa Chen', role: 'Safety' },
  { name: 'Tom Anderson', role: 'Pilot' },
  { name: 'Jennifer Lee', role: 'Inflight' },
  { name: 'Robert Martinez', role: 'Maintenance' },
  { name: 'Amanda Foster', role: 'Safety' },
  { name: 'Chris Taylor', role: 'Admin' },
];

export const ROLE_COLORS: Record<string, string> = {
  Safety: 'bg-blue-100 text-blue-700',
  Pilot: 'bg-indigo-100 text-indigo-700',
  Maintenance: 'bg-orange-100 text-orange-700',
  Inflight: 'bg-purple-100 text-purple-700',
  'Document Manager': 'bg-teal-100 text-teal-700',
  Admin: 'bg-gray-100 text-gray-700',
};

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('');
}
