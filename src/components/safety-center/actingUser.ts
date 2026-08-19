// Who the demo is acting as.
//
// There were two identity systems and they disagreed: SafetyCenter filed
// everything as a hardcoded `Capt. Dunlop`, while roles resolved through
// SYSTEM_USERS — where no such person exists. It stayed invisible for as long as
// nothing compared them. Then "Requested by you" started resolving the acting
// persona properly (D85 · C6) and a pilot could no longer see a request the
// pilot had filed.
//
// One source. Everything that stamps or matches a person's name goes through
// here, so the filer, the approver and the inbox all mean the same human.

import { SYSTEM_USERS } from '../../lib/mockUsers';
import { resolveUserId } from '../../notifications/identity';

export interface ActingUser { id: string; name: string }

export function actingUser(userRole: string): ActingUser {
  const id = resolveUserId(userRole);
  return { id, name: SYSTEM_USERS.find((u) => u.id === id)?.name ?? 'You' };
}
