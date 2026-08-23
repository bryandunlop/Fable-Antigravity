import { ActionItem } from './types';
import { getCurrentPerson, isSamePerson, seesEveryProject } from '../../lib/currentUser';

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

/**
 * The projects a person should see: the ones they are on, plus everything if
 * they hold a portfolio role.
 *
 * This used to be a hardcoded map of role to seeded IDs (`'pilot': ['ACTION003']`),
 * which meant a project created today reached nobody but a lead — the "one list,
 * two views" promise was true for leads and false for everyone else. Membership
 * is the rule now, so a project reaches whoever is actually on it.
 */
export const getUserActionItems = (actionItems: ActionItem[], userRole: string): ActionItem[] => {
  if (seesEveryProject(userRole)) return actionItems;

  const person = getCurrentPerson(userRole);
  if (!person) return [];

  return actionItems.filter(item =>
    item.contributors.some(contributor => isSamePerson(contributor.name, person.name)),
  );
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