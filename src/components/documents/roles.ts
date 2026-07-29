// Role-universe helpers for compliance rosters. Login is by role in this demo,
// so the reader universe is one representative reader per primary login role
// (same convention as the bulletins roster).
import { ROLE_CATEGORIES, SYSTEM_USERS } from '../../lib/mockUsers';
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

/**
 * D60 — the documents role set for a signed-in user identified only by their
 * user id.
 *
 * Why this exists: the tail page (tech-log) hosts the CAS reference tab, and
 * tech-log pages receive no login role — `TechLogProvider` takes the login role
 * privately and exposes only a `Personnel` record whose role vocabulary is
 * `PILOT | MAINTENANCE`, which says nothing about document authoring. What IS
 * reachable is the persona's user id, and the login screen derives the session's
 * role set from exactly the same table this reads: `LoginScreen` looks up
 * `SYSTEM_USERS.find(u => u.roles.includes(role))` and passes that user's
 * remaining roles as `additionalRoles`, while `TechLogContext.resolveFromLogin`
 * resolves the same user by the same rule. So `[userRole, ...additionalRoles]`
 * and this function's output are the same SET for any login the demo can produce.
 * If either derivation changes, this stops being equivalent — hence the note.
 *
 * Returns `[]` for an unknown id, so an unrecognized persona is never granted a
 * gate it would not otherwise have.
 */
export function documentsRolesForUserId(userId: string | undefined): string[] {
  if (!userId) return [];
  return SYSTEM_USERS.find((u) => u.id === userId)?.roles ?? [];
}
