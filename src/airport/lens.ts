/**
 * The airport lens (D96) — which job you came to this airport page to do.
 *
 * Bryan, 2026-08-22: *"maintenance and pilots need to have different views of
 * the information."*
 *
 * A lens changes WHICH FACTS ARE PROMOTED and how the directory sorts. It never
 * filters the roster, hides a field, or gates anything: a pilot can open the
 * maintenance view and a technician can open the crew view, one tap either way.
 * That containment is deliberate — a lens that hid facts would be a permission
 * system wearing a view's clothes, and the airport page has no business holding
 * one.
 */

export type AirportLens = 'pilot' | 'maintenance';

/**
 * Roles that open on the maintenance lens.
 *
 * `admin` is deliberately NOT here. An admin is not doing either job, and
 * defaulting them to the maintenance view would put the station-support editor
 * in front of the person least likely to know whether a station is rated.
 */
const MAINTENANCE_ROLES: ReadonlySet<string> = new Set([
  'maintenance',
  'maintenance-coordinator',
  'dom',
  'mechanic',
]);

export function defaultLensForRole(
  userRole: string | undefined,
  additionalRoles: readonly string[] = [],
): AirportLens {
  return [userRole, ...additionalRoles].some((role) => role && MAINTENANCE_ROLES.has(role))
    ? 'maintenance'
    : 'pilot';
}

export const LENS_LABEL: Record<AirportLens, string> = {
  pilot: 'Flying in',
  maintenance: 'Fixing something',
};
