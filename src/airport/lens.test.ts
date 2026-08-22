import { describe, expect, it } from 'vitest';

import { defaultLensForRole } from './lens';

describe('defaultLensForRole (D96)', () => {
  it('opens maintenance roles on the maintenance lens', () => {
    expect(defaultLensForRole('maintenance')).toBe('maintenance');
    expect(defaultLensForRole('dom')).toBe('maintenance');
    expect(defaultLensForRole('maintenance-coordinator')).toBe('maintenance');
  });

  it('opens everyone else on the crew lens', () => {
    expect(defaultLensForRole('pilot')).toBe('pilot');
    expect(defaultLensForRole('chief-pilot')).toBe('pilot');
    expect(defaultLensForRole('scheduler')).toBe('pilot');
    expect(defaultLensForRole(undefined)).toBe('pilot');
  });

  it('opens an admin on the crew lens', () => {
    // An admin is doing neither job. Landing them on the station-support editor
    // would put it in front of the person least able to judge whether a station
    // is rated for our types.
    expect(defaultLensForRole('admin')).toBe('pilot');
  });

  it('reads the additional roles, not just the primary one', () => {
    // The demo carries a primary role plus extras; a DOM signed in as a pilot
    // still wants the maintenance view.
    expect(defaultLensForRole('pilot', ['dom'])).toBe('maintenance');
  });
});
