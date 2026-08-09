// How a role's nav groups are ordered and whether their labels show (D80).
//
// Two changes from what came before, both aimed at the same defect: an
// eighteen-row wall where every row has the same visual weight.
//
// 1. GROUP LABELS ARE ALWAYS ON. They used to appear only above
//    DENSE_ROLE_ITEM_THRESHOLD = 30 visible items, which in practice meant
//    `admin` (52) and nobody else — pilot, inflight and maintenance all sit at
//    ~15-18 and got a flat unlabelled list. That threshold answered the wrong
//    question: labels are not scroll anchors for a 50-item list, they are how a
//    reader RANKS an 18-item one. "Airport Flags" should not carry the same
//    weight as "Tech Log".
//
// 2. THE USER'S OWN DOMAIN COMES FIRST. DOMAIN_ORDER is a fixed editorial
//    sequence (home, flight-ops, scheduling, …) that puts a technician's
//    Maintenance group fifth. With a permanent rail the full list is seen only
//    when opened, so what sits at the top matters more, not less.

import {
  DOMAIN_ORDER, DEFAULT_OPEN_DOMAINS, domainsForRole,
  type Domain, type DomainGroup,
} from './navConfig';

/**
 * The domains that belong to a role — the ones its own work lives in.
 *
 * Reuses DEFAULT_OPEN_DOMAINS rather than introducing a second role→domain map:
 * "which domains open by default" and "which domains are yours" are the same
 * judgement, and two maps would drift. Roles absent from it (the desktop-only
 * long tail) fall back to 'home', which is where their generic surfaces live.
 */
export function primaryDomainsForRole(
  userRole: string,
  additionalRoles: string[] = [],
): Domain[] {
  const own = DEFAULT_OPEN_DOMAINS[userRole];
  if (own?.length) return own;

  // A user whose PRIMARY role has no mapping may still hold one that does —
  // the dev pilot login carries chief-pilot and airport-evaluator, and a
  // maintenance user can hold dom. First additional role with a mapping wins.
  for (const r of additionalRoles) {
    const extra = DEFAULT_OPEN_DOMAINS[r];
    if (extra?.length) return extra;
  }
  return ['home'];
}

/**
 * The role's groups, own domains hoisted to the top, everything else keeping
 * DOMAIN_ORDER's editorial sequence behind them.
 *
 * Empty domains are already dropped by domainsForRole, so hoisting a domain the
 * role cannot see is a no-op rather than an empty header.
 */
export function orderedGroupsForRole(
  userRole: string,
  additionalRoles: string[] = [],
): DomainGroup[] {
  const groups = domainsForRole(userRole, additionalRoles);
  const mine = primaryDomainsForRole(userRole, additionalRoles);

  const rank = (d: Domain) => {
    const own = mine.indexOf(d);
    if (own !== -1) return own;                     // own domains, in their own order
    return mine.length + DOMAIN_ORDER.indexOf(d);   // then the editorial sequence
  };

  return [...groups].sort((a, b) => rank(a.domain) - rank(b.domain));
}

/**
 * Labels are always on now. Kept as a named function rather than deleting the
 * concept outright so the reason survives next to the call sites, and so a
 * future "hide labels for tiny roles" argument has somewhere to land.
 */
export function shouldShowGroupLabels(): boolean {
  return true;
}

/**
 * localStorage key for a role's hand-reordered groups.
 *
 * v2 deliberately abandons every order stored under the old `nav-order-<role>`
 * key. Those were not user choices: Navigation persisted the current order on
 * MOUNT, so simply opening the app once froze that day's group sequence forever
 * and it then outranked the manifest. Migrating them would carry the bug's
 * output forward as if it were intent.
 */
export const NAV_ORDER_KEY = (userRole: string) => `nav-order-v2-${userRole}`;
