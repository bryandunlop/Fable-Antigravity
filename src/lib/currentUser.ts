import { SYSTEM_USERS } from './mockUsers';

/**
 * Who is signed in, as a PERSON rather than a role.
 *
 * The app threads `userRole` everywhere and nothing else, but a role cannot
 * answer "is this my project" — three people share the maintenance role. Login
 * already resolves a persona (`SYSTEM_USERS.find(u => u.roles.includes(role))`)
 * and then throws it away; this recovers it deterministically from the same
 * rule, so no prop plumbing has to change.
 *
 * Replace this with the real identity claim when Entra lands. Everything that
 * needs to know who you are should come through here, so there is one place to
 * change rather than a dozen.
 */

export interface CurrentPerson {
  id: string;
  name: string;
  roles: string[];
  department?: string;
}

/**
 * Ranks and honorifics are part of how people are addressed, not part of who
 * they are — the roster says "John Smith" where the directory says "Captain
 * John Smith", and they are the same person.
 */
const TITLE_PREFIXES = ['Captain', 'Capt.', 'Capt', 'First Officer', 'FO', 'Dr.', 'Dr'];

export const normalizePersonName = (name: string): string => {
  let cleaned = name.trim();
  for (const title of TITLE_PREFIXES) {
    if (cleaned.toLowerCase().startsWith(`${title.toLowerCase()} `)) {
      cleaned = cleaned.slice(title.length + 1);
      break;
    }
  }
  return cleaned.toLowerCase().replace(/\s+/g, ' ');
};

export const isSamePerson = (a: string, b: string): boolean =>
  normalizePersonName(a) === normalizePersonName(b);

/** The persona behind a role, matching how LoginScreen resolves it. */
export const getCurrentPerson = (userRole: string): CurrentPerson | null => {
  const user = SYSTEM_USERS.find(u => u.roles.includes(userRole));
  if (!user) return null;
  return { id: user.id, name: user.name, roles: user.roles, department: user.department };
};

/**
 * Roles that see every project rather than only their own. A VP's admin has to
 * chase work that is, by definition, not theirs.
 */
const PORTFOLIO_ROLES = ['lead', 'admin', 'vp', 'admin-assistant'];

export const seesEveryProject = (userRole: string): boolean => PORTFOLIO_ROLES.includes(userRole);

/**
 * The roles held by a set of named people, for addressing a notification.
 *
 * The notification feed is role-addressed, not person-addressed, so reaching a
 * specific person means reaching the roles they hold. That is wider than
 * intended — a nudge to one mechanic reaches the maintenance role — and is the
 * honest limit of the current feed rather than something to paper over.
 */
export const getRolesForPeople = (names: string[]): string[] => {
  const roles = new Set<string>();
  names.forEach(name => {
    const user = SYSTEM_USERS.find(u => isSamePerson(u.name, name));
    user?.roles.forEach(role => roles.add(role));
  });
  return [...roles];
};
