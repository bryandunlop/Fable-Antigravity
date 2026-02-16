import { ActionItem } from './types';

export const getBorderColor = (priority: string): string => {
  switch (priority.toLowerCase()) {
    case 'critical': return 'border-l-red-500';
    case 'high': return 'border-l-orange-500';
    case 'medium': return 'border-l-yellow-500';
    case 'low': return 'border-l-green-500';
    default: return 'border-l-gray-500';
  }
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

export const getUserActionItems = (actionItems: ActionItem[], userRole: string): ActionItem[] => {
  const roleMapping: Record<string, string[]> = {
    'pilot': ['ACTION003'],
    'maintenance': ['ACTION001'],
    'inflight': ['ACTION002'],
    'safety': ['ACTION003'],
    'lead': actionItems.map(item => item.id),
    'admin': actionItems.map(item => item.id)
  };

  const userItemIds = roleMapping[userRole] || [];
  return actionItems.filter(item => userItemIds.includes(item.id));
};

export const getStats = (actionItems: ActionItem[]) => {
  const total = actionItems.length;
  const active = actionItems.filter(item => item.status === 'In Progress').length;
  const completed = actionItems.filter(item => item.status === 'Completed').length;
  const totalContributors = new Set(actionItems.flatMap(item => item.contributors.map(c => c.id))).size;
  
  return { total, active, completed, totalContributors };
};

export const calculateProgress = (sections: Array<{ status: string }>): number => {
  const completedCount = sections.filter(section => section.status === 'completed').length;
  return Math.round((completedCount / sections.length) * 100);
};