// Role-universe helpers for compliance rosters. Login is by role in this demo,
// so the reader universe is one representative reader per primary login role
// (same convention as the bulletins roster).
import { ROLE_CATEGORIES } from '../../lib/mockUsers';
import { resolveUserId } from '../../notifications/identity';
import type { Reader } from './engine/acknowledgments';

export function documentsRoleUniverse(): Reader[] {
  return Object.values(ROLE_CATEGORIES)
    .flat()
    .map((r) => ({ role: r.value, userId: resolveUserId(r.value) }));
}

/** Mirror of the bulletins-surface manage gate. */
export const DOC_MANAGER_ROLES = ['admin', 'safety', 'lead', 'document-manager', 'procedural-specialist'];

export function rolesCanManageDocuments(roles: string[]): boolean {
  return roles.some((r) => DOC_MANAGER_ROLES.includes(r));
}

export function canManageDocuments(userRole: string, additionalRoles: string[] = []): boolean {
  return rolesCanManageDocuments([userRole, ...additionalRoles]);
}
