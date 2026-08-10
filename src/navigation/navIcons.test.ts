import { describe, it, expect } from 'vitest';
import { NAV_ENTRIES, domainsForRole } from './navConfig';

// Every role named anywhere in the manifest. Derived, not hand-listed: a role
// added to one entry's `roles` array must not escape this audit.
const ALL_ROLES = [...new Set(NAV_ENTRIES.flatMap((e) => e.roles))].sort();

/**
 * D80 made the nav rail PERMANENT above 768, so on iPad portrait the icon is the
 * label for most of a user's session. Two destinations sharing one glyph in one
 * role's sidebar is therefore a wayfinding defect, not a cosmetic one — before
 * this guard existed, `airport-evaluator` saw four entries that were all MapPin
 * and `admin` saw MapPin six times.
 *
 * The rule is scoped per ROLE, not globally: nobody sees all 58 entries, and
 * same-path role variants (the maintenance/flight-ops Tech Log pair from LG-207)
 * are the same destination and should keep the same icon. `domainsForRole` already
 * dedupes those, so this asserts on exactly what a user can see.
 */
describe('nav icons are unique within every role a user can hold', () => {
  it.each(ALL_ROLES)('%s sees no two destinations sharing an icon', (role) => {
    const visible = domainsForRole(role).flatMap((d) => [...d.primary, ...d.more]);

    const pathsByIcon = new Map<string, Set<string>>();
    for (const entry of visible) {
      const icon = entry.icon?.displayName ?? entry.icon?.name ?? 'undefined';
      if (!pathsByIcon.has(icon)) pathsByIcon.set(icon, new Set());
      // Keyed by path: one destination may legitimately appear once per domain.
      pathsByIcon.get(icon)!.add(entry.path);
    }

    const collisions = [...pathsByIcon.entries()]
      .filter(([, paths]) => paths.size > 1)
      .map(([icon, paths]) => {
        const labels = [...paths].map(
          (p) => visible.find((e) => e.path === p)?.label ?? p,
        );
        return `${icon} → ${labels.join(' · ')}`;
      });

    expect(collisions, `${role} has icon collisions`).toEqual([]);
  });

  it('every sidebar entry actually carries an icon', () => {
    const iconless = NAV_ENTRIES.filter(
      (e) => e.sidebar !== false && !e.hidden && !e.icon,
    ).map((e) => e.label);
    expect(iconless).toEqual([]);
  });
});
