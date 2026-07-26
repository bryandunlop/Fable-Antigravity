import { describe, it, expect } from 'vitest';
import { titleForPath, APP_NAME } from './documentTitle';
import { entriesForRoles } from './navConfig';

describe('titleForPath', () => {
  it('names the page, so history and open tabs are distinguishable', () => {
    expect(titleForPath('/vacation-request')).toBe(`Vacation Request · ${APP_NAME}`);
    expect(titleForPath('/tech-log')).toBe(`Tech Log · ${APP_NAME}`);
  });

  it('uses the deepest matching entry for sub-paths', () => {
    expect(titleForPath('/tech-log/aircraft/N1PG')).toBe(`Tech Log · ${APP_NAME}`);
    expect(titleForPath('/inventory-v2/unit-request')).toBe(`New Unit Request · ${APP_NAME}`);
  });

  it('does not prefix the dashboard with a redundant page name', () => {
    expect(titleForPath('/')).toBe(APP_NAME);
  });

  it('falls back to the product name rather than inventing a title', () => {
    expect(titleForPath('/no-such-route')).toBe(APP_NAME);
  });

  it('honours role-variant labels', () => {
    expect(titleForPath('/upcoming-flights', entriesForRoles('inflight'))).toBe(`Upcoming Trips · ${APP_NAME}`);
    expect(titleForPath('/upcoming-flights', entriesForRoles('pilot'))).toBe(`Flight Calendar · ${APP_NAME}`);
  });

  it('never leaves the static build-time title in place for a known page', () => {
    expect(titleForPath('/safety')).not.toBe('Aviation Management System');
  });

  // Live-caught: a pilot reaching /work-orders from a Maintenance Hub card got the
  // bare product name, because that page is not in the pilot's own sidebar.
  it('names pages a role can reach but does not have in its sidebar', () => {
    const pilotEntries = entriesForRoles('pilot');
    expect(pilotEntries.some((e) => e.path === '/work-orders')).toBe(false);
    expect(titleForPath('/work-orders', pilotEntries)).toBe(`Work Orders (legacy) · ${APP_NAME}`);
  });
});
