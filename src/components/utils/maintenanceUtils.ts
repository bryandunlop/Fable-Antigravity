// Maintenance utility functions for consistent UI behavior across the system

/**
 * Priority Color System - Consistent across all maintenance components
 */
export const priorityConfig = {
  critical: {
    color: '#DC2626', // red-600
    bgClass: 'bg-red-500',
    textClass: 'text-red-600',
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
    borderClass: 'border-red-500',
    icon: '🔴',
    label: 'Critical',
    pulseClass: 'animate-pulse',
  },
  high: {
    color: '#EA580C', // orange-600
    bgClass: 'bg-orange-500',
    textClass: 'text-orange-600',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
    borderClass: 'border-orange-500',
    icon: '🟠',
    label: 'High',
    pulseClass: '',
  },
  medium: {
    color: '#CA8A04', // yellow-600
    bgClass: 'bg-yellow-500',
    textClass: 'text-yellow-600',
    badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    borderClass: 'border-yellow-500',
    icon: '🟡',
    label: 'Medium',
    pulseClass: '',
  },
  low: {
    color: '#16A34A', // green-600
    bgClass: 'bg-green-500',
    textClass: 'text-green-600',
    badgeClass: 'bg-green-100 text-green-800 border-green-200',
    borderClass: 'border-green-500',
    icon: '🟢',
    label: 'Low',
    pulseClass: '',
  },
};

export type Priority = keyof typeof priorityConfig;

/**
 * Status Color System
 */
export const statusConfig = {
  open: {
    color: '#3B82F6', // blue-500
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-600',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    label: 'Open',
  },
  'in-progress': {
    color: '#8B5CF6', // violet-500
    bgClass: 'bg-violet-500',
    textClass: 'text-violet-600',
    badgeClass: 'bg-violet-100 text-violet-800 border-violet-200',
    label: 'In Progress',
    liveIndicator: true,
  },
  deferred: {
    color: '#F59E0B', // amber-500
    bgClass: 'bg-amber-500',
    textClass: 'text-amber-600',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    label: 'Deferred',
  },
  closed: {
    color: '#10B981', // green-500
    bgClass: 'bg-green-500',
    textClass: 'text-green-600',
    badgeClass: 'bg-green-100 text-green-800 border-green-200',
    label: 'Closed',
  },
  duplicate: {
    color: '#6B7280', // gray-500
    bgClass: 'bg-gray-500',
    textClass: 'text-gray-600',
    badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
    label: 'Duplicate',
  },
  pending: {
    color: '#6B7280', // gray-500
    bgClass: 'bg-gray-500',
    textClass: 'text-gray-600',
    badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
    label: 'Pending',
  },
  assigned: {
    color: '#3B82F6', // blue-500
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-600',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    label: 'Assigned',
  },
  'on-hold': {
    color: '#EF4444', // red-500
    bgClass: 'bg-red-500',
    textClass: 'text-red-600',
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
    label: 'On Hold',
  },
  completed: {
    color: '#10B981', // green-500
    bgClass: 'bg-green-500',
    textClass: 'text-green-600',
    badgeClass: 'bg-green-100 text-green-800 border-green-200',
    label: 'Completed',
  },
  cancelled: {
    color: '#6B7280', // gray-500
    bgClass: 'bg-gray-500',
    textClass: 'text-gray-600',
    badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
    label: 'Cancelled',
  },
};

export type Status = keyof typeof statusConfig;

/**
 * Lifecycle Stage Configuration
 */
export const lifecycleStages = [
  { key: 'reported', label: 'Reported', icon: '📝' },
  { key: 'wo-created', label: 'WO Created', icon: '📋' },
  { key: 'assigned', label: 'Assigned', icon: '👤' },
  { key: 'in-progress', label: 'In Progress', icon: '🔧' },
  { key: 'inspection-required', label: 'Inspection', icon: '🔍' },
  { key: 'inspection-completed', label: 'Inspected', icon: '✅' },
  { key: 'completed', label: 'Completed', icon: '✔️' },
  { key: 'deferred', label: 'Deferred', icon: '⏸️' },
];

/**
 * Get priority configuration by key
 */
export function getPriorityConfig(priority: Priority) {
  return priorityConfig[priority] || priorityConfig.low;
}

/**
 * Get status configuration by key
 */
export function getStatusConfig(status: Status) {
  return statusConfig[status] || statusConfig.open;
}

/**
 * Get lifecycle stage index
 */
export function getLifecycleStageIndex(stage: string): number {
  const index = lifecycleStages.findIndex(s => s.key === stage);
  return index === -1 ? 0 : index;
}

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

/**
 * Calculate time in stage (duration)
 */
export function calculateTimeInStage(startDate: Date | string): string {
  const now = new Date();
  const start = new Date(startDate);
  const diff = now.getTime() - start.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  return `${hours}h`;
}

/**
 * Get work order type badge configuration
 */
export const workOrderTypeConfig = {
  scheduled: {
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    label: 'Scheduled',
  },
  unscheduled: {
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    label: 'Unscheduled',
  },
  aog: {
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
    label: 'AOG',
  },
};

/**
 * Get category badge configuration
 */
export const categoryConfig = {
  minor: {
    badgeClass: 'bg-green-100 text-green-800 border-green-200',
    label: 'Minor',
  },
  major: {
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
    label: 'Major',
  },
  ancillary: {
    badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
    label: 'Ancillary',
  },
};

/**
 * Get ATA chapter color (for visual grouping)
 */
export function getATAColor(ataChapter: string): string {
  const ataNum = parseInt(ataChapter);
  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  ];
  return colors[ataNum % colors.length] || colors[0];
}

/**
 * Format hours for display
 */
export function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = Math.floor(hours % 24);
  return `${days}d ${remainingHours}h`;
}

/**
 * Get deferral alert status
 */
export function getDeferralAlertStatus(daysRemaining: number): {
  status: 'ok' | 'warning' | 'critical' | 'expired';
  color: string;
  badgeClass: string;
  label: string;
} {
  if (daysRemaining < 0) {
    return {
      status: 'expired',
      color: '#DC2626',
      badgeClass: 'bg-red-100 text-red-800 border-red-200',
      label: 'EXPIRED',
    };
  }
  if (daysRemaining <= 2) {
    return {
      status: 'critical',
      color: '#DC2626',
      badgeClass: 'bg-red-100 text-red-800 border-red-200',
      label: `${daysRemaining}d left`,
    };
  }
  if (daysRemaining <= 5) {
    return {
      status: 'warning',
      color: '#F59E0B',
      badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      label: `${daysRemaining}d left`,
    };
  }
  return {
    status: 'ok',
    color: '#10B981',
    badgeClass: 'bg-green-100 text-green-800 border-green-200',
    label: `${daysRemaining}d left`,
  };
}
