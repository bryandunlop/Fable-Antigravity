import { SYSTEM_USERS } from '../lib/mockUsers';

/** The demo has no login identity beyond a role string; SYSTEM_USERS maps
 * roles to a stable user id for read/dismissal bookkeeping. */
export function resolveUserId(userRole: string): string {
  const sys = SYSTEM_USERS.find(u => u.roles?.includes(userRole));
  return sys?.id ?? `role:${userRole}`;
}
